import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Room, Bed, Complaint, LeaveRequest, Attendance, Student, VisitorPass } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Warden authorization required");
    }

    await connectToDatabase();

    const todayStr = new Date().toISOString().split("T")[0];
    const now = new Date();

    // 1. Bed & Room Occupancy
    const [totalRooms, totalBeds, occupiedBeds, availableBeds, maintenanceBeds] = await Promise.all([
      Room.countDocuments(),
      Bed.countDocuments(),
      Bed.countDocuments({ status: "OCCUPIED" }),
      Bed.countDocuments({ status: "AVAILABLE" }),
      Bed.countDocuments({ status: "MAINTENANCE" }),
    ]);

    const bedsByTypeRaw = await Room.aggregate([
      {
        $group: {
          _id: "$roomType",
          count: { $sum: 1 },
          capacity: { $sum: "$capacity" },
          occupiedBeds: { $sum: "$occupiedBeds" },
        },
      },
    ]);
    const bedsByType = bedsByTypeRaw.map((b) => ({
      roomType: b._id,
      _count: { id: b.count },
      _sum: { capacity: b.capacity, occupiedBeds: b.occupiedBeds },
    }));

    // 2. Complaint Analytics
    const totalComplaints = await Complaint.countDocuments();
    const complaintsByStatusRaw = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const complaintsByCategoryRaw = await Complaint.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const complaintsByPriorityRaw = await Complaint.aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);

    const statusMap: Record<string, number> = {};
    complaintsByStatusRaw.forEach((c) => {
      statusMap[c._id] = c.count;
    });

    const resolvedCount = (statusMap["RESOLVED"] || 0) + (statusMap["CLOSED"] || 0);
    const resolutionRate = totalComplaints > 0 ? Math.round((resolvedCount / totalComplaints) * 100) : 100;

    // 3. Leave Requests
    const totalLeaves = await LeaveRequest.countDocuments();
    const leavesByStatusRaw = await LeaveRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const leavesByTypeRaw = await LeaveRequest.aggregate([
      { $group: { _id: "$leaveType", count: { $sum: 1 } } },
    ]);

    const activeOutingsNow = await LeaveRequest.countDocuments({
      status: "APPROVED",
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    // 4. Today's Attendance
    const todayAttendance = await Attendance.find({ date: todayStr }).lean();
    const totalStudents = await Student.countDocuments({ status: "ACTIVE" });

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

    const [totalVisitorPasses, activeVisitorsOnCampus] = await Promise.all([
      VisitorPass.countDocuments({
        visitDate: { $gte: todayStart, $lt: tomorrowStart },
      }),
      VisitorPass.countDocuments({ status: "CHECKED_IN" }),
    ]);

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
        byStatus: complaintsByStatusRaw.map((c) => ({ status: c._id, count: c.count })),
        byCategory: complaintsByCategoryRaw.map((c) => ({ category: c._id, count: c.count })),
        byPriority: complaintsByPriorityRaw.map((c) => ({ priority: c._id, count: c.count })),
      },
      leaves: {
        total: totalLeaves,
        activeOutingsNow,
        byStatus: leavesByStatusRaw.map((l) => ({ status: l._id, count: l.count })),
        byType: leavesByTypeRaw.map((l) => ({ type: l._id, count: l.count })),
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
