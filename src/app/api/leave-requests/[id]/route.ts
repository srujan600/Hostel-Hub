import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { LeaveRequest, Student } from "@/models";
import { requireAuth } from "@/lib/auth";
import { adjudicateLeaveSchema } from "@/lib/validations/leave";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
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

    const leave = await LeaveRequest.findById(id).lean();
    if (!leave) {
      throw new NotFoundError("Leave request not found");
    }

    if (session.role === "STUDENT") {
      const student = await Student.findOne({ userId: session.id }).lean();
      if (leave.studentId !== student?._id) {
        throw new ForbiddenError("You cannot view another student's leave request");
      }
    }

    const studentRecord = await Student.findById(leave.studentId, {
      _id: 1,
      name: 1,
      studentId: 1,
      course: 1,
      phone: 1,
      userId: 1,
    }).lean();

    return successResponse({
      ...leave,
      id: leave._id,
      student: studentRecord ? { ...studentRecord, id: studentRecord._id } : null,
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

    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Only Wardens and Administrators can adjudicate leave requests");
    }

    const body = await req.json();
    const parseResult = adjudicateLeaveSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid adjudication data", parseResult.error.flatten());
    }

    const { status, reviewRemarks } = parseResult.data;

    await connectToDatabase();

    const leave = await LeaveRequest.findById(id);
    if (!leave) {
      throw new NotFoundError("Leave request not found");
    }

    const student = await Student.findById(leave.studentId);
    if (!student) {
      throw new NotFoundError("Student record for leave not found");
    }

    if (leave.status === status) {
      return successResponse({
        ...leave.toJSON(),
        student: student.toJSON(),
      });
    }

    if (leave.status === "COMPLETED") {
      throw new BadRequestError("Cannot adjudicate an already completed leave record");
    }

    const previousStatus = leave.status;
    leave.status = status;
    leave.reviewedById = session.id;
    leave.reviewedAt = new Date();
    leave.reviewRemarks = reviewRemarks || leave.reviewRemarks;

    await leave.save();

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: `LEAVE_${status}`,
      targetType: "LeaveRequest",
      targetId: leave._id,
      details: {
        requestCode: leave.requestCode,
        previousStatus,
        newStatus: status,
        remarks: reviewRemarks,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    await NotificationService.send({
      userId: student.userId,
      title: status === "APPROVED" ? "Leave Request Approved" : "Leave Request Declined",
      message:
        status === "APPROVED"
          ? `Your out-pass ${leave.requestCode} for ${leave.destination} was approved by ${session.name}.`
          : `Your leave request ${leave.requestCode} was declined. Remark: ${reviewRemarks || "None provided"}.`,
      type: status === "APPROVED" ? "SUCCESS" : "WARNING",
      linkUrl: `/student/leave`,
    });

    return successResponse({
      ...leave.toJSON(),
      student: student.toJSON(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
