import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { RoomAllocation, Student, Bed, Room } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError, NotFoundError, ConflictError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";
import { NotificationService } from "@/services/notification-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "WARDEN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to vacate room allocations");
    }

    const { id } = await params;
    const body = await req.json();
    const { reason, remarks, bedStatus } = body;

    await connectToDatabase();

    const allocation = await RoomAllocation.findById(id);
    if (!allocation) {
      throw new NotFoundError("Room allocation not found");
    }
    if (allocation.status !== "ACTIVE") {
      throw new ConflictError("Only ACTIVE allocations can be vacated");
    }

    const student = await Student.findById(allocation.studentId);
    const bed = await Bed.findById(allocation.bedId);
    const room = bed ? await Room.findById(bed.roomId) : null;

    allocation.status = "VACATED";
    allocation.vacatedAt = new Date();
    allocation.remarks = remarks ? `${reason || "Vacated"}: ${remarks}` : (reason || "Student vacated room");
    await allocation.save();

    const nextBedStatus = bedStatus === "MAINTENANCE" ? "MAINTENANCE" : "AVAILABLE";
    if (bed) {
      await Bed.updateOne({ _id: bed._id }, { $set: { status: nextBedStatus } });
    }
    if (room) {
      await Room.updateOne({ _id: room._id }, { $inc: { occupiedBeds: -1 } });
    }

    if (student) {
      await NotificationService.send({
        userId: student.userId,
        title: "Room Checkout Completed",
        message: `Your room checkout has been recorded. You have vacated Room ${room?.roomNumber || "N/A"}, Bed ${bed?.bedNumber || "N/A"}.`,
        type: "INFO",
        linkUrl: "/student/room",
      });
    }

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "ROOM_VACATED",
      targetType: "RoomAllocation",
      targetId: allocation._id,
      details: {
        studentId: student?._id,
        studentName: student?.name,
        roomNumber: room?.roomNumber,
        bedNumber: bed?.bedNumber,
        reason,
        remarks,
        nextBedStatus: bedStatus || "AVAILABLE",
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse({
      ...allocation.toJSON(),
      student: student ? student.toJSON() : null,
      bed: bed
        ? {
            ...bed.toJSON(),
            room: room ? room.toJSON() : null,
          }
        : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
