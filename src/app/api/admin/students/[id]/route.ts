import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Student, User, RoomAllocation, Bed, Room, Floor, Block, Hostel, Complaint, LeaveRequest } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "WARDEN") {
      throw new ForbiddenError("Forbidden: Staff authorization required");
    }

    const { id } = await params;
    await connectToDatabase();

    const student = await Student.findById(id).lean();
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    const [user, allocations, complaints, leaveRequests] = await Promise.all([
      User.findById(student.userId, { username: 1, status: 1 }).lean(),
      RoomAllocation.find({ studentId: student._id }).lean(),
      Complaint.find({ studentId: student._id }).sort({ createdAt: -1 }).lean(),
      LeaveRequest.find({ studentId: student._id }).sort({ createdAt: -1 }).lean(),
    ]);

    const bedIds = allocations.map((a) => a.bedId);
    const beds = await Bed.find({ _id: { $in: bedIds } }).lean();
    const roomIds = beds.map((b) => b.roomId);
    const rooms = await Room.find({ _id: { $in: roomIds } }).lean();
    const floorIds = rooms.map((r) => r.floorId);
    const floors = await Floor.find({ _id: { $in: floorIds } }).lean();
    const blockIds = floors.map((f) => f.blockId);
    const blocks = await Block.find({ _id: { $in: blockIds } }).lean();
    const hostelIds = blocks.map((b) => b.hostelId);
    const hostels = await Hostel.find({ _id: { $in: hostelIds } }).lean();

    const bedMap = new Map(beds.map((b) => [b._id, b]));
    const roomMap = new Map(rooms.map((r) => [r._id, r]));
    const floorMap = new Map(floors.map((f) => [f._id, f]));
    const blockMap = new Map(blocks.map((b) => [b._id, b]));
    const hostelMap = new Map(hostels.map((h) => [h._id, h]));

    const enrichedAllocations = allocations.map((a) => {
      const bed = bedMap.get(a.bedId);
      const room = bed ? roomMap.get(bed.roomId) : null;
      const floor = room ? floorMap.get(room.floorId) : null;
      const block = floor ? blockMap.get(floor.blockId) : null;
      const hostel = block ? hostelMap.get(block.hostelId) : null;

      return {
        ...a,
        id: a._id,
        bed: bed
          ? {
              ...bed,
              id: bed._id,
              room: room
                ? {
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
                  }
                : null,
            }
          : null,
      };
    });

    return successResponse({
      ...student,
      id: student._id,
      user: user ? { username: user.username, status: user.status } : null,
      allocations: enrichedAllocations,
      complaints: complaints.map((c) => ({ ...c, id: c._id })),
      leaveRequests: leaveRequests.map((l) => ({ ...l, id: l._id })),
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
      throw new ForbiddenError("Forbidden: Administrator privileges required to update student status");
    }

    const { id } = await params;
    const body = await req.json();
    const { name, phone, course, department, yearOfStudy, status, emergencyContactName, emergencyContactPhone, address } = body;

    await connectToDatabase();

    const student = await Student.findById(id);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    if (name) student.name = name.trim();
    if (phone) student.phone = phone.trim();
    if (course) student.course = course.trim();
    if (department) student.department = department.trim();
    if (yearOfStudy !== undefined) student.yearOfStudy = Number(yearOfStudy);
    if (status) student.status = status;
    if (emergencyContactName) student.emergencyContactName = emergencyContactName.trim();
    if (emergencyContactPhone) student.emergencyContactPhone = emergencyContactPhone.trim();
    if (address !== undefined) student.address = address;

    await student.save();

    if (status && (status === "SUSPENDED" || status === "INACTIVE")) {
      await User.updateOne({ _id: student.userId }, { $set: { status: "SUSPENDED" } });
    } else if (status && status === "ACTIVE") {
      await User.updateOne({ _id: student.userId }, { $set: { status: "ACTIVE" } });
    }

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "STUDENT_UPDATED",
      targetType: "Student",
      targetId: id,
      details: body,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(student.toJSON());
  } catch (error) {
    return errorResponse(error);
  }
}
