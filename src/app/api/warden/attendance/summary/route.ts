import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Attendance, Student } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Staff authorization required");
    }

    await connectToDatabase();

    const today = new Date();
    const past7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      past7Days.push(d.toISOString().split("T")[0]);
    }

    const records = await Attendance.find({ date: { $in: past7Days } }).lean();

    const studentIds = [...new Set(records.map((r) => r.studentId))];
    const students = await Student.find(
      { _id: { $in: studentIds } },
      { _id: 1, name: 1, studentId: 1, phone: 1, emergencyContactPhone: 1 }
    ).lean();

    const studentMap = new Map(
      students.map((s) => [s._id, { id: s._id, name: s.name, studentId: s.studentId, phone: s.phone, emergencyContactPhone: s.emergencyContactPhone }])
    );

    const studentAbsenceMap: Record<string, { count: number; student: any; dates: string[] }> = {};
    records.forEach((r) => {
      if (r.status === "ABSENT") {
        if (!studentAbsenceMap[r.studentId]) {
          studentAbsenceMap[r.studentId] = {
            count: 0,
            student: studentMap.get(r.studentId) || null,
            dates: [],
          };
        }
        studentAbsenceMap[r.studentId].count++;
        studentAbsenceMap[r.studentId].dates.push(r.date);
      }
    });

    const repeatAbsentees = Object.values(studentAbsenceMap)
      .filter((s) => s.count >= 2)
      .sort((a, b) => b.count - a.count);

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
