import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Administrator privileges required");
    }

    const now = new Date();

    // 1. Bed & Capacity Metrics
    const totalBeds = await prisma.bed.count();
    const occupiedBeds = await prisma.bed.count({ where: { status: "OCCUPIED" } });
    const availableBeds = await prisma.bed.count({ where: { status: "AVAILABLE" } });
    const maintenanceBeds = await prisma.bed.count({ where: { status: "MAINTENANCE" } });
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // 2. Student Enrollment & Allocations
    const totalStudents = await prisma.student.count();
    const activeStudents = await prisma.student.count({ where: { status: "ACTIVE" } });
    const allocatedStudents = await prisma.roomAllocation.count({ where: { status: "ACTIVE" } });
    const unallocatedStudents = Math.max(0, activeStudents - allocatedStudents);

    // 3. Staff Breakdown
    const totalStaff = await prisma.staff.count({ where: { status: "ACTIVE" } });
    const wardensCount = await prisma.staff.count({ where: { role: "WARDEN", status: "ACTIVE" } });
    const securityCount = await prisma.staff.count({ where: { role: "SECURITY", status: "ACTIVE" } });
    const adminCount = await prisma.staff.count({ where: { role: "ADMIN", status: "ACTIVE" } });

    // 4. Complaints & Grievance SLA
    const totalComplaints = await prisma.complaint.count();
    const openComplaints = await prisma.complaint.count({
      where: { status: { in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] } },
    });
    const urgentComplaints = await prisma.complaint.count({
      where: {
        priority: "URGENT",
        status: { in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
      },
    });

    // 5. Leave & Gate Activity
    const pendingLeaves = await prisma.leaveRequest.count({ where: { status: "SUBMITTED" } });
    const activeOutingsNow = await prisma.leaveRequest.count({
      where: {
        status: "APPROVED",
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
    const activeVisitorsOnCampus = await prisma.visitorPass.count({
      where: { status: "CHECKED_IN" },
    });

    // 6. Multi-Hostel Comparison
    const hostels = await prisma.hostel.findMany({
      include: {
        blocks: {
          include: {
            floors: {
              include: {
                rooms: {
                  include: {
                    beds: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const hostelComparison = hostels.map((h) => {
      let hRooms = 0;
      let hBeds = 0;
      let hOccupied = 0;

      h.blocks.forEach((b) => {
        b.floors.forEach((f) => {
          hRooms += f.rooms.length;
          f.rooms.forEach((r) => {
            hBeds += r.beds.length;
            r.beds.forEach((bed) => {
              if (bed.status === "OCCUPIED") hOccupied++;
            });
          });
        });
      });

      return {
        id: h.id,
        code: h.code,
        name: h.name,
        genderType: h.genderType,
        totalBlocks: h.blocks.length,
        totalRooms: hRooms,
        totalBeds: hBeds,
        occupiedBeds: hOccupied,
        availableBeds: Math.max(0, hBeds - hOccupied),
        occupancyRate: hBeds > 0 ? Math.round((hOccupied / hBeds) * 100) : 0,
      };
    });

    // 7. Recent Audit Log Activity
    const recentAuditLogs = await prisma.auditLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
    });

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
