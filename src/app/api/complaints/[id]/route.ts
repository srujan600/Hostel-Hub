import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
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

    const complaint = await prisma.complaint.findUnique({
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
        assignedStaff: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            designation: true,
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundError("Complaint ticket not found");
    }

    // Role isolation check: student can only view their own ticket
    if (session.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
      });
      if (complaint.studentId !== student?.id) {
        throw new ForbiddenError("You do not have access to view this complaint");
      }
      // Security hardening: filter out internal staff notes from student view
      complaint.comments = complaint.comments.filter((c: any) => !c.isInternal);
    }

    return successResponse(complaint);
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

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        assignedStaff: true,
      },
    });

    if (!complaint) {
      throw new NotFoundError("Complaint ticket not found");
    }

    const { status, assignedStaffId, priority, comment, isInternal } = body;
    const updateData: any = {};

    // 1. Role-based privilege checks
    if (session.role === "STUDENT") {
      // Students can only close an already resolved ticket or reopen it
      if (complaint.student.userId !== session.id) {
        throw new ForbiddenError("You cannot modify another student's complaint");
      }
      if (status && status !== "CLOSED" && status !== "IN_PROGRESS") {
        throw new ForbiddenError("Students can only mark resolved complaints as Closed or Reopen to In Progress");
      }
      if (status) {
        updateData.status = status;
        if (status === "CLOSED") updateData.closedAt = new Date();
      }
    } else {
      // Warden / Administrator updates
      if (status) {
        updateData.status = status;
        if (status === "RESOLVED") updateData.resolvedAt = new Date();
        if (status === "CLOSED") updateData.closedAt = new Date();
      }
      if (priority) {
        updateData.priority = priority;
      }
      if (assignedStaffId) {
        updateData.assignedStaffId = assignedStaffId;
        // Auto-advance SUBMITTED to ASSIGNED
        if (complaint.status === "SUBMITTED" && !status) {
          updateData.status = "ASSIGNED";
        }
      }
    }

    // 2. Perform database update
    const updatedComplaint = await prisma.complaint.update({
      where: { id: complaint.id },
      data: updateData,
      include: {
        assignedStaff: true,
        student: true,
      },
    });

    // 3. Optional comment logging
    if (comment && comment.trim()) {
      await prisma.complaintComment.create({
        data: {
          complaintId: complaint.id,
          authorId: session.id,
          authorRole: session.role,
          authorName: session.name,
          comment: comment.trim(),
          isInternal: session.role !== "STUDENT" && isInternal === true,
        },
      });
    }

    // 4. Audit Log
    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: status ? `COMPLAINT_STATUS_${status}` : "COMPLAINT_UPDATED",
      targetType: "Complaint",
      targetId: complaint.id,
      details: {
        before: { status: complaint.status, priority: complaint.priority, staff: complaint.assignedStaffId },
        after: { status: updatedComplaint.status, priority: updatedComplaint.priority, staff: updatedComplaint.assignedStaffId },
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    // 5. Notify Student if status changed
    if (status && status !== complaint.status) {
      await NotificationService.send({
        userId: complaint.student.userId,
        title: `Ticket ${complaint.complaintCode} Updated`,
        message: `Your maintenance ticket status changed from ${complaint.status} to ${status}.`,
        type: status === "RESOLVED" ? "SUCCESS" : "INFO",
        linkUrl: `/student/complaints`,
      });
    }

    return successResponse(updatedComplaint);
  } catch (error) {
    return errorResponse(error);
  }
}
