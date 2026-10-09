import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import {
  Bed,
  Student,
  RoomAllocation,
  Staff,
  Complaint,
  LeaveRequest,
  VisitorPass,
  Hostel,
  Block,
  Floor,
  Room,
  AuditLog,
} from "@/models";
import { sanitizeDoc } from "@/models/_utils";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Administrator privileges required");
    }

    await connectToDatabase();

    const now = new Date();

    // 1. Bed & Capacity Metrics
    const totalBeds = await Bed.countDocuments();
    const occupiedBeds = await Bed.countDocuments({ status: "OCCUPIED" });
    const availableBeds = await Bed.countDocuments({ status: "AVAILABLE" });
    const maintenanceBeds = await Bed.countDocuments({ status: "MAINTENANCE" });
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // 2. Student Enrollment & Allocations
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: "ACTIVE" });
    const allocatedStudents = await RoomAllocation.countDocuments({ status: "ACTIVE" });
    const unallocatedStudents = Math.max(0, activeStudents - allocatedStudents);

    // 3. Staff Breakdown
    const totalStaff = await Staff.countDocuments({ status: "ACTIVE" });
    const wardensCount = await Staff.countDocuments({ role: "WARDEN", status: "ACTIVE" });
    const securityCount = await Staff.countDocuments({ role: "SECURITY", status: "ACTIVE" });
    const adminCount = await Staff.countDocuments({ role: "ADMIN", status: "ACTIVE" });

    // 4. Complaints & Grievance SLA
    const totalComplaints = await Complaint.countDocuments();
    const openComplaints = await Complaint.countDocuments({
      status: { $in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
    });
    const urgentComplaints = await Complaint.countDocuments({
      priority: "URGENT",
      status: { $in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
    });

    // 5. Leave & Gate Activity
    const pendingLeaves = await LeaveRequest.countDocuments({ status: "SUBMITTED" });
    const activeOutingsNow = await LeaveRequest.countDocuments({
      status: "APPROVED",
      startDate: { $lte: now },
      endDate: { $gte: now },
    });
    const activeVisitorsOnCampus = await VisitorPass.countDocuments({
      status: "CHECKED_IN",
    });

    // 6. Multi-Hostel Comparison
    const hostels = await Hostel.find().sort({ name: 1 }).lean();

    const hostelComparison = await Promise.all(
      hostels.map(async (h) => {
        const blocks = await Block.find({ hostelId: h._id }).lean();
        const blockIds = blocks.map((b) => b._id);

        const floors = await Floor.find({ blockId: { $in: blockIds } }).lean();
        const floorIds = floors.map((f) => f._id);

        const rooms = await Room.find({ floorId: { $in: floorIds } }).lean();
        const roomIds = rooms.map((r) => r._id);

        const beds = await Bed.find({ roomId: { $in: roomIds } }).lean();

        let hOccupied = 0;
        beds.forEach((bed) => {
          if (bed.status === "OCCUPIED") hOccupied++;
        });

        const hBeds = beds.length;
        const hRooms = rooms.length;

        return {
          id: h._id,
          code: h.code,
          name: h.name,
          genderType: h.genderType,
          totalBlocks: blocks.length,
          totalRooms: hRooms,
          totalBeds: hBeds,
          occupiedBeds: hOccupied,
          availableBeds: Math.max(0, hBeds - hOccupied),
          occupancyRate: hBeds > 0 ? Math.round((hOccupied / hBeds) * 100) : 0,
        };
      })
    );

    // 7. Recent Audit Log Activity
    const recentAuditLogsRaw = await AuditLog.find().sort({ createdAt: -1 }).limit(6).lean();
    const recentAuditLogs = recentAuditLogsRaw.map(sanitizeDoc);

    return successResponse({
      overview: {
        totalBeds,
        occupiedBeds,
        availableBeds,
        maintenanceBeds,
        occupancyRate,
        totalStudents,
        activeStudents,
        allocatedStudents,
        unallocatedStudents,
        totalStaff,
        wardensCount,
        securityCount,
        adminCount,
        openComplaints,
        urgentComplaints,
        pendingLeaves,
        activeOutingsNow,
        activeVisitorsOnCampus,
      },
      hostelComparison,
      recentAuditLogs,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
