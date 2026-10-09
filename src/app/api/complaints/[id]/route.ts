import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Complaint, ComplaintComment, Student, Staff, User } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";
import { NotificationService } from "@/services/notification-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;

    await connectToDatabase();

    const complaint = await Complaint.findById(id).lean();
    if (!complaint) {
      throw new NotFoundError("Complaint ticket not found");
    }

    if (session.role === "STUDENT") {
      const student = await Student.findOne({ userId: session.id }).lean();
      if (complaint.studentId !== student?._id) {
        throw new ForbiddenError("You do not have access to view this complaint");
      }
    }

    const [student, staff, comments] = await Promise.all([
      Student.findById(complaint.studentId, { _id: 1, name: 1, studentId: 1, course: 1, phone: 1, userId: 1 }).lean(),
      complaint.assignedStaffId
        ? Staff.findById(complaint.assignedStaffId, { _id: 1, name: 1, employeeId: 1, designation: 1 }).lean()
        : null,
      ComplaintComment.find({
        complaintId: complaint._id,
        ...(session.role === "STUDENT" ? { isInternal: false } : {}),
      })
        .sort({ createdAt: 1 })
        .lean(),
    ]);

    return successResponse({
      ...complaint,
      id: complaint._id,
      student: student ? { ...student, id: student._id } : null,
      assignedStaff: staff ? { ...staff, id: staff._id } : null,
      comments: comments.map((c) => ({ ...c, id: c._id })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();

    await connectToDatabase();

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      throw new NotFoundError("Complaint ticket not found");
    }

    const student = await Student.findById(complaint.studentId);
    if (!student) {
      throw new NotFoundError("Student record for complaint not found");
    }

    const { status, assignedStaffId, priority, comment, isInternal } = body;
    const previousStatus = complaint.status;

    if (session.role === "STUDENT") {
      if (student.userId !== session.id) {
        throw new ForbiddenError("You cannot modify another student's complaint");
      }
      if (status && status !== "CLOSED" && status !== "IN_PROGRESS") {
        throw new ForbiddenError("Students can only mark resolved complaints as Closed or Reopen to In Progress");
      }
      if (status) {
        complaint.status = status;
        if (status === "CLOSED") complaint.closedAt = new Date();
      }
    } else {
      if (status) {
        complaint.status = status;
        if (status === "RESOLVED") complaint.resolvedAt = new Date();
        if (status === "CLOSED") complaint.closedAt = new Date();
      }
      if (priority) {
        complaint.priority = priority;
      }
      if (assignedStaffId) {
        complaint.assignedStaffId = assignedStaffId;
        if (complaint.status === "SUBMITTED" && !status) {
          complaint.status = "ASSIGNED";
        }
      }
    }

    await complaint.save();

    if (comment && comment.trim()) {
      await ComplaintComment.create({
        complaintId: complaint._id,
        authorId: session.id,
        authorRole: session.role,
        authorName: session.name,
        comment: comment.trim(),
        isInternal: session.role !== "STUDENT" && isInternal === true,
      });
    }

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: status ? `COMPLAINT_STATUS_${status}` : "COMPLAINT_UPDATED",
      targetType: "Complaint",
      targetId: complaint._id,
      details: {
        before: { status: previousStatus, priority: complaint.priority, staff: complaint.assignedStaffId },
        after: { status: complaint.status, priority: complaint.priority, staff: complaint.assignedStaffId },
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    if (status && status !== previousStatus) {
      await NotificationService.send({
        userId: student.userId,
        title: `Ticket ${complaint.complaintCode} Updated`,
        message: `Your maintenance ticket status changed from ${previousStatus} to ${status}.`,
        type: status === "RESOLVED" ? "SUCCESS" : "INFO",
        linkUrl: `/student/complaints`,
      });
    }

    const staffRecord = complaint.assignedStaffId
      ? await Staff.findById(complaint.assignedStaffId).lean()
      : null;

    return successResponse({
      ...complaint.toJSON(),
      student: student.toJSON(),
      assignedStaff: staffRecord ? { ...staffRecord, id: staffRecord._id } : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
