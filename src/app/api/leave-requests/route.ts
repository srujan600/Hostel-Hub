import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createLeaveRequestSchema } from "@/lib/validations/leave";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";
import { NotificationService } from "@/services/notification-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const whereClause: any = {};

    // Strict student data isolation
    if (session.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
      });
      if (!student) throw new NotFoundError("Student record not found");
      whereClause.studentId = student.id;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const leaves = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
            course: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(leaves);
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

    let studentId = "";
    if (session.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
      });
      if (!student) throw new NotFoundError("Student record not found");
      studentId = student.id;
    } else {
      studentId = body.studentId;
      if (!studentId) throw new BadRequestError("Student ID is required");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Business Rule: Departure date cannot be in the past (allowing 15m clock skew)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (start < fifteenMinutesAgo) {
      throw new BadRequestError("Departure date cannot be in the past");
    }

    // Critical Business Rule: Prevent conflicting active leave requests
    const conflictingRequest = await prisma.leaveRequest.findFirst({
      where: {
        studentId,
        status: { in: ["SUBMITTED", "APPROVED"] },
        OR: [
          // New start is between existing start and end
          {
            startDate: { lte: start },
            endDate: { gte: start },
          },
          // New end is between existing start and end
          {
            startDate: { lte: end },
            endDate: { gte: end },
          },
          // New span covers existing span
          {
            startDate: { gte: start },
            endDate: { lte: end },
          },
        ],
      },
    });

    if (conflictingRequest) {
      throw new ConflictError(
        `Conflicting active leave request (${conflictingRequest.requestCode}) already exists for this timeframe.`
      );
    }

    // Generate unique request code
    const count = await prisma.leaveRequest.count();
    const requestCode = `LEV-2026-${String(count + 1).padStart(4, "0")}`;

    const leave = await prisma.leaveRequest.create({
      data: {
        requestCode,
        studentId,
        leaveType,
        startDate: start,
        endDate: end,
        reason,
        destination,
        emergencyContact,
        status: "SUBMITTED",
      },
      include: {
        student: true,
      },
    });

    // Audit log
    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "LEAVE_REQUEST_SUBMITTED",
      targetType: "LeaveRequest",
      targetId: leave.id,
      details: { code: requestCode, leaveType, start, end, destination },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    // Notification to student
    await NotificationService.send({
      userId: session.id,
      title: "Out-Pass Request Lodged",
      message: `Your request ${requestCode} for ${destination} is pending Warden review.`,
      type: "INFO",
      linkUrl: `/student/leave`,
    });

    return successResponse(leave, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
