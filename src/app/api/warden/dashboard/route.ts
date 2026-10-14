import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import {
  Bed,
  LeaveRequest,
  Complaint,
  Attendance,
  VisitorPass,
  Student,
  RoomAllocation,
  Room,
  Floor,
  Block,
  SystemSetting,
  Staff,
  Visitor,
} from "@/models";
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

    // 1. Stage 1: Parallel fetch all primary telemetry and collection queries
    const todayStr = new Date().toISOString().split("T")[0];

    const [
      [totalBeds, occupiedBeds, vacantBeds, maintenanceBeds],
      pendingLeaves,
      openComplaints,
      totalOpenComplaints,
      todayAttendanceRecords,
      todayVisitors,
      residents,
      curfew,
    ] = await Promise.all([
      Promise.all([
        Bed.countDocuments(),
        Bed.countDocuments({ status: "OCCUPIED" }),
        Bed.countDocuments({ status: "AVAILABLE" }),
        Bed.countDocuments({ status: "MAINTENANCE" }),
      ]),
      LeaveRequest.find({ status: "SUBMITTED" }).sort({ createdAt: -1 }).lean(),
      Complaint.find({
        status: { $in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
      })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      Complaint.countDocuments({
        status: { $in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
      }),
      Attendance.find({ date: todayStr }).lean(),
      VisitorPass.find({
        status: { $in: ["PENDING", "APPROVED", "CHECKED_IN"] },
      })
        .sort({ expectedEntryTime: -1 })
        .lean(),
      Student.find().sort({ name: 1 }).limit(8).lean(),
      SystemSetting.findOne({ key: "CURFEW_TIME" }).lean(),
    ]);

    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const presentCount = todayAttendanceRecords.filter((a) => a.status === "PRESENT").length;
    const absentCount = todayAttendanceRecords.filter((a) => a.status === "ABSENT").length;
    const excusedCount = todayAttendanceRecords.filter((a) => a.status === "EXCUSED").length;

    // 2. Stage 2: Parallel fetch enrichment entities for leaves, complaints, visitors, and residents
    const leaveStudentIds = pendingLeaves.map((l) => l.studentId);
    const cStudentIds = openComplaints.map((c) => c.studentId);
    const cStaffIds = openComplaints.map((c) => c.assignedStaffId).filter((id): id is string => Boolean(id));
    const visitorIds = todayVisitors.map((v) => v.visitorId);
    const rStudentIds = residents.map((r) => r._id);

    const [leaveStudents, cStudents, cStaffs, visitors, rAllocations] = await Promise.all([
      Student.find(
        { _id: { $in: leaveStudentIds } },
        { _id: 1, name: 1, studentId: 1, course: 1 }
      ).lean(),
      Student.find({ _id: { $in: cStudentIds } }).select("_id name studentId").lean(),
      Staff.find({ _id: { $in: cStaffIds } }).select("_id name").lean(),
      Visitor.find({ _id: { $in: visitorIds } }).lean(),
      RoomAllocation.find({
        studentId: { $in: rStudentIds },
        status: "ACTIVE",
      }).lean(),
    ]);

    const leaveStudentMap = new Map(
      leaveStudents.map((s) => [s._id, { id: s._id, name: s.name, studentId: s.studentId, course: s.course }])
    );
    const enrichedLeaves = pendingLeaves.map((l) => ({
      ...l,
      id: l._id,
      student: leaveStudentMap.get(l.studentId) || null,
    }));

    const cStudentMap = new Map(cStudents.map((s: any) => [s._id, { name: s.name, studentId: s.studentId }]));
    const cStaffMap = new Map(cStaffs.map((st: any) => [st._id, { name: st.name }]));

    const enrichedComplaints = openComplaints.map((c) => ({
      ...c,
      id: c._id,
      student: cStudentMap.get(c.studentId) || null,
      assignedStaff: c.assignedStaffId ? cStaffMap.get(c.assignedStaffId) || null : null,
    }));

    // 3. Stage 3: Nested relations for visitors & resident allocations
    const vStudentIds = visitors.map((v) => v.studentId);
    const rBedIds = rAllocations.map((a) => a.bedId);

    const [vStudents, rBeds] = await Promise.all([
      Student.find({ _id: { $in: vStudentIds } }, { _id: 1, name: 1, studentId: 1 }).lean(),
      Bed.find({ _id: { $in: rBedIds } }).lean(),
    ]);

    const vStudentMap = new Map(vStudents.map((s: any) => [s._id, { name: s.name, studentId: s.studentId }]));
    const visitorMap = new Map(
      visitors.map((v: any) => [
        v._id,
        {
          ...v,
          id: v._id,
          student: vStudentMap.get(v.studentId) || null,
        },
      ])
    );

    const enrichedVisitors = todayVisitors.map((vp: any) => ({
      ...vp,
      id: vp._id,
      visitor: visitorMap.get(vp.visitorId) || null,
    }));

    const rRoomIds = rBeds.map((b) => b.roomId);
    const rRooms = await Room.find({ _id: { $in: rRoomIds } }).lean();
    const rFloorIds = rRooms.map((r) => r.floorId);
    const rFloors = await Floor.find({ _id: { $in: rFloorIds } }).lean();
    const rBlockIds = rFloors.map((f) => f.blockId);
    const rBlocks = await Block.find({ _id: { $in: rBlockIds } }).lean();

    const rBedMap = new Map(rBeds.map((b) => [b._id, b]));
    const rRoomMap = new Map(rRooms.map((r) => [r._id, r]));
    const rFloorMap = new Map(rFloors.map((f) => [f._id, f]));
    const rBlockMap = new Map(rBlocks.map((b) => [b._id, b]));
    const rAllocMap = new Map(rAllocations.map((a) => [a.studentId, a]));

    const residentList = residents.map((r) => {
      const alloc = rAllocMap.get(r._id);
      const bed = alloc ? rBedMap.get(alloc.bedId) : null;
      const room = bed ? rRoomMap.get(bed.roomId) : null;
      const floor = room ? rFloorMap.get(room.floorId) : null;
      const block = floor ? rBlockMap.get(floor.blockId) : null;

      return {
        id: r._id,
        name: r.name,
        studentId: r.studentId,
        course: r.course,
        phone: r.phone,
        status: r.status,
        room: alloc && room && bed ? `${room.roomNumber}-${bed.bedNumber}` : "Unallocated",
        block: block ? block.code : "N/A",
      };
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
      pendingLeaves: enrichedLeaves,
      openComplaints: enrichedComplaints,
      todayVisitors: enrichedVisitors,
      residentList,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
