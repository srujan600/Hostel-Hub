import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
            course: true,
            phone: true,
            userId: true,
          },
        },
      },
    });

    if (!leave) {
      throw new NotFoundError("Leave request not found");
    }

    if (session.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
      });
      if (leave.studentId !== student?.id) {
        throw new ForbiddenError("You cannot view another student's leave request");
      }
    }

    return successResponse(leave);
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

    // Authorization: Only Wardens and Admins can adjudicate leave requests
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Only Wardens and Administrators can adjudicate leave requests");
    }

    const body = await req.json();
    const parseResult = adjudicateLeaveSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid adjudication data", parseResult.error.flatten());
    }

    const { status, reviewRemarks } = parseResult.data;

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!leave) {
      throw new NotFoundError("Leave request not found");
    }

    // Critical Requirement: Idempotent Approval / Rejection
    // If the request is already in the target state, return immediately without duplicate side-effects
    if (leave.status === status) {
      return successResponse(leave);
    }

    // Once a leave is completed or already departed, prevent status reversal without explicit admin override
    if (leave.status === "COMPLETED") {
      throw new BadRequestError("Cannot adjudicate an already completed leave record");
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: {
        status,
        reviewedById: session.id,
        reviewedAt: new Date(),
        reviewRemarks: reviewRemarks || leave.reviewRemarks,
      },
      include: {
        student: true,
      },
    });

    // Audit Event
    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: `LEAVE_${status}`,
      targetType: "LeaveRequest",
      targetId: leave.id,
      details: {
        requestCode: leave.requestCode,
        previousStatus: leave.status,
        newStatus: status,
        remarks: reviewRemarks,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    // Notify Student
    await NotificationService.send({
      userId: leave.student.userId,
      title: status === "APPROVED" ? "Leave Request Approved" : "Leave Request Declined",
      message:
        status === "APPROVED"
          ? `Your out-pass ${leave.requestCode} for ${leave.destination} was approved by ${session.name}.`
          : `Your leave request ${leave.requestCode} was declined. Remark: ${reviewRemarks || "None provided"}.`,
      type: status === "APPROVED" ? "SUCCESS" : "WARNING",
      linkUrl: `/student/leave`,
    });

    return successResponse(updatedLeave);
  } catch (error) {
    return errorResponse(error);
  }
}
