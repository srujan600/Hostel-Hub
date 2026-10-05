import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";
import { NotificationService } from "@/services/notification-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const studentId = searchParams.get("studentId");
    const search = searchParams.get("search");

    const whereClause: any = {};

    if (session.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
      });
      if (!student) throw new NotFoundError("Student record not found");
      whereClause.studentId = student.id;
    } else {
      if (studentId) whereClause.studentId = studentId;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const allocations = await prisma.roomAllocation.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            userId: true,
            name: true,
            studentId: true,
            course: true,
            phone: true,
            emergencyContactPhone: true,
          },
        },
        bed: {
          include: {
            room: {
              include: {
                floor: {
                  include: {
                    block: {
                      include: {
                        hostel: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { allocatedAt: "desc" },
    });

    let filtered = allocations;
    if (search && search.trim()) {
      const q = search.toLowerCase();
      filtered = allocations.filter((a) => {
        const matchName = a.student.name.toLowerCase().includes(q);
        const matchRoll = a.student.studentId.toLowerCase().includes(q);
        const matchRoom = a.bed.room.roomNumber.toLowerCase().includes(q);
        return matchName || matchRoll || matchRoom;
      });
    }

    const formatted = filtered.map((a) => ({
      id: a.id,
      academicYear: a.academicYear,
      allocatedAt: a.allocatedAt,
      vacatedAt: a.vacatedAt,
      status: a.status,
      remarks: a.remarks,
      student: a.student,
      bed: {
        id: a.bed.id,
        bedNumber: a.bed.bedNumber,
        status: a.bed.status,
        roomNumber: a.bed.room.roomNumber,
        roomType: a.bed.room.roomType,
        floorName: a.bed.room.floor.name,
        blockName: a.bed.room.floor.block.name,
        hostelName: a.bed.room.floor.block.hostel.name,
      },
    }));

    return successResponse(formatted);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "WARDEN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to allocate rooms");
    }

    const body = await req.json();
    const { studentId, bedId, academicYear, remarks } = body;

    if (!studentId || !bedId) {
      throw new BadRequestError("Student ID and Bed ID are required");
    }

    // 1. Pre-validation: Student check
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    // 2. Transactional Concurrency-Safe Allocation
    const result = await prisma.$transaction(async (tx) => {
      // Re-check student does not already have an active allocation inside transaction
      const existingAlloc = await tx.roomAllocation.findFirst({
        where: {
          studentId,
          status: "ACTIVE",
        },
      });
      if (existingAlloc) {
        throw new ConflictError(`Student ${student.name} already has an active room allocation.`);
      }

      // Re-fetch bed inside transaction
      const bed = await tx.bed.findUnique({
        where: { id: bedId },
        include: { room: true },
      });
      if (!bed) {
        throw new NotFoundError("Bed not found");
      }
      if (bed.status !== "AVAILABLE") {
        throw new ConflictError(`Bed ${bed.bedNumber} is currently ${bed.status} and cannot be allocated.`);
      }

      if (bed.room.occupiedBeds >= bed.room.capacity) {
        throw new ConflictError(`Room ${bed.room.roomNumber} has reached its maximum capacity of ${bed.room.capacity} beds.`);
      }

      // Create allocation
      const allocation = await tx.roomAllocation.create({
        data: {
          studentId,
          bedId,
          academicYear: academicYear || "2026-2027",
          status: "ACTIVE",
          allocatedAt: new Date(),
          remarks: remarks || "Standard Room Allocation",
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

      // Update bed status to OCCUPIED
      await tx.bed.update({
        where: { id: bedId },
        data: { status: "OCCUPIED" },
      });

      // Increment room occupied beds
      await tx.room.update({
        where: { id: bed.roomId },
        data: { occupiedBeds: { increment: 1 } },
      });

      return allocation;
    });

    // 3. Post-transaction notification and audit
    await NotificationService.send({
      userId: student.userId,
      title: "Room Allocated",
      message: `You have been allocated Room ${result.bed.room.roomNumber}, Bed ${result.bed.bedNumber}.`,
      type: "SUCCESS",
      linkUrl: "/student/room",
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "ROOM_ALLOCATED",
      targetType: "RoomAllocation",
      targetId: result.id,
      details: {
        studentId,
        studentName: student.name,
        roomNumber: result.bed.room.roomNumber,
        bedNumber: result.bed.bedNumber,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
