import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);

    const blockId = searchParams.get("blockId");
    const floorId = searchParams.get("floorId");
    const status = searchParams.get("status");
    const roomType = searchParams.get("roomType");
    const availableOnly = searchParams.get("availableOnly") === "true";

    const whereClause: any = {};
    if (floorId) whereClause.floorId = floorId;
    if (blockId) whereClause.floor = { blockId };
    if (status && status !== "ALL") whereClause.status = status;
    if (roomType && roomType !== "ALL") whereClause.roomType = roomType;

    const rooms = await prisma.room.findMany({
      where: whereClause,
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
        beds: {
          include: {
            allocations: {
              where: { status: "ACTIVE" },
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    studentId: true,
                    phone: true,
                  },
                },
              },
            },
          },
          orderBy: { bedNumber: "asc" },
        },
      },
      orderBy: { roomNumber: "asc" },
    });

    // Optional filter: only rooms that have at least 1 available bed
    let filteredRooms = rooms;
    if (availableOnly) {
      filteredRooms = rooms.filter((r) => r.beds.some((b) => b.status === "AVAILABLE"));
    }

    const formattedRooms = filteredRooms.map((r) => {
      const availableBedsCount = r.beds.filter((b) => b.status === "AVAILABLE").length;
      return {
        id: r.id,
        roomNumber: r.roomNumber,
        roomType: r.roomType,
        capacity: r.capacity,
        occupiedBeds: r.occupiedBeds,
        availableBedsCount,
        status: r.status,
        floorId: r.floorId,
        floorNumber: r.floor.floorNumber,
        floorName: r.floor.name,
        blockId: r.floor.block.id,
        blockName: r.floor.block.name,
        blockCode: r.floor.block.code,
        hostelId: r.floor.block.hostel.id,
        hostelName: r.floor.block.hostel.name,
        beds: r.beds.map((b) => ({
          id: b.id,
          bedNumber: b.bedNumber,
          status: b.status,
          currentResident: b.allocations[0]?.student || null,
          allocationId: b.allocations[0]?.id || null,
        })),
      };
    });

    return successResponse(formattedRooms);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Administrator privileges required to create rooms");
    }

    const body = await req.json();
    const { floorId, roomNumber, roomType, capacity } = body;

    if (!floorId || !roomNumber) {
      throw new BadRequestError("Floor ID and room number are required");
    }

    const floor = await prisma.floor.findUnique({
      where: { id: floorId },
      include: { block: true },
    });
    if (!floor) {
      throw new NotFoundError("Floor not found");
    }

    const existingRoom = await prisma.room.findUnique({
      where: {
        floorId_roomNumber: {
          floorId,
          roomNumber: String(roomNumber).trim(),
        },
      },
    });

    if (existingRoom) {
      throw new BadRequestError(`Room ${roomNumber} already exists on this floor`);
    }

    const parsedCapacity = Number(capacity) || (roomType === "SINGLE" ? 1 : roomType === "TRIPLE" ? 3 : 2);

    // Create room and generate beds within transaction
    const newRoom = await prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          floorId,
          roomNumber: String(roomNumber).trim(),
          roomType: roomType || (parsedCapacity === 1 ? "SINGLE" : parsedCapacity === 3 ? "TRIPLE" : "DOUBLE"),
          capacity: parsedCapacity,
          occupiedBeds: 0,
          status: "ACTIVE",
        },
      });

      // Generate beds A, B, C, D...
      const bedLetters = ["A", "B", "C", "D", "E", "F"];
      for (let i = 0; i < parsedCapacity; i++) {
        await tx.bed.create({
          data: {
            roomId: room.id,
            bedNumber: bedLetters[i] || `B${i + 1}`,
            status: "AVAILABLE",
          },
        });
      }

      // Increment floor totalRooms count
      await tx.floor.update({
        where: { id: floorId },
        data: { totalRooms: { increment: 1 } },
      });

      // Increment block totalRooms count
      await tx.block.update({
        where: { id: floor.blockId },
        data: { totalRooms: { increment: 1 } },
      });

      return room;
    });

    const fullRoom = await prisma.room.findUnique({
      where: { id: newRoom.id },
      include: { beds: true },
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "ROOM_CREATED",
      targetType: "Room",
      targetId: newRoom.id,
      details: { roomNumber, roomType: newRoom.roomType, capacity: parsedCapacity },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(fullRoom);
  } catch (error) {
    return errorResponse(error);
  }
}
