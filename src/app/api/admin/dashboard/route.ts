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

    // 1. Parallelize ALL telemetry counts and hierarchy queries into a single concurrent batch
    const [
      totalBeds,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      totalStudents,
      activeStudents,
      allocatedStudents,
      totalStaff,
      wardensCount,
      securityCount,
      adminCount,
      openComplaints,
      urgentComplaints,
      pendingLeaves,
      activeOutingsNow,
      activeVisitorsOnCampus,
      hostels,
      allBlocks,
      allFloors,
      allRooms,
      allBeds,
      recentAuditLogsRaw,
    ] = await Promise.all([
      Bed.countDocuments(),
      Bed.countDocuments({ status: "OCCUPIED" }),
      Bed.countDocuments({ status: "AVAILABLE" }),
      Bed.countDocuments({ status: "MAINTENANCE" }),
      Student.countDocuments(),
      Student.countDocuments({ status: "ACTIVE" }),
      RoomAllocation.countDocuments({ status: "ACTIVE" }),
      Staff.countDocuments({ status: "ACTIVE" }),
      Staff.countDocuments({ role: "WARDEN", status: "ACTIVE" }),
      Staff.countDocuments({ role: "SECURITY", status: "ACTIVE" }),
      Staff.countDocuments({ role: "ADMIN", status: "ACTIVE" }),
      Complaint.countDocuments({
        status: { $in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
      }),
      Complaint.countDocuments({
        priority: "URGENT",
        status: { $in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
      }),
      LeaveRequest.countDocuments({ status: "SUBMITTED" }),
      LeaveRequest.countDocuments({
        status: "APPROVED",
        startDate: { $lte: now },
        endDate: { $gte: now },
      }),
      VisitorPass.countDocuments({
        status: "CHECKED_IN",
      }),
      Hostel.find().sort({ name: 1 }).lean(),
      Block.find().lean(),
      Floor.find().lean(),
      Room.find().lean(),
      Bed.find().lean(),
      AuditLog.find().sort({ createdAt: -1 }).limit(6).lean(),
    ]);

    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const unallocatedStudents = Math.max(0, activeStudents - allocatedStudents);

    // Index blocks, floors, rooms, and beds in memory for instant multi-hostel computation
    const blocksByHostel = new Map<string, string[]>();
    allBlocks.forEach((b) => {
      const hId = String(b.hostelId);
      if (!blocksByHostel.has(hId)) blocksByHostel.set(hId, []);
      blocksByHostel.get(hId)!.push(String(b._id));
    });

    const floorsByBlock = new Map<string, string[]>();
    allFloors.forEach((f) => {
      const bId = String(f.blockId);
      if (!floorsByBlock.has(bId)) floorsByBlock.set(bId, []);
      floorsByBlock.get(bId)!.push(String(f._id));
    });

    const roomsByFloor = new Map<string, any[]>();
    allRooms.forEach((r) => {
      const fId = String(r.floorId);
      if (!roomsByFloor.has(fId)) roomsByFloor.set(fId, []);
      roomsByFloor.get(fId)!.push(r);
    });

    const bedsByRoom = new Map<string, any[]>();
    allBeds.forEach((bed) => {
      const rId = String(bed.roomId);
      if (!bedsByRoom.has(rId)) bedsByRoom.set(rId, []);
      bedsByRoom.get(rId)!.push(bed);
    });

    const hostelComparison = hostels.map((h) => {
      const bIds = blocksByHostel.get(String(h._id)) || [];
      const fIds = bIds.flatMap((bId) => floorsByBlock.get(bId) || []);
      const hRooms = fIds.flatMap((fId) => roomsByFloor.get(fId) || []);
      const hBeds = hRooms.flatMap((r) => bedsByRoom.get(String(r._id)) || []);

      let hOccupied = 0;
      hBeds.forEach((bed) => {
        if (bed.status === "OCCUPIED") hOccupied++;
      });

      const totalBedsCount = hBeds.length;
      return {
        id: h._id,
        code: h.code,
        name: h.name,
        genderType: h.genderType,
        totalBlocks: bIds.length,
        totalRooms: hRooms.length,
        totalBeds: totalBedsCount,
        occupiedBeds: hOccupied,
        availableBeds: Math.max(0, totalBedsCount - hOccupied),
        occupancyRate: totalBedsCount > 0 ? Math.round((hOccupied / totalBedsCount) * 100) : 0,
      };
    });

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
