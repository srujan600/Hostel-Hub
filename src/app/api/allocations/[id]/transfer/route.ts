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
      throw new ForbiddenError("Forbidden: Staff authorization required to transfer room allocations");
    }

    const { id } = await params;
    const body = await req.json();
    const { newBedId, reason } = body;

    if (!newBedId) {
      throw new BadRequestError("Target new bed ID is required");
    }

    // 1. Transactional Transfer Execution
    const transferResult = await prisma.$transaction(async (tx) => {
      // Re-fetch current allocation
      const currentAlloc = await tx.roomAllocation.findUnique({
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

      if (!currentAlloc) {
        throw new NotFoundError("Current room allocation not found");
      }
      if (currentAlloc.status !== "ACTIVE") {
        throw new ConflictError("Only ACTIVE room allocations can be transferred");
      }
      if (currentAlloc.bedId === newBedId) {
        throw new BadRequestError("Target bed cannot be the same as current bed");
      }

      // Re-fetch target bed
      const targetBed = await tx.bed.findUnique({
        where: { id: newBedId },
        include: {
          room: true,
        },
      });

      if (!targetBed) {
        throw new NotFoundError("Target bed not found");
      }
      if (targetBed.status !== "AVAILABLE") {
        throw new ConflictError(`Target bed ${targetBed.bedNumber} is ${targetBed.status} and cannot be transferred into.`);
      }
      if (targetBed.room.occupiedBeds >= targetBed.room.capacity) {
        throw new ConflictError(`Target room ${targetBed.room.roomNumber} has reached full capacity.`);
      }

      // Step A: Mark current allocation as TRANSFERRED
      await tx.roomAllocation.update({
        where: { id: currentAlloc.id },
        data: {
          status: "TRANSFERRED",
          vacatedAt: new Date(),
          remarks: reason ? `Transferred: ${reason}` : "Transferred to new room",
        },
      });

      // Step B: Free old bed and decrement old room occupiedBeds
      await tx.bed.update({
        where: { id: currentAlloc.bedId },
        data: { status: "AVAILABLE" },
      });

      await tx.room.update({
        where: { id: currentAlloc.bed.roomId },
        data: { occupiedBeds: { decrement: 1 } },
      });

      // Step C: Create new allocation for student in target bed
      const newAllocation = await tx.roomAllocation.create({
        data: {
          studentId: currentAlloc.studentId,
          bedId: newBedId,
          academicYear: currentAlloc.academicYear,
          status: "ACTIVE",
          allocatedAt: new Date(),
          remarks: `Transferred from Room ${currentAlloc.bed.room.roomNumber}, Bed ${currentAlloc.bed.bedNumber}. Reason: ${reason || "Administrative Transfer"}`,
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

      // Step D: Mark target bed as OCCUPIED and increment target room occupiedBeds
      await tx.bed.update({
        where: { id: newBedId },
        data: { status: "OCCUPIED" },
      });

      await tx.room.update({
        where: { id: targetBed.roomId },
        data: { occupiedBeds: { increment: 1 } },
      });

      return {
        previousAllocation: currentAlloc,
        newAllocation,
      };
    });

    // 2. Post-transaction notification and audit
    await NotificationService.send({
      userId: transferResult.newAllocation.student.userId,
      title: "Room Transfer Approved",
      message: `Your room transfer has been processed. You have moved from Room ${transferResult.previousAllocation.bed.room.roomNumber} to Room ${transferResult.newAllocation.bed.room.roomNumber}, Bed ${transferResult.newAllocation.bed.bedNumber}.`,
      type: "INFO",
      linkUrl: "/student/room",
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "ROOM_TRANSFERRED",
      targetType: "RoomAllocation",
      targetId: transferResult.newAllocation.id,
      details: {
        studentId: transferResult.newAllocation.studentId,
        studentName: transferResult.newAllocation.student.name,
        fromRoom: transferResult.previousAllocation.bed.room.roomNumber,
        fromBed: transferResult.previousAllocation.bed.bedNumber,
        toRoom: transferResult.newAllocation.bed.room.roomNumber,
        toBed: transferResult.newAllocation.bed.bedNumber,
        reason,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(transferResult.newAllocation);
  } catch (error) {
    return errorResponse(error);
  }
}
