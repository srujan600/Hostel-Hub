import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Staff authorization required");
    }

    // 1. Fetch attendance records from past 7 days
    const today = new Date();
    const past7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      past7Days.push(d.toISOString().split("T")[0]);
    }

    const records = await prisma.attendance.findMany({
      where: {
        date: { in: past7Days },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
            phone: true,
            emergencyContactPhone: true,
          },
        },
      },
    });

    // 2. Count absences per student in the last 7 days
    const studentAbsenceMap: Record<string, { count: number; student: any; dates: string[] }> = {};
    records.forEach((r) => {
      if (r.status === "ABSENT") {
        if (!studentAbsenceMap[r.studentId]) {
          studentAbsenceMap[r.studentId] = {
            count: 0,
            student: r.student,
            dates: [],
          };
        }
        studentAbsenceMap[r.studentId].count++;
        studentAbsenceMap[r.studentId].dates.push(r.date);
      }
    });

    // Flag repeat absentees (absence count >= 2)
    const repeatAbsentees = Object.values(studentAbsenceMap)
      .filter((s) => s.count >= 2)
      .sort((a, b) => b.count - a.count);

    // 3. Daily compliance breakdown
    const dailyStats = past7Days.map((dateStr) => {
      const dayRecs = records.filter((r) => r.date === dateStr);
      const present = dayRecs.filter((r) => r.status === "PRESENT").length;
      const absent = dayRecs.filter((r) => r.status === "ABSENT").length;
      const late = dayRecs.filter((r) => r.status === "LATE").length;
      const excused = dayRecs.filter((r) => r.status === "EXCUSED").length;
      const total = dayRecs.length;

      return {
        date: dateStr,
        present,
        absent,
        late,
        excused,
        total,
        complianceRate: total > 0 ? Math.round(((present + late + excused) / total) * 100) : 100,
      };
    });

    return successResponse({
      past7Days,
      dailyStats,
      repeatAbsentees,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
