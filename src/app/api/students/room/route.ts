import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Student, RoomAllocation, Bed, Room, Floor, Block, Hostel } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "STUDENT") {
      throw new ForbiddenError("Room portal is reserved for students");
    }

    await connectToDatabase();

    const student = await Student.findOne({ userId: session.id }).lean();
    if (!student) {
      return successResponse({
        hasAllocation: false,
        message: "Student record not found.",
      });
    }

    const activeAlloc = await RoomAllocation.findOne({
      studentId: student._id,
      status: "ACTIVE",
    }).lean();

    if (!activeAlloc) {
      return successResponse({
        hasAllocation: false,
        message: "No active room allocation found. Please contact administration.",
      });
    }

    const bed = await Bed.findById(activeAlloc.bedId).lean();
    if (!bed) {
      return successResponse({
        hasAllocation: false,
        message: "Bed record not found.",
      });
    }

    const room = await Room.findById(bed.roomId).lean();
    if (!room) {
      return successResponse({
        hasAllocation: false,
        message: "Room record not found.",
      });
    }

    const floor = await Floor.findById(room.floorId).lean();
    const block = floor ? await Block.findById(floor.blockId).lean() : null;
    const hostel = block ? await Hostel.findById(block.hostelId).lean() : null;

    const roomBeds = await Bed.find({ roomId: room._id }).sort({ bedNumber: 1 }).lean();
    const roomBedIds = roomBeds.map((b) => b._id);

    const roomAllocations = await RoomAllocation.find({
      bedId: { $in: roomBedIds },
      status: "ACTIVE",
    }).lean();

    const residentIds = roomAllocations.map((a) => a.studentId);
    const residents = await Student.find({ _id: { $in: residentIds } }).lean();
    const residentMap = new Map(residents.map((r) => [r._id, r]));
    const bedAllocMap = new Map(roomAllocations.map((a) => [a.bedId, a]));

    const mappedBeds = roomBeds.map((b) => {
      const bAlloc = bedAllocMap.get(b._id);
      const occupant = bAlloc ? residentMap.get(bAlloc.studentId) : null;
      const isCurrentStudent = bAlloc?.studentId === student._id;

      return {
        bedId: b._id,
        bedNumber: b.bedNumber,
        status: b.status,
        isMyBed: isCurrentStudent,
        occupant: occupant
          ? {
              name: isCurrentStudent ? `${occupant.name} (You)` : occupant.name,
              course: occupant.course,
              yearOfStudy: occupant.yearOfStudy,
            }
          : null,
      };
    });

    return successResponse({
      hasAllocation: true,
      allocation: {
        id: activeAlloc._id,
        academicYear: activeAlloc.academicYear,
        allocatedAt: activeAlloc.allocatedAt,
        status: activeAlloc.status,
      },
      hostel: hostel
        ? {
            id: hostel._id,
            name: hostel.name,
            code: hostel.code,
            genderType: hostel.genderType,
            address: hostel.address,
          }
        : null,
      block: block
        ? {
            id: block._id,
            name: block.name,
            code: block.code,
          }
        : null,
      floor: floor
        ? {
            id: floor._id,
            name: floor.name,
            floorNumber: floor.floorNumber,
          }
        : null,
      room: {
        id: room._id,
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        capacity: room.capacity,
        occupiedBeds: room.occupiedBeds,
        status: room.status,
        myBedNumber: bed.bedNumber,
        beds: mappedBeds,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
