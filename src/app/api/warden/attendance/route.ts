import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Attendance, Student, RoomAllocation, Bed, Room } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Warden authorization required");
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    await connectToDatabase();

    const students = await Student.find({ status: "ACTIVE" }).sort({ name: 1 }).lean();
    const studentIds = students.map((s) => s._id);

    const [allocations, attendanceRecords] = await Promise.all([
      RoomAllocation.find({ studentId: { $in: studentIds }, status: "ACTIVE" }).lean(),
      Attendance.find({ studentId: { $in: studentIds }, date }).lean(),
    ]);

    const bedIds = allocations.map((a) => a.bedId);
    const beds = await Bed.find({ _id: { $in: bedIds } }).lean();
    const roomIds = beds.map((b) => b.roomId);
    const rooms = await Room.find({ _id: { $in: roomIds } }).lean();

    const roomMap = new Map(rooms.map((r) => [r._id, r]));
    const bedMap = new Map(beds.map((b) => [b._id, b]));
    const allocMap = new Map(allocations.map((a) => [a.studentId, a]));
    const attendMap = new Map(attendanceRecords.map((ar) => [ar.studentId, ar]));

    const roster = students.map((s) => {
      const record = attendMap.get(s._id);
      const alloc = allocMap.get(s._id);
      let roomLabel = "Unallocated";
      if (alloc) {
        const bed = bedMap.get(alloc.bedId);
        const room = bed ? roomMap.get(bed.roomId) : null;
        if (room && bed) {
          roomLabel = `${room.roomNumber}-${bed.bedNumber}`;
        }
      }

      return {
        studentId: s._id,
        name: s.name,
        rollNumber: s.studentId,
        roomNumber: roomLabel,
        status: record ? record.status : "UNMARKED",
        remarks: record ? record.remarks : "",
        recordId: record ? record._id : null,
      };
    });

    return successResponse({ date, roster });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Warden authorization required");
    }

    const body = await req.json();
    await connectToDatabase();

    if (body.markAllPresent && body.date) {
      const activeStudents = await Student.find({ status: "ACTIVE" }, { _id: 1 }).lean();

      const ops = activeStudents.map((st) => ({
        updateOne: {
          filter: { studentId: st._id, date: body.date },
          update: {
            $set: {
              status: "PRESENT",
              isCorrected: true,
              correctedById: session.id,
            },
            $setOnInsert: {
              markedById: session.id,
            },
          },
          upsert: true,
        },
      }));

      await Attendance.bulkWrite(ops);

      await AuditService.record({
        actorId: session.id,
        actorRole: session.role,
        actorName: session.name,
        action: "ATTENDANCE_BATCH_ALL_PRESENT",
        targetType: "Attendance",
        targetId: body.date,
        details: { count: activeStudents.length, date: body.date },
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
      });

      return successResponse({
        count: activeStudents.length,
        message: `Marked all ${activeStudents.length} residents as Present.`,
      });
    }

    if (body.batch && Array.isArray(body.batch)) {
      const ops = body.batch
        .filter((item: any) => item.studentId && item.status)
        .map((item: any) => ({
          updateOne: {
            filter: { studentId: item.studentId, date: body.date },
            update: {
              $set: {
                status: item.status,
                remarks: item.remarks || null,
                isCorrected: true,
                correctedById: session.id,
              },
              $setOnInsert: {
                markedById: session.id,
              },
            },
            upsert: true,
          },
        }));

      await Attendance.bulkWrite(ops);
      return successResponse({ count: ops.length, message: "Batch attendance saved." });
    }

    const { date, studentId, status, remarks } = body;

    if (!date || !studentId || !status) {
      throw new BadRequestError("Date, studentId, and status are required");
    }

    const record = await Attendance.findOneAndUpdate(
      { studentId, date },
      {
        $set: {
          status,
          remarks: remarks || null,
          isCorrected: true,
          correctedById: session.id,
        },
        $setOnInsert: {
          markedById: session.id,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "ATTENDANCE_MARKED",
      targetType: "Attendance",
      targetId: record._id,
      details: { studentId, date, status, remarks },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(record.toJSON());
  } catch (error) {
    return errorResponse(error);
  }
}
