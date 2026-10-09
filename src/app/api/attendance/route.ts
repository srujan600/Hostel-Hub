import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Attendance, Student } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await connectToDatabase();

    let targetStudentId = "";
    if (session.role === "STUDENT") {
      const student = await Student.findOne({ userId: session.id }).lean();
      if (!student) throw new NotFoundError("Student record not found");
      targetStudentId = student._id;
    } else {
      const { searchParams } = new URL(req.url);
      targetStudentId = searchParams.get("studentId") || "";
    }

    const query: any = {};
    if (targetStudentId) {
      query.studentId = targetStudentId;
    }

    const records = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(60)
      .lean();

    const studentIds = [...new Set(records.map((r) => r.studentId))];
    const students = await Student.find(
      { _id: { $in: studentIds } },
      { _id: 1, name: 1, studentId: 1 }
    ).lean();
    const studentMap = new Map(students.map((s) => [s._id, s]));

    const formattedRecords = records.map((r) => ({
      ...r,
      id: r._id,
      student: studentMap.get(r.studentId) || null,
    }));

    const totalDays = formattedRecords.length;
    const presentCount = formattedRecords.filter((r) => r.status === "PRESENT").length;
    const absentCount = formattedRecords.filter((r) => r.status === "ABSENT").length;
    const excusedCount = formattedRecords.filter((r) => r.status === "EXCUSED").length;
    const lateCount = formattedRecords.filter((r) => r.status === "LATE").length;

    const percentage =
      totalDays > 0 ? Math.round(((presentCount + excusedCount) / totalDays) * 100) : 100;

    return successResponse({
      records: formattedRecords,
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
