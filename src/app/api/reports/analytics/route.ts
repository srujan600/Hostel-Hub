import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import {
  Bed,
  Room,
  Complaint,
  Attendance,
  Student,
  VisitorPass,
  LeaveRequest,
} from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "WARDEN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to access analytics");
    }

    await connectToDatabase();

    const now = new Date();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Parallelize all analytics and metrics queries in a single concurrent batch
    const [
      totalBeds,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      roomsByType,
      totalComplaints,
      resolvedComplaints,
      openComplaints,
      agingComplaints,
      complaintsByCategory,
      complaintsByPriority,
      attendanceRecords,
      totalVisitorPasses,
      activeVisitorsOnCampus,
      completedVisitorVisits,
      totalLeaves,
      approvedLeaves,
      rejectedLeaves,
      leavesByType,
    ] = await Promise.all([
      Bed.countDocuments(),
      Bed.countDocuments({ status: "OCCUPIED" }),
      Bed.countDocuments({ status: "AVAILABLE" }),
      Bed.countDocuments({ status: "MAINTENANCE" }),
      Room.aggregate([
        {
          $group: {
            _id: "$roomType",
            count: { $sum: 1 },
            capacity: { $sum: "$capacity" },
            occupiedBeds: { $sum: "$occupiedBeds" },
          },
        },
      ]),
      Complaint.countDocuments(),
      Complaint.countDocuments({
        status: { $in: ["RESOLVED", "CLOSED"] },
      }),
      Complaint.countDocuments({
        status: { $in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
      }),
      Complaint.countDocuments({
        status: { $in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
        createdAt: { $lte: fortyEightHoursAgo },
      }),
      Complaint.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 },
          },
        },
      ]),
      Attendance.find({ date: { $gte: thirtyDaysAgo } }).lean(),
      VisitorPass.countDocuments(),
      VisitorPass.countDocuments({
        status: "CHECKED_IN",
      }),
      VisitorPass.countDocuments({
        status: "CHECKED_OUT",
      }),
      LeaveRequest.countDocuments(),
      LeaveRequest.countDocuments({ status: "APPROVED" }),
      LeaveRequest.countDocuments({ status: "REJECTED" }),
      LeaveRequest.aggregate([
        {
          $group: {
            _id: "$leaveType",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const resolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 100;
    const approvalRate = totalLeaves > 0 ? Math.round((approvedLeaves / totalLeaves) * 100) : 0;

    // Student identity enrichment for attendance
    const studentIds = Array.from(new Set(attendanceRecords.map((a) => a.studentId)));
    const students = await Student.find({ _id: { $in: studentIds } })
      .select("name studentId")
      .lean();

    const studentMap = new Map(
      students.map((s) => [s._id, { id: s._id, name: s.name, studentId: s.studentId }])
    );

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
          absenceCounts[a.studentId] = { student: studentMap.get(a.studentId) || null, count: 0 };
        }
        absenceCounts[a.studentId].count++;
      }
    });

    const repeatAbsentees = Object.values(absenceCounts)
      .filter((s) => s.count >= 2)
      .sort((a, b) => b.count - a.count);

    return successResponse({
      occupancy: {
        totalBeds,
        occupiedBeds,
        availableBeds,
        maintenanceBeds,
        occupancyRate,
        byType: roomsByType.map((r) => ({
          type: r._id,
          roomCount: r.count,
          capacity: r.capacity || 0,
          occupied: r.occupiedBeds || 0,
          pct: r.capacity ? Math.round(((r.occupiedBeds || 0) / r.capacity) * 100) : 0,
        })),
      },
      complaints: {
        total: totalComplaints,
        resolved: resolvedComplaints,
        open: openComplaints,
        agingOver48h: agingComplaints,
        resolutionRate,
        byCategory: complaintsByCategory.map((c) => ({ category: c._id, count: c.count })),
        byPriority: complaintsByPriority.map((c) => ({ priority: c._id, count: c.count })),
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
        byType: leavesByType.map((l) => ({ type: l._id, count: l.count })),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
