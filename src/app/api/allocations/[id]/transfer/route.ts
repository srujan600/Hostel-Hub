import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { RoomAllocation, Student, Bed, Room } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";
import { NotificationService } from "@/services/notification-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "WARDEN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to transfer room allocations");
    }

    const { id } = await params;
    const body = await req.json();
    const { newBedId, reason } = body;

    if (!newBedId) {
      throw new BadRequestError("Target new bed ID is required");
    }

    await connectToDatabase();

    const currentAlloc = await RoomAllocation.findById(id);
    if (!currentAlloc) {
      throw new NotFoundError("Current room allocation not found");
    }
    if (currentAlloc.status !== "ACTIVE") {
      throw new ConflictError("Only ACTIVE room allocations can be transferred");
    }
    if (currentAlloc.bedId === newBedId) {
      throw new BadRequestError("Target bed cannot be the same as current bed");
    }

    const student = await Student.findById(currentAlloc.studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    const oldBed = await Bed.findById(currentAlloc.bedId);
    const oldRoom = oldBed ? await Room.findById(oldBed.roomId) : null;

    const targetBed = await Bed.findById(newBedId);
    if (!targetBed) {
      throw new NotFoundError("Target bed not found");
    }
    if (targetBed.status !== "AVAILABLE") {
      throw new ConflictError(`Target bed ${targetBed.bedNumber} is ${targetBed.status} and cannot be transferred into.`);
    }

    const targetRoom = await Room.findById(targetBed.roomId);
    if (!targetRoom) {
      throw new NotFoundError("Target room not found");
    }
    if (targetRoom.occupiedBeds >= targetRoom.capacity) {
      throw new ConflictError(`Target room ${targetRoom.roomNumber} has reached full capacity.`);
    }

    // Atomic claim of new bed
    const claimedNewBed = await Bed.findOneAndUpdate(
      { _id: newBedId, status: "AVAILABLE" },
      { $set: { status: "OCCUPIED" } },
      { returnDocument: "after" }
    );
    if (!claimedNewBed) {
      throw new ConflictError(`Target bed ${targetBed.bedNumber} is no longer available.`);
    }

    // Step A: Mark current allocation as TRANSFERRED
    currentAlloc.status = "TRANSFERRED";
    currentAlloc.vacatedAt = new Date();
    currentAlloc.remarks = reason ? `Transferred: ${reason}` : "Transferred to new room";
    await currentAlloc.save();

    // Step B: Free old bed and decrement old room occupied beds
    if (oldBed) {
      await Bed.updateOne({ _id: oldBed._id }, { $set: { status: "AVAILABLE" } });
    }
    if (oldRoom) {
      await Room.updateOne({ _id: oldRoom._id }, { $inc: { occupiedBeds: -1 } });
    }

    // Step C: Increment target room occupied beds
    await Room.updateOne({ _id: targetRoom._id }, { $inc: { occupiedBeds: 1 } });

    // Step D: Create new allocation
    const newAllocation = await RoomAllocation.create({
      studentId: currentAlloc.studentId,
      bedId: newBedId,
      academicYear: currentAlloc.academicYear,
      status: "ACTIVE",
      allocatedAt: new Date(),
      remarks: `Transferred from Room ${oldRoom?.roomNumber || "N/A"}, Bed ${oldBed?.bedNumber || "N/A"}. Reason: ${reason || "Administrative Transfer"}`,
    });

    await NotificationService.send({
      userId: student.userId,
      title: "Room Transfer Approved",
      message: `Your room transfer has been processed. You have moved from Room ${oldRoom?.roomNumber} to Room ${targetRoom.roomNumber}, Bed ${targetBed.bedNumber}.`,
      type: "INFO",
      linkUrl: "/student/room",
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "ROOM_TRANSFERRED",
      targetType: "RoomAllocation",
      targetId: newAllocation._id,
      details: {
        studentId: student._id,
        studentName: student.name,
        fromRoom: oldRoom?.roomNumber,
        fromBed: oldBed?.bedNumber,
        toRoom: targetRoom.roomNumber,
        toBed: targetBed.bedNumber,
        reason,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse({
      ...newAllocation.toJSON(),
      student: student.toJSON(),
      bed: {
        ...targetBed.toJSON(),
        room: targetRoom.toJSON(),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
