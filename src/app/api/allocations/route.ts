import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { RoomAllocation, Student, Bed, Room, Floor, Block, Hostel } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";
import { NotificationService } from "@/services/notification-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const studentId = searchParams.get("studentId");
    const search = searchParams.get("search");

    const query: any = {};

    if (session.role === "STUDENT") {
      const student = await Student.findOne({ userId: session.id }).lean();
      if (!student) throw new NotFoundError("Student record not found");
      query.studentId = student._id;
    } else {
      if (studentId) query.studentId = studentId;
    }

    if (status && status !== "ALL") {
      query.status = status;
    }

    const allocations = await RoomAllocation.find(query).sort({ allocatedAt: -1 }).lean();

    const studentIds = [...new Set(allocations.map((a) => a.studentId))];
    const bedIds = [...new Set(allocations.map((a) => a.bedId))];

    const [students, beds] = await Promise.all([
      Student.find({ _id: { $in: studentIds } }).lean(),
      Bed.find({ _id: { $in: bedIds } }).lean(),
    ]);

    const roomIds = [...new Set(beds.map((b) => b.roomId))];
    const rooms = await Room.find({ _id: { $in: roomIds } }).lean();

    const floorIds = [...new Set(rooms.map((r) => r.floorId))];
    const floors = await Floor.find({ _id: { $in: floorIds } }).lean();

    const blockIds = [...new Set(floors.map((f) => f.blockId))];
    const blocks = await Block.find({ _id: { $in: blockIds } }).lean();

    const hostelIds = [...new Set(blocks.map((b) => b.hostelId))];
    const hostels = await Hostel.find({ _id: { $in: hostelIds } }).lean();

    const studentMap = new Map(students.map((s) => [s._id, s]));
    const bedMap = new Map(beds.map((b) => [b._id, b]));
    const roomMap = new Map(rooms.map((r) => [r._id, r]));
    const floorMap = new Map(floors.map((f) => [f._id, f]));
    const blockMap = new Map(blocks.map((b) => [b._id, b]));
    const hostelMap = new Map(hostels.map((h) => [h._id, h]));

    let formatted = allocations.map((a) => {
      const student = studentMap.get(a.studentId);
      const bed = bedMap.get(a.bedId);
      const room = bed ? roomMap.get(bed.roomId) : null;
      const floor = room ? floorMap.get(room.floorId) : null;
      const block = floor ? blockMap.get(floor.blockId) : null;
      const hostel = block ? hostelMap.get(block.hostelId) : null;

      return {
        id: a._id,
        academicYear: a.academicYear,
        allocatedAt: a.allocatedAt,
        vacatedAt: a.vacatedAt,
        status: a.status,
        remarks: a.remarks,
        student: student
          ? {
              id: student._id,
              userId: student.userId,
              name: student.name,
              studentId: student.studentId,
              course: student.course,
              phone: student.phone,
              emergencyContactPhone: student.emergencyContactPhone,
            }
          : null,
        bed: bed
          ? {
              id: bed._id,
              bedNumber: bed.bedNumber,
              status: bed.status,
              roomNumber: room?.roomNumber || "N/A",
              roomType: room?.roomType || "N/A",
              floorName: floor?.name || "N/A",
              blockName: block?.name || "N/A",
              hostelName: hostel?.name || "N/A",
            }
          : null,
      };
    });

    if (search && search.trim()) {
      const q = search.toLowerCase();
      formatted = formatted.filter((a) => {
        const matchName = a.student?.name.toLowerCase().includes(q);
        const matchRoll = a.student?.studentId.toLowerCase().includes(q);
        const matchRoom = a.bed?.roomNumber.toLowerCase().includes(q);
        return matchName || matchRoll || matchRoom;
      });
    }

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

    await connectToDatabase();

    const student = await Student.findById(studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    const existingAlloc = await RoomAllocation.findOne({
      studentId,
      status: "ACTIVE",
    });
    if (existingAlloc) {
      throw new ConflictError(`Student ${student.name} already has an active room allocation.`);
    }

    const bed = await Bed.findById(bedId);
    if (!bed) {
      throw new NotFoundError("Bed not found");
    }
    if (bed.status !== "AVAILABLE") {
      throw new ConflictError(`Bed ${bed.bedNumber} is currently ${bed.status} and cannot be allocated.`);
    }

    const room = await Room.findById(bed.roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }
    if (room.occupiedBeds >= room.capacity) {
      throw new ConflictError(`Room ${room.roomNumber} has reached its maximum capacity of ${room.capacity} beds.`);
    }

    // Atomic claim of bed
    const claimedBed = await Bed.findOneAndUpdate(
      { _id: bedId, status: "AVAILABLE" },
      { $set: { status: "OCCUPIED" } },
      { returnDocument: "after" }
    );
    if (!claimedBed) {
      throw new ConflictError(`Bed ${bed.bedNumber} was just allocated by another user.`);
    }

    await Room.updateOne({ _id: room._id }, { $inc: { occupiedBeds: 1 } });

    const allocation = await RoomAllocation.create({
      studentId,
      bedId,
      academicYear: academicYear || "2026-2027",
      status: "ACTIVE",
      allocatedAt: new Date(),
      remarks: remarks || "Standard Room Allocation",
    });

    await NotificationService.send({
      userId: student.userId,
      title: "Room Allocated",
      message: `You have been allocated Room ${room.roomNumber}, Bed ${bed.bedNumber}.`,
      type: "SUCCESS",
      linkUrl: "/student/room",
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "ROOM_ALLOCATED",
      targetType: "RoomAllocation",
      targetId: allocation._id,
      details: {
        studentId,
        studentName: student.name,
        roomNumber: room.roomNumber,
        bedNumber: bed.bedNumber,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse({
      ...allocation.toJSON(),
      student: student.toJSON(),
      bed: {
        ...bed.toJSON(),
        room: room.toJSON(),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
