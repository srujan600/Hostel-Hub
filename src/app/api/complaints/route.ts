import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Complaint, ComplaintComment, Student, Staff } from "@/models";
import { requireAuth } from "@/lib/auth";
import { createComplaintSchema } from "@/lib/validations/complaint";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";
import { NotificationService } from "@/services/notification-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const query: any = {};

    // Strict student data isolation: students only see their own complaints
    if (session.role === "STUDENT") {
      const student = await Student.findOne({ userId: session.id }).lean();
      if (!student) throw new NotFoundError("Student record not found");
      query.studentId = student._id;
    }

    if (status && status !== "ALL") {
      query.status = status;
    }
    if (category && category !== "ALL") {
      query.category = category;
    }

    const complaints = await Complaint.find(query).sort({ createdAt: -1 }).lean();

    const studentIds = [...new Set(complaints.map((c) => c.studentId))];
    const staffIds: string[] = [
      ...new Set(complaints.map((c) => c.assignedStaffId).filter((id): id is string => Boolean(id))),
    ];
    const complaintIds = complaints.map((c) => c._id);

    const commentQuery: any = { complaintId: { $in: complaintIds } };
    if (session.role === "STUDENT") {
      commentQuery.isInternal = false;
    }

    const [students, staffs, comments] = await Promise.all([
      Student.find({ _id: { $in: studentIds } }).select("_id name studentId phone").lean(),
      Staff.find({ _id: { $in: staffIds } }).select("_id name employeeId").lean(),
      ComplaintComment.find(commentQuery).sort({ createdAt: 1 }).lean(),
    ]);

    const studentMap = new Map(
      students.map((s) => [s._id, { id: s._id, name: s.name, studentId: s.studentId, phone: s.phone }])
    );
    const staffMap = new Map(
      staffs.map((st) => [st._id, { id: st._id, name: st.name, employeeId: st.employeeId }])
    );

    const commentsByComplaint = new Map<string, any[]>();
    comments.forEach((cm) => {
      const list = commentsByComplaint.get(cm.complaintId) || [];
      list.push({ ...cm, id: cm._id });
      commentsByComplaint.set(cm.complaintId, list);
    });

    const formatted = complaints.map((c) => ({
      ...c,
      id: c._id,
      student: studentMap.get(c.studentId) || null,
      assignedStaff: c.assignedStaffId ? staffMap.get(c.assignedStaffId) || null : null,
      comments: commentsByComplaint.get(c._id) || [],
    }));

    return successResponse(formatted);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();

    const parseResult = createComplaintSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid complaint data", parseResult.error.flatten());
    }

    const { category, title, description, location, priority, attachmentUrl } = parseResult.data;

    await connectToDatabase();

    let studentId = "";
    if (session.role === "STUDENT") {
      const student = await Student.findOne({ userId: session.id }).lean();
      if (!student) throw new NotFoundError("Student record not found");
      studentId = student._id;
    } else {
      studentId = body.studentId;
      if (!studentId) {
        throw new BadRequestError("Student ID is required when logging on behalf of a resident");
      }
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const existingDuplicate = await Complaint.findOne({
      studentId,
      category,
      location,
      createdAt: { $gte: twoHoursAgo },
      status: { $in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
    });

    if (existingDuplicate) {
      throw new BadRequestError(
        `A similar complaint (${existingDuplicate.complaintCode}) was already submitted for ${location} recently. Our team is actively reviewing it.`
      );
    }

    const count = await Complaint.countDocuments();
    const complaintCode = `CMP-2026-${String(count + 1).padStart(4, "0")}`;

    const complaint = await Complaint.create({
      complaintCode,
      studentId,
      category,
      title,
      description,
      location,
      priority,
      status: "SUBMITTED",
      attachmentUrl: attachmentUrl || null,
    });

    const studentRecord = await Student.findById(studentId).lean();

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "COMPLAINT_SUBMITTED",
      targetType: "Complaint",
      targetId: complaint._id,
      details: { code: complaintCode, title, category, priority, location },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    await NotificationService.send({
      userId: session.id,
      title: "Complaint Lodged Successfully",
      message: `Your ticket ${complaintCode} (${title}) has been received and queued for inspection.`,
      type: "SUCCESS",
      linkUrl: `/student/complaints`,
    });

    return successResponse(
      {
        ...complaint.toJSON(),
        student: studentRecord ? { ...studentRecord, id: studentRecord._id } : null,
      },
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
