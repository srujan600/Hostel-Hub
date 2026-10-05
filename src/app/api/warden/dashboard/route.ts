import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Warden authorization required");
    }

    // 1. Bed Occupancy Telemetry
    const totalBeds = await prisma.bed.count();
    const occupiedBeds = await prisma.bed.count({
      where: { status: "OCCUPIED" },
    });
    const vacantBeds = await prisma.bed.count({
      where: { status: "AVAILABLE" },
    });
    const maintenanceBeds = await prisma.bed.count({
      where: { status: "MAINTENANCE" },
    });
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // 2. Pending Leave & Out-Pass Count
    const pendingLeaves = await prisma.leaveRequest.findMany({
      where: { status: "SUBMITTED" },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
            course: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Open Maintenance Complaints
    const openComplaints = await prisma.complaint.findMany({
      where: {
        status: { in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
      },
      include: {
        student: { select: { name: true, studentId: true } },
        assignedStaff: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    const totalOpenComplaints = await prisma.complaint.count({
      where: { status: { in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] } },
    });

    // 4. Today's Attendance Summary
    const todayStr = new Date().toISOString().split("T")[0];
    const todayAttendanceRecords = await prisma.attendance.findMany({
      where: { date: todayStr },
      include: { student: { select: { name: true, studentId: true } } },
    });
    const presentCount = todayAttendanceRecords.filter((a) => a.status === "PRESENT").length;
    const absentCount = todayAttendanceRecords.filter((a) => a.status === "ABSENT").length;
    const excusedCount = todayAttendanceRecords.filter((a) => a.status === "EXCUSED").length;

    // 5. Today's Visitors
    const todayVisitors = await prisma.visitorPass.findMany({
      where: {
        status: { in: ["PENDING", "APPROVED", "CHECKED_IN"] },
      },
      include: {
        visitor: {
          include: {
            student: { select: { name: true, studentId: true } },
          },
        },
      },
      orderBy: { expectedEntryTime: "desc" },
    });

    // 6. Recent Active Residents
    const residents = await prisma.student.findMany({
      take: 8,
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
                        block: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const residentList = residents.map((r) => {
      const alloc = r.allocations[0];
      return {
        id: r.id,
        name: r.name,
        studentId: r.studentId,
        course: r.course,
        phone: r.phone,
        status: r.status,
        room: alloc
          ? `${alloc.bed.room.roomNumber}-${alloc.bed.bedNumber}`
          : "Unallocated",
        block: alloc ? alloc.bed.room.floor.block.code : "N/A",
      };
    });

    // 7. System Curfew
    const curfew = await prisma.systemSetting.findUnique({
      where: { key: "CURFEW_TIME" },
    });

    return successResponse({
      telemetry: {
        totalBeds,
        occupiedBeds,
        vacantBeds,
        maintenanceBeds,
        occupancyRate,
        pendingLeavesCount: pendingLeaves.length,
        openComplaintsCount: totalOpenComplaints,
        todayPresentCount: presentCount,
        todayAbsentCount: absentCount,
        todayExcusedCount: excusedCount,
        curfewTime: curfew?.value || "22:30",
      },
      pendingLeaves,
      openComplaints,
      todayVisitors,
      residentList,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
