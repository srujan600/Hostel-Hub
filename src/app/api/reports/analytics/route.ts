import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "WARDEN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to access analytics");
    }

    const now = new Date();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // 1. Occupancy & Bed Distribution
    const totalBeds = await prisma.bed.count();
    const occupiedBeds = await prisma.bed.count({ where: { status: "OCCUPIED" } });
    const availableBeds = await prisma.bed.count({ where: { status: "AVAILABLE" } });
    const maintenanceBeds = await prisma.bed.count({ where: { status: "MAINTENANCE" } });
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    const roomsByType = await prisma.room.groupBy({
      by: ["roomType"],
      _count: { id: true },
      _sum: { capacity: true, occupiedBeds: true },
    });

    // 2. Complaint & Maintenance SLA Analytics
    const totalComplaints = await prisma.complaint.count();
    const resolvedComplaints = await prisma.complaint.count({
      where: { status: { in: ["RESOLVED", "CLOSED"] } },
    });
    const openComplaints = await prisma.complaint.count({
      where: { status: { in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] } },
    });
    const agingComplaints = await prisma.complaint.count({
      where: {
        status: { in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
        createdAt: { lte: fortyEightHoursAgo },
      },
    });

    const resolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 100;

    const complaintsByCategory = await prisma.complaint.groupBy({
      by: ["category"],
      _count: { id: true },
    });

    const complaintsByPriority = await prisma.complaint.groupBy({
      by: ["priority"],
      _count: { id: true },
    });

    // 3. Attendance & Curfew Compliance (Last 30 Days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const attendanceRecords = await prisma.attendance.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
          },
        },
      },
    });

    const totalAttendanceMarks = attendanceRecords.length;
    const presentMarks = attendanceRecords.filter((a) => a.status === "PRESENT").length;
    const absentMarks = attendanceRecords.filter((a) => a.status === "ABSENT").length;
    const lateMarks = attendanceRecords.filter((a) => a.status === "LATE").length;
    const excusedMarks = attendanceRecords.filter((a) => a.status === "EXCUSED").length;

    const attendanceCompliance =
      totalAttendanceMarks > 0
        ? Math.round(((presentMarks + lateMarks + excusedMarks) / totalAttendanceMarks) * 100)
        : 100;

    // Repeat Absentees (students with >= 2 absences in last 30 days)
    const absenceCounts: Record<string, { student: any; count: number }> = {};
    attendanceRecords.forEach((a) => {
      if (a.status === "ABSENT") {
        if (!absenceCounts[a.studentId]) {
          absenceCounts[a.studentId] = { student: a.student, count: 0 };
        }
        absenceCounts[a.studentId].count++;
      }
    });

    const repeatAbsentees = Object.values(absenceCounts)
      .filter((s) => s.count >= 2)
      .sort((a, b) => b.count - a.count);

    // 4. Visitor Gate Analytics
    const totalVisitorPasses = await prisma.visitorPass.count();
    const activeVisitorsOnCampus = await prisma.visitorPass.count({
      where: { status: "CHECKED_IN" },
    });
    const completedVisitorVisits = await prisma.visitorPass.count({
      where: { status: "CHECKED_OUT" },
    });

    // 5. Leave & Outings Analytics
    const totalLeaves = await prisma.leaveRequest.count();
    const approvedLeaves = await prisma.leaveRequest.count({ where: { status: "APPROVED" } });
    const rejectedLeaves = await prisma.leaveRequest.count({ where: { status: "REJECTED" } });
    const approvalRate = totalLeaves > 0 ? Math.round((approvedLeaves / totalLeaves) * 100) : 0;

    const leavesByType = await prisma.leaveRequest.groupBy({
      by: ["leaveType"],
      _count: { id: true },
    });

    return successResponse({
      occupancy: {
        totalBeds,
        occupiedBeds,
        availableBeds,
        maintenanceBeds,
        occupancyRate,
        byType: roomsByType.map((r) => ({
          type: r.roomType,
          roomCount: r._count.id,
          capacity: r._sum.capacity || 0,
          occupied: r._sum.occupiedBeds || 0,
          pct: r._sum.capacity ? Math.round(((r._sum.occupiedBeds || 0) / r._sum.capacity) * 100) : 0,
        })),
      },
      complaints: {
        total: totalComplaints,
        resolved: resolvedComplaints,
        open: openComplaints,
        agingOver48h: agingComplaints,
        resolutionRate,
        byCategory: complaintsByCategory.map((c) => ({ category: c.category, count: c._count.id })),
        byPriority: complaintsByPriority.map((c) => ({ priority: c.priority, count: c._count.id })),
      },
      attendance: {
        totalMarks: totalAttendanceMarks,
        presentMarks,
        absentMarks,
        lateMarks,
        excusedMarks,
        complianceRate: attendanceCompliance,
        repeatAbsentees,
      },
      visitors: {
        totalPasses: totalVisitorPasses,
        activeOnCampus: activeVisitorsOnCampus,
        completedVisits: completedVisitorVisits,
      },
      leaves: {
        total: totalLeaves,
        approved: approvedLeaves,
        rejected: rejectedLeaves,
        approvalRate,
        byType: leavesByType.map((l) => ({ type: l.leaveType, count: l._count.id })),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
