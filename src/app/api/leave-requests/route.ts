import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { LeaveRequest, Student } from "@/models";
import { requireAuth } from "@/lib/auth";
import { createLeaveRequestSchema } from "@/lib/validations/leave";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";
import { NotificationService } from "@/services/notification-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query: any = {};

    // Strict student data isolation
    if (session.role === "STUDENT") {
      const student = await Student.findOne({ userId: session.id }).lean();
      if (!student) throw new NotFoundError("Student record not found");
      query.studentId = student._id;
    }

    if (status && status !== "ALL") {
      query.status = status;
    }

    const leaves = await LeaveRequest.find(query).sort({ createdAt: -1 }).lean();
    const studentIds = [...new Set(leaves.map((l) => l.studentId))];
    const students = await Student.find(
      { _id: { $in: studentIds } },
      { _id: 1, name: 1, studentId: 1, course: 1, phone: 1 }
    ).lean();

    const studentMap = new Map(
      students.map((s) => [s._id, { id: s._id, name: s.name, studentId: s.studentId, course: s.course, phone: s.phone }])
    );

    const formatted = leaves.map((l) => ({
      ...l,
      id: l._id,
      student: studentMap.get(l.studentId) || null,
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

    const parseResult = createLeaveRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid leave request data", parseResult.error.flatten());
    }

    const { leaveType, startDate, endDate, reason, destination, emergencyContact } = parseResult.data;

    await connectToDatabase();

    let studentId = "";
    if (session.role === "STUDENT") {
      const student = await Student.findOne({ userId: session.id }).lean();
      if (!student) throw new NotFoundError("Student record not found");
      studentId = student._id;
    } else {
      studentId = body.studentId;
      if (!studentId) throw new BadRequestError("Student ID is required");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (start < fifteenMinutesAgo) {
      throw new BadRequestError("Departure date cannot be in the past");
    }

    const conflictingRequest = await LeaveRequest.findOne({
      studentId,
      status: { $in: ["SUBMITTED", "APPROVED"] },
      $or: [
        { startDate: { $lte: start }, endDate: { $gte: start } },
        { startDate: { $lte: end }, endDate: { $gte: end } },
        { startDate: { $gte: start }, endDate: { $lte: end } },
      ],
    });

    if (conflictingRequest) {
      throw new ConflictError(
        `Conflicting active leave request (${conflictingRequest.requestCode}) already exists for this timeframe.`
      );
    }

    const count = await LeaveRequest.countDocuments();
    const requestCode = `LEV-2026-${String(count + 1).padStart(4, "0")}`;

    const leave = await LeaveRequest.create({
      requestCode,
      studentId,
      leaveType,
      startDate: start,
      endDate: end,
      reason,
      destination,
      emergencyContact,
      status: "SUBMITTED",
    });

    const studentRecord = await Student.findById(studentId).lean();

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "LEAVE_REQUEST_SUBMITTED",
      targetType: "LeaveRequest",
      targetId: leave._id,
      details: { code: requestCode, leaveType, start, end, destination },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    await NotificationService.send({
      userId: session.id,
      title: "Out-Pass Request Lodged",
      message: `Your request ${requestCode} for ${destination} is pending Warden review.`,
      type: "INFO",
      linkUrl: `/student/leave`,
    });

    return successResponse(
      {
        ...leave.toJSON(),
        student: studentRecord ? { ...studentRecord, id: studentRecord._id } : null,
      },
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
