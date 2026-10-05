import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
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

    // Fetch all active residents
    const students = await prisma.student.findMany({
      where: { status: "ACTIVE" },
      include: {
        allocations: {
          where: { status: "ACTIVE" },
          include: {
            bed: {
              include: {
                room: true,
              },
            },
          },
        },
        attendanceRecords: {
          where: { date },
        },
      },
      orderBy: { name: "asc" },
    });

    const roster = students.map((s) => {
      const record = s.attendanceRecords[0];
      const alloc = s.allocations[0];
      return {
        studentId: s.id,
        name: s.name,
        rollNumber: s.studentId,
        roomNumber: alloc ? `${alloc.bed.room.roomNumber}-${alloc.bed.bedNumber}` : "Unallocated",
        status: record ? record.status : "UNMARKED",
        remarks: record ? record.remarks : "",
        recordId: record ? record.id : null,
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

    // Support 1: Mark all active residents or batch list
    if (body.markAllPresent && body.date) {
      const activeStudents = await prisma.student.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });

      const records = [];
      for (const st of activeStudents) {
        const rec = await prisma.attendance.upsert({
          where: {
            studentId_date: {
              studentId: st.id,
              date: body.date,
            },
          },
          update: {
            status: "PRESENT",
            isCorrected: true,
            correctedById: session.id,
          },
          create: {
            studentId: st.id,
            date: body.date,
            status: "PRESENT",
            markedById: session.id,
          },
        });
        records.push(rec);
      }

      await AuditService.record({
        actorId: session.id,
        actorRole: session.role,
        actorName: session.name,
        action: "ATTENDANCE_BATCH_ALL_PRESENT",
        targetType: "Attendance",
        targetId: body.date,
        details: { count: records.length, date: body.date },
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
      });

      return successResponse({ count: records.length, message: `Marked all ${records.length} residents as Present.` });
    }

    if (body.batch && Array.isArray(body.batch)) {
      const results = [];
      for (const item of body.batch) {
        if (!item.studentId || !item.status) continue;
        const rec = await prisma.attendance.upsert({
          where: {
            studentId_date: {
              studentId: item.studentId,
              date: body.date,
            },
          },
          update: {
            status: item.status,
            remarks: item.remarks || null,
            isCorrected: true,
            correctedById: session.id,
          },
          create: {
            studentId: item.studentId,
            date: body.date,
            status: item.status,
            markedById: session.id,
            remarks: item.remarks || null,
          },
        });
        results.push(rec);
      }
      return successResponse({ count: results.length, records: results });
    }

    // Support 2: Single student record update
    const { date, studentId, status, remarks } = body;

    if (!date || !studentId || !status) {
      throw new BadRequestError("Date, studentId, and status are required");
    }

    // Upsert attendance record
    const record = await prisma.attendance.upsert({
      where: {
        studentId_date: {
          studentId,
          date,
        },
      },
      update: {
        status,
        remarks: remarks || null,
        isCorrected: true,
        correctedById: session.id,
      },
      create: {
        studentId,
        date,
        status,
        markedById: session.id,
        remarks: remarks || null,
      },
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "ATTENDANCE_MARKED",
      targetType: "Attendance",
      targetId: record.id,
      details: { studentId, date, status, remarks },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(record);
  } catch (error) {
    return errorResponse(error);
  }
}
