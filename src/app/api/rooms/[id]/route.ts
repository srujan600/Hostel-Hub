import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Room, Floor, Block, Hostel, Bed, RoomAllocation, Student } from "@/models";
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

    const room = await Room.findById(id).lean();
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const floor = await Floor.findById(room.floorId).lean();
    const block = floor ? await Block.findById(floor.blockId).lean() : null;
    const hostel = block ? await Hostel.findById(block.hostelId).lean() : null;

    const beds = await Bed.find({ roomId: room._id }).lean();
    const bedIds = beds.map((b) => b._id);

    const allocations = await RoomAllocation.find({
      bedId: { $in: bedIds },
      status: "ACTIVE",
    }).lean();

    const studentIds = allocations.map((a) => a.studentId);
    const students = await Student.find({ _id: { $in: studentIds } }).lean();
    const studentMap = new Map(students.map((s) => [s._id, s]));

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

    const bedsWithAllocations = beds.map((b) => ({
      ...b,
      id: b._id,
      allocations: allocationMap.get(b._id) || [],
    }));

    return successResponse({
      ...room,
      id: room._id,
      floor: floor
        ? {
            ...floor,
            id: floor._id,
            block: block
              ? {
                  ...block,
                  id: block._id,
                  hostel: hostel ? { ...hostel, id: hostel._id } : null,
                }
              : null,
          }
        : null,
      beds: bedsWithAllocations,
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
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "WARDEN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to update room");
    }

    const { id } = await params;
    const body = await req.json();
    const { status, roomType } = body;

    await connectToDatabase();

    const room = await Room.findById(id);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    if (status !== undefined) room.status = status;
    if (roomType !== undefined) room.roomType = roomType;

    await room.save();

    const beds = await Bed.find({ roomId: room._id }).lean();

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "ROOM_UPDATED",
      targetType: "Room",
      targetId: room._id,
      details: body,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse({
      ...room.toJSON(),
      beds: beds.map((b) => ({ ...b, id: b._id })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
