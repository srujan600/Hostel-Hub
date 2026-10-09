import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Room, Floor, Block, Hostel, Bed, RoomAllocation, Student } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);

    const blockId = searchParams.get("blockId");
    const floorId = searchParams.get("floorId");
    const status = searchParams.get("status");
    const roomType = searchParams.get("roomType");
    const availableOnly = searchParams.get("availableOnly") === "true";

    const query: any = {};
    if (floorId) {
      query.floorId = floorId;
    } else if (blockId) {
      const floorsInBlock = await Floor.find({ blockId }, { _id: 1 }).lean();
      query.floorId = { $in: floorsInBlock.map((f) => f._id) };
    }

    if (status && status !== "ALL") query.status = status;
    if (roomType && roomType !== "ALL") query.roomType = roomType;

    const rooms = await Room.find(query).sort({ roomNumber: 1 }).lean();
    const roomIds = rooms.map((r) => r._id);
    const floorIds = [...new Set(rooms.map((r) => r.floorId))];

    const [floors, beds] = await Promise.all([
      Floor.find({ _id: { $in: floorIds } }).lean(),
      Bed.find({ roomId: { $in: roomIds } }).sort({ bedNumber: 1 }).lean(),
    ]);

    const blockIds = [...new Set(floors.map((f) => f.blockId))];
    const blocks = await Block.find({ _id: { $in: blockIds } }).lean();

    const hostelIds = [...new Set(blocks.map((b) => b.hostelId))];
    const hostels = await Hostel.find({ _id: { $in: hostelIds } }).lean();

    const bedIds = beds.map((b) => b._id);
    const activeAllocations = await RoomAllocation.find({
      bedId: { $in: bedIds },
      status: "ACTIVE",
    }).lean();

    const studentIds = activeAllocations.map((a) => a.studentId);
    const students = await Student.find(
      { _id: { $in: studentIds } },
      { _id: 1, name: 1, studentId: 1, phone: 1 }
    ).lean();

    const studentMap = new Map(
      students.map((s) => [s._id, { id: s._id, name: s.name, studentId: s.studentId, phone: s.phone }])
    );
    const allocationMap = new Map(activeAllocations.map((a) => [a.bedId, a]));
    const floorMap = new Map(floors.map((f) => [f._id, f]));
    const blockMap = new Map(blocks.map((b) => [b._id, b]));
    const hostelMap = new Map(hostels.map((h) => [h._id, h]));

    const bedsByRoom = new Map<string, any[]>();
    beds.forEach((b) => {
      const alloc = allocationMap.get(b._id);
      const student = alloc ? studentMap.get(alloc.studentId) || null : null;
      const bList = bedsByRoom.get(b.roomId) || [];
      bList.push({
        id: b._id,
        bedNumber: b.bedNumber,
        status: b.status,
        currentResident: student,
        allocationId: alloc?._id || null,
      });
      bedsByRoom.set(b.roomId, bList);
    });

    let formattedRooms = rooms.map((r) => {
      const roomBeds = bedsByRoom.get(r._id) || [];
      const availableBedsCount = roomBeds.filter((b) => b.status === "AVAILABLE").length;
      const floor = floorMap.get(r.floorId);
      const block = floor ? blockMap.get(floor.blockId) : null;
      const hostel = block ? hostelMap.get(block.hostelId) : null;

      return {
        id: r._id,
        roomNumber: r.roomNumber,
        roomType: r.roomType,
        capacity: r.capacity,
        occupiedBeds: r.occupiedBeds,
        availableBedsCount,
        status: r.status,
        floorId: r.floorId,
        floorNumber: floor?.floorNumber ?? 0,
        floorName: floor?.name ?? "",
        blockId: block?._id ?? "",
        blockName: block?.name ?? "",
        blockCode: block?.code ?? "",
        hostelId: hostel?._id ?? "",
        hostelName: hostel?.name ?? "",
        beds: roomBeds,
      };
    });

    if (availableOnly) {
      formattedRooms = formattedRooms.filter((r) => r.availableBedsCount > 0);
    }

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

    await connectToDatabase();

    const floor = await Floor.findById(floorId);
    if (!floor) {
      throw new NotFoundError("Floor not found");
    }

    const existingRoom = await Room.findOne({
      floorId,
      roomNumber: String(roomNumber).trim(),
    });

    if (existingRoom) {
      throw new BadRequestError(`Room ${roomNumber} already exists on this floor`);
    }

    const parsedCapacity = Number(capacity) || (roomType === "SINGLE" ? 1 : roomType === "TRIPLE" ? 3 : 2);
    const finalRoomType = roomType || (parsedCapacity === 1 ? "SINGLE" : parsedCapacity === 3 ? "TRIPLE" : "DOUBLE");

    const newRoom = await Room.create({
      floorId,
      roomNumber: String(roomNumber).trim(),
      roomType: finalRoomType,
      capacity: parsedCapacity,
      occupiedBeds: 0,
      status: "ACTIVE",
    });

    const bedLetters = ["A", "B", "C", "D", "E", "F"];
    const bedsToCreate = [];
    for (let i = 0; i < parsedCapacity; i++) {
      bedsToCreate.push({
        roomId: newRoom._id,
        bedNumber: bedLetters[i] || `B${i + 1}`,
        status: "AVAILABLE",
      });
    }

    const createdBeds = await Bed.insertMany(bedsToCreate);

    await Floor.updateOne({ _id: floorId }, { $inc: { totalRooms: 1 } });
    await Block.updateOne({ _id: floor.blockId }, { $inc: { totalRooms: 1 } });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "ROOM_CREATED",
      targetType: "Room",
      targetId: newRoom._id,
      details: { roomNumber, roomType: newRoom.roomType, capacity: parsedCapacity },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse({
      ...newRoom.toJSON(),
      beds: createdBeds.map((b) => b.toJSON()),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
