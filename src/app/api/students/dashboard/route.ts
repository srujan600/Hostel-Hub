import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "STUDENT") {
      throw new ForbiddenError("Student dashboard is reserved for resident students");
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.id },
      include: {
        allocations: {
          where: { status: "ACTIVE" },
          include: {
            bed: {
              include: {
                room: {
                  include: {
                    floor: {
                      include: {
                        block: {
                          include: {
                            hostel: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // 1. Current Active Allocation
    const activeAlloc = student.allocations[0] || null;
    const roomData = activeAlloc
      ? {
          hostelName: activeAlloc.bed.room.floor.block.hostel.name,
          hostelCode: activeAlloc.bed.room.floor.block.hostel.code,
          blockName: activeAlloc.bed.room.floor.block.name,
          blockCode: activeAlloc.bed.room.floor.block.code,
          floorName: activeAlloc.bed.room.floor.name,
          roomNumber: activeAlloc.bed.room.roomNumber,
          roomType: activeAlloc.bed.room.roomType,
          bedNumber: activeAlloc.bed.bedNumber,
          academicYear: activeAlloc.academicYear,
        }
      : null;

    // 2. Active Complaints
    const complaints = await prisma.complaint.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    const pendingComplaintsCount = await prisma.complaint.count({
      where: {
        studentId: student.id,
        status: { in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
      },
    });

    // 3. Active / Recent Leave Requests
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    });
    const pendingLeaveCount = await prisma.leaveRequest.count({
      where: {
        studentId: student.id,
        status: "SUBMITTED",
      },
    });

    // 4. Latest Notices
    const notices = await prisma.notice.findMany({
      where: {
        isPublished: true,
        OR: [
          { targetAudience: "ALL" },
          { targetAudience: "STUDENTS" },
        ],
      },
      orderBy: { publishDate: "desc" },
      take: 4,
    });

    // 5. Today's Mess Menu
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const todayDayName = days[new Date().getDay()];
    const todayMeals = await prisma.messMenu.findMany({
      where: { dayOfWeek: todayDayName },
    });

    // 6. Today's Attendance
    const todayDateStr = new Date().toISOString().split("T")[0];
    const todayAttendance = await prisma.attendance.findUnique({
      where: {
        studentId_date: {
          studentId: student.id,
          date: todayDateStr,
        },
      },
    });

    // 7. System Curfew Setting
    const curfewSetting = await prisma.systemSetting.findUnique({
      where: { key: "CURFEW_TIME" },
    });

    return successResponse({
      student: {
        id: student.id,
        name: student.name,
        studentId: student.studentId,
        course: student.course,
        department: student.department,
        yearOfStudy: student.yearOfStudy,
      },
      room: roomData,
      stats: {
        pendingComplaints: pendingComplaintsCount,
        pendingLeaves: pendingLeaveCount,
        todayAttendanceStatus: todayAttendance ? todayAttendance.status : "UNMARKED",
        curfewTime: curfewSetting?.value || "22:30",
      },
      recentComplaints: complaints,
      recentLeaves: leaveRequests,
      notices,
      todayMeals,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
