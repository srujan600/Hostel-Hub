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

    const todayStr = new Date().toISOString().split("T")[0];
    const now = new Date();

    // 1. Bed & Room Occupancy
    const totalRooms = await prisma.room.count();
    const totalBeds = await prisma.bed.count();
    const occupiedBeds = await prisma.bed.count({
      where: { status: "OCCUPIED" },
    });
    const availableBeds = await prisma.bed.count({
      where: { status: "AVAILABLE" },
    });
    const maintenanceBeds = await prisma.bed.count({
      where: { status: "MAINTENANCE" },
    });

    const bedsByType = await prisma.room.groupBy({
      by: ["roomType"],
      _count: { id: true },
      _sum: { capacity: true, occupiedBeds: true },
    });

    // 2. Complaint Analytics
    const totalComplaints = await prisma.complaint.count();
    const complaintsByStatus = await prisma.complaint.groupBy({
      by: ["status"],
      _count: { id: true },
    });
    const complaintsByCategory = await prisma.complaint.groupBy({
      by: ["category"],
      _count: { id: true },
    });
    const complaintsByPriority = await prisma.complaint.groupBy({
      by: ["priority"],
      _count: { id: true },
    });

    const statusMap: Record<string, number> = {};
    complaintsByStatus.forEach((c) => {
      statusMap[c.status] = c._count.id;
    });

    const resolvedCount = (statusMap["RESOLVED"] || 0) + (statusMap["CLOSED"] || 0);
    const resolutionRate = totalComplaints > 0 ? Math.round((resolvedCount / totalComplaints) * 100) : 100;

    // 3. Leave Requests
    const totalLeaves = await prisma.leaveRequest.count();
    const leavesByStatus = await prisma.leaveRequest.groupBy({
      by: ["status"],
      _count: { id: true },
    });
    const leavesByType = await prisma.leaveRequest.groupBy({
      by: ["leaveType"],
      _count: { id: true },
    });

    // Active outings right now (startDate <= now <= endDate and status == 'APPROVED')
    const activeOutingsNow = await prisma.leaveRequest.count({
      where: {
        status: "APPROVED",
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    // 4. Today's Attendance
    const todayAttendance = await prisma.attendance.findMany({
      where: { date: todayStr },
    });
    const totalStudents = await prisma.student.count({
      where: { status: "ACTIVE" },
    });

    let presentToday = 0;
    let absentToday = 0;
    let lateToday = 0;
    let excusedToday = 0;

    todayAttendance.forEach((a) => {
      if (a.status === "PRESENT") presentToday++;
      else if (a.status === "ABSENT") absentToday++;
      else if (a.status === "LATE") lateToday++;
      else if (a.status === "EXCUSED") excusedToday++;
    });

    const markedCount = todayAttendance.length;
    const attendanceCompliance =
      totalStudents > 0 ? Math.round(((presentToday + lateToday + excusedToday) / totalStudents) * 100) : 100;

    // 5. Visitor Activity
    const todayStart = new Date(todayStr);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const totalVisitorPasses = await prisma.visitorPass.count({
      where: {
        visitDate: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    });

    const activeVisitorsOnCampus = await prisma.visitorPass.count({
      where: {
        status: "CHECKED_IN",
      },
    });

    return successResponse({
      occupancy: {
        totalRooms,
        totalBeds,
        occupiedBeds,
        availableBeds,
        maintenanceBeds,
        occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        byType: bedsByType,
      },
      complaints: {
        total: totalComplaints,
        resolutionRate,
        byStatus: complaintsByStatus.map((c) => ({ status: c.status, count: c._count.id })),
        byCategory: complaintsByCategory.map((c) => ({ category: c.category, count: c._count.id })),
        byPriority: complaintsByPriority.map((c) => ({ priority: c.priority, count: c._count.id })),
      },
      leaves: {
        total: totalLeaves,
        activeOutingsNow,
        byStatus: leavesByStatus.map((l) => ({ status: l.status, count: l._count.id })),
        byType: leavesByType.map((l) => ({ type: l.leaveType, count: l._count.id })),
      },
      attendance: {
        date: todayStr,
        totalResidents: totalStudents,
        markedCount,
        presentCount: presentToday,
        absentCount: absentToday,
        lateCount: lateToday,
        excusedCount: excusedToday,
        complianceRate: attendanceCompliance,
      },
      visitors: {
        todayPassesCount: totalVisitorPasses,
        activeOnCampus: activeVisitorsOnCampus,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
