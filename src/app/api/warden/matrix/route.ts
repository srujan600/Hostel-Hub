import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Hostel, Block, Floor, Room, Bed, RoomAllocation, Student } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Warden authorization required");
    }

    const { searchParams } = new URL(req.url);
    const blockFilter = searchParams.get("block");
    const floorFilter = searchParams.get("floor");

    await connectToDatabase();

    const hostels = await Hostel.find().lean();
    const hostelIds = hostels.map((h) => h._id);

    const blockQuery: any = { hostelId: { $in: hostelIds } };
    if (blockFilter && blockFilter !== "ALL") {
      blockQuery.code = blockFilter;
    }
    const blocks = await Block.find(blockQuery).lean();
    const blockIds = blocks.map((b) => b._id);

    const floorQuery: any = { blockId: { $in: blockIds } };
    if (floorFilter && floorFilter !== "ALL") {
      floorQuery.floorNumber = parseInt(floorFilter, 10);
    }
    const floors = await Floor.find(floorQuery).lean();
    const floorIds = floors.map((f) => f._id);

    const rooms = await Room.find({ floorId: { $in: floorIds } }).sort({ roomNumber: 1 }).lean();
    const roomIds = rooms.map((r) => r._id);

    const beds = await Bed.find({ roomId: { $in: roomIds } }).sort({ bedNumber: 1 }).lean();
    const bedIds = beds.map((b) => b._id);

    const activeAllocations = await RoomAllocation.find({
      bedId: { $in: bedIds },
      status: "ACTIVE",
    }).lean();

    const studentIds = activeAllocations.map((a) => a.studentId);
    const students = await Student.find(
      { _id: { $in: studentIds } },
      { _id: 1, name: 1, studentId: 1, course: 1, phone: 1 }
    ).lean();

    const studentMap = new Map(
      students.map((s) => [s._id, { id: s._id, name: s.name, studentId: s.studentId, course: s.course, phone: s.phone }])
    );

    const allocMap = new Map(
      activeAllocations.map((a) => [
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
    beds.forEach((b) => {
      const bList = bedsByRoom.get(b.roomId) || [];
      bList.push({
        ...b,
        id: b._id,
        allocations: allocMap.get(b._id) || [],
      });
      bedsByRoom.set(b.roomId, bList);
    });

    const roomsByFloor = new Map<string, any[]>();
    rooms.forEach((r) => {
      const rList = roomsByFloor.get(r.floorId) || [];
      rList.push({
        ...r,
        id: r._id,
        beds: bedsByRoom.get(r._id) || [],
      });
      roomsByFloor.set(r.floorId, rList);
    });

    const floorsByBlock = new Map<string, any[]>();
    floors.forEach((f) => {
      const fList = floorsByBlock.get(f.blockId) || [];
      fList.push({
        ...f,
        id: f._id,
        rooms: roomsByFloor.get(f._id) || [],
      });
      floorsByBlock.set(f.blockId, fList);
    });

    const blocksByHostel = new Map<string, any[]>();
    blocks.forEach((b) => {
      const bList = blocksByHostel.get(b.hostelId) || [];
      bList.push({
        ...b,
        id: b._id,
        floors: floorsByBlock.get(b._id) || [],
      });
      blocksByHostel.set(b.hostelId, bList);
    });

    const formattedHostels = hostels.map((h) => ({
      ...h,
      id: h._id,
      blocks: blocksByHostel.get(h._id) || [],
    }));

    return successResponse(formattedHostels);
  } catch (error) {
    return errorResponse(error);
  }
}
