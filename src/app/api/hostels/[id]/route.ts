import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Hostel, Block, Floor, Room, Bed, RoomAllocation, Student } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req);
    const { id } = await params;

    await connectToDatabase();

    const hostel = await Hostel.findById(id).lean();
    if (!hostel) {
      throw new NotFoundError("Hostel not found");
    }

    const blocks = await Block.find({ hostelId: hostel._id }).lean();
    const blockIds = blocks.map((b) => b._id);

    const floors = await Floor.find({ blockId: { $in: blockIds } }).lean();
    const floorIds = floors.map((f) => f._id);

    const rooms = await Room.find({ floorId: { $in: floorIds } }).lean();
    const roomIds = rooms.map((r) => r._id);

    const beds = await Bed.find({ roomId: { $in: roomIds } }).lean();
    const bedIds = beds.map((b) => b._id);

    const allocations = await RoomAllocation.find({
      bedId: { $in: bedIds },
      status: "ACTIVE",
    }).lean();
    const studentIds = allocations.map((a) => a.studentId);

    const students = await Student.find(
      { _id: { $in: studentIds } },
      { _id: 1, name: 1, studentId: 1, phone: 1 }
    ).lean();

    const studentMap = new Map(
      students.map((s) => [s._id, { id: s._id, name: s.name, studentId: s.studentId, phone: s.phone }])
    );

    const allocationMap = new Map(
      allocations.map((a) => [
        a.bedId,
        [
          {
            ...a,
            id: a._id,
            student: studentMap.get(a.studentId) || null,
          },
        ],
      ])
    );

    const bedsByRoom = new Map<string, any[]>();
    beds.forEach((bed) => {
      const bList = bedsByRoom.get(bed.roomId) || [];
      bList.push({
        ...bed,
        id: bed._id,
        allocations: allocationMap.get(bed._id) || [],
      });
      bedsByRoom.set(bed.roomId, bList);
    });

    const roomsByFloor = new Map<string, any[]>();
    rooms.forEach((room) => {
      const rList = roomsByFloor.get(room.floorId) || [];
      rList.push({
        ...room,
        id: room._id,
        beds: bedsByRoom.get(room._id) || [],
      });
      roomsByFloor.set(room.floorId, rList);
    });

    const floorsByBlock = new Map<string, any[]>();
    floors.forEach((floor) => {
      const fList = floorsByBlock.get(floor.blockId) || [];
      fList.push({
        ...floor,
        id: floor._id,
        rooms: roomsByFloor.get(floor._id) || [],
      });
      floorsByBlock.set(floor.blockId, fList);
    });

    const fullBlocks = blocks.map((block) => ({
      ...block,
      id: block._id,
      floors: floorsByBlock.get(block._id) || [],
    }));

    return successResponse({
      ...hostel,
      id: hostel._id,
      blocks: fullBlocks,
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
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Administrator privileges required to update hostels");
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, address, genderType, status } = body;

    await connectToDatabase();

    const hostel = await Hostel.findById(id);
    if (!hostel) {
      throw new NotFoundError("Hostel not found");
    }

    if (name !== undefined) hostel.name = name.trim();
    if (description !== undefined) hostel.description = description?.trim();
    if (address !== undefined) hostel.address = address?.trim();
    if (genderType !== undefined) hostel.genderType = genderType;
    if (status !== undefined) hostel.status = status;

    await hostel.save();

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "HOSTEL_UPDATED",
      targetType: "Hostel",
      targetId: hostel._id,
      details: body,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(hostel.toJSON());
  } catch (error) {
    return errorResponse(error);
  }
}
