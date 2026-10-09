import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Student, User, RoomAllocation, Bed, Room, Floor, Block, Hostel } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "STUDENT") {
      throw new ForbiddenError("Forbidden");
    }

    await connectToDatabase();

    const student = await Student.findOne({ userId: session.id }).lean();
    if (!student) throw new NotFoundError("Student profile not found");

    const user = await User.findById(session.id, { email: 1, username: 1, createdAt: 1 }).lean();

    const activeAlloc = await RoomAllocation.findOne({
      studentId: student._id,
      status: "ACTIVE",
    }).lean();

    let allocationsData: any[] = [];
    if (activeAlloc) {
      const bed = await Bed.findById(activeAlloc.bedId).lean();
      const room = bed ? await Room.findById(bed.roomId).lean() : null;
      const floor = room ? await Floor.findById(room.floorId).lean() : null;
      const block = floor ? await Block.findById(floor.blockId).lean() : null;
      const hostel = block ? await Hostel.findById(block.hostelId).lean() : null;

      allocationsData = [
        {
          ...activeAlloc,
          id: activeAlloc._id,
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
        },
      ];
    }

    return successResponse({
      ...student,
      id: student._id,
      user: user ? { ...user, id: user._id } : null,
      allocations: allocationsData,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "STUDENT") {
      throw new ForbiddenError("Forbidden");
    }

    const body = await req.json();
    const { phone, emergencyContactName, emergencyContactPhone, address } = body;

    await connectToDatabase();

    const student = await Student.findOne({ userId: session.id });
    if (!student) throw new NotFoundError("Student profile not found");

    if (phone !== undefined) student.phone = phone;
    if (emergencyContactName !== undefined) student.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone !== undefined) student.emergencyContactPhone = emergencyContactPhone;
    if (address !== undefined) student.address = address;

    await student.save();

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "STUDENT_PROFILE_UPDATED",
      targetType: "Student",
      targetId: student._id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(student.toJSON());
  } catch (error) {
    return errorResponse(error);
  }
}
