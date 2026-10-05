import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";
import { NotificationService } from "@/services/notification-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "WARDEN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to vacate room allocations");
    }

    const { id } = await params;
    const body = await req.json();
    const { reason, remarks, bedStatus } = body;

    // Transactional Vacate Execution
    const vacatedAllocation = await prisma.$transaction(async (tx) => {
      const allocation = await tx.roomAllocation.findUnique({
        where: { id },
        include: {
          student: true,
          bed: {
            include: {
              room: true,
            },
          },
        },
      });

      if (!allocation) {
        throw new NotFoundError("Room allocation not found");
      }
      if (allocation.status !== "ACTIVE") {
        throw new ConflictError("Only ACTIVE allocations can be vacated");
      }

      // 1. Mark allocation as VACATED
      const updatedAlloc = await tx.roomAllocation.update({
        where: { id },
        data: {
          status: "VACATED",
          vacatedAt: new Date(),
          remarks: remarks ? `${reason || "Vacated"}: ${remarks}` : (reason || "Student vacated room"),
        },
        include: {
          student: true,
          bed: {
            include: {
              room: true,
            },
          },
        },
      });

      // 2. Free bed (set to AVAILABLE or MAINTENANCE if flagged)
      const nextBedStatus = bedStatus === "MAINTENANCE" ? "MAINTENANCE" : "AVAILABLE";
      await tx.bed.update({
        where: { id: allocation.bedId },
        data: { status: nextBedStatus },
      });

      // 3. Decrement room occupiedBeds count
      await tx.room.update({
        where: { id: allocation.bed.roomId },
        data: { occupiedBeds: { decrement: 1 } },
      });

      return updatedAlloc;
    });

    // Post-transaction notification and audit
    await NotificationService.send({
      userId: vacatedAllocation.student.userId,
      title: "Room Checkout Completed",
      message: `Your room checkout has been recorded. You have vacated Room ${vacatedAllocation.bed.room.roomNumber}, Bed ${vacatedAllocation.bed.bedNumber}.`,
      type: "INFO",
      linkUrl: "/student/room",
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "ROOM_VACATED",
      targetType: "RoomAllocation",
      targetId: vacatedAllocation.id,
      details: {
        studentId: vacatedAllocation.studentId,
        studentName: vacatedAllocation.student.name,
        roomNumber: vacatedAllocation.bed.room.roomNumber,
        bedNumber: vacatedAllocation.bed.bedNumber,
        reason,
        remarks,
        nextBedStatus: bedStatus || "AVAILABLE",
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(vacatedAllocation);
  } catch (error) {
    return errorResponse(error);
  }
}
