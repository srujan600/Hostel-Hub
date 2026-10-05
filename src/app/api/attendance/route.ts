import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    let targetStudentId = "";
    if (session.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
      });
      if (!student) throw new NotFoundError("Student record not found");
      targetStudentId = student.id;
    } else {
      const { searchParams } = new URL(req.url);
      targetStudentId = searchParams.get("studentId") || "";
    }

    const whereClause: any = {};
    if (targetStudentId) {
      whereClause.studentId = targetStudentId;
    }

    const records = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            name: true,
            studentId: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: 60,
    });

    const totalDays = records.length;
    const presentCount = records.filter((r) => r.status === "PRESENT").length;
    const absentCount = records.filter((r) => r.status === "ABSENT").length;
    const excusedCount = records.filter((r) => r.status === "EXCUSED").length;
    const lateCount = records.filter((r) => r.status === "LATE").length;

    const percentage = totalDays > 0 ? Math.round(((presentCount + excusedCount) / totalDays) * 100) : 100;

    return successResponse({
      records,
      summary: {
        totalDays,
        presentCount,
        absentCount,
        excusedCount,
        lateCount,
        attendancePercentage: percentage,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
