import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import {
  Bed,
  Room,
  Floor,
  Block,
  Hostel,
  RoomAllocation,
  Student,
  Complaint,
  Staff,
  Attendance,
  VisitorPass,
  Visitor,
  LeaveRequest,
} from "@/models";
import { requireAuth } from "@/lib/auth";
import { ForbiddenError, BadRequestError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "WARDEN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to export reports");
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "occupancy";
    const dateStr = new Date().toISOString().split("T")[0];

    let csvContent = "";
    let filename = `hostelhub_${type}_report_${dateStr}.csv`;

    if (type === "occupancy") {
      const beds = await Bed.find().lean();
      const roomIds = beds.map((b) => b.roomId);
      const rooms = await Room.find({ _id: { $in: roomIds } }).lean();
      const roomMap = new Map(rooms.map((r) => [r._id, r]));

      const floorIds = rooms.map((r) => r.floorId);
      const floors = await Floor.find({ _id: { $in: floorIds } }).lean();
      const floorMap = new Map(floors.map((f) => [f._id, f]));

      const blockIds = floors.map((f) => f.blockId);
      const blocks = await Block.find({ _id: { $in: blockIds } }).lean();
      const blockMap = new Map(blocks.map((b) => [b._id, b]));

      const hostelIds = blocks.map((b) => b.hostelId);
      const hostels = await Hostel.find({ _id: { $in: hostelIds } }).lean();
      const hostelMap = new Map(hostels.map((h) => [h._id, h]));

      const bedIds = beds.map((b) => b._id);
      const activeAllocs = await RoomAllocation.find({ bedId: { $in: bedIds }, status: "ACTIVE" }).lean();
      const allocMap = new Map(activeAllocs.map((a) => [a.bedId, a]));

      const studentIds = activeAllocs.map((a) => a.studentId);
      const students = await Student.find({ _id: { $in: studentIds } }).lean();
      const studentMap = new Map(students.map((s) => [s._id, s]));

      const sortedBeds = [...beds].sort((a, b) => {
        const roomA = roomMap.get(a.roomId)?.roomNumber || "";
        const roomB = roomMap.get(b.roomId)?.roomNumber || "";
        if (roomA !== roomB) return roomA.localeCompare(roomB, undefined, { numeric: true });
        return a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true });
      });

      const rows = [
        ["Hostel", "Block", "Floor", "Room Number", "Room Type", "Bed Number", "Bed Status", "Resident Name", "Resident Roll ID", "Allocated Date"],
        ...sortedBeds.map((b) => {
          const room = roomMap.get(b.roomId);
          const floor = room ? floorMap.get(room.floorId) : null;
          const block = floor ? blockMap.get(floor.blockId) : null;
          const hostel = block ? hostelMap.get(block.hostelId) : null;
          const alloc = allocMap.get(b._id);
          const student = alloc ? studentMap.get(alloc.studentId) : null;

          return [
            `"${hostel?.name || ""}"`,
            `"${block?.name || ""}"`,
            `"${floor?.name || ""}"`,
            `"${room?.roomNumber || ""}"`,
            `"${room?.roomType || ""}"`,
            `"${b.bedNumber}"`,
            `"${b.status}"`,
            `"${student?.name || ""}"`,
            `"${student?.studentId || ""}"`,
            `"${alloc ? new Date(alloc.allocatedAt).toLocaleDateString() : ""}"`,
          ];
        }),
      ];
      csvContent = rows.map((r) => r.join(",")).join("\n");
    } else if (type === "complaints") {
      const complaints = await Complaint.find().sort({ createdAt: -1 }).lean();
      const studentIds = complaints.map((c) => c.studentId);
      const students = await Student.find({ _id: { $in: studentIds } }).lean();
      const studentMap = new Map(students.map((s) => [s._id, s]));

      const staffIds = complaints.map((c) => c.assignedStaffId).filter((id): id is string => Boolean(id));
      const staffList = await Staff.find({ _id: { $in: staffIds } }).lean();
      const staffMap = new Map(staffList.map((s: any) => [s._id, s]));

      const rows = [
        ["Ticket Code", "Title", "Category", "Priority", "Status", "Resident Name", "Roll ID", "Location", "Assigned Staff", "Created Date", "Resolved Date"],
        ...complaints.map((c: any) => {
          const student = studentMap.get(c.studentId) as any;
          const staff = c.assignedStaffId ? (staffMap.get(c.assignedStaffId) as any) : null;
          return [
            `"${c.complaintCode}"`,
            `"${c.title.replace(/"/g, '""')}"`,
            `"${c.category}"`,
            `"${c.priority}"`,
            `"${c.status}"`,
            `"${student?.name || ""}"`,
            `"${student?.studentId || ""}"`,
            `"${c.location}"`,
            `"${staff?.name || "Unassigned"}"`,
            `"${new Date(c.createdAt).toLocaleDateString()}"`,
            `"${c.resolvedAt ? new Date(c.resolvedAt as any).toLocaleDateString() : ""}"`,
          ];
        }),
      ];
      csvContent = rows.map((r) => r.join(",")).join("\n");
    } else if (type === "attendance") {
      const records = await Attendance.find().sort({ date: -1 }).limit(500).lean();
      const studentIds = records.map((a) => a.studentId);
      const students = await Student.find({ _id: { $in: studentIds } }).lean();
      const studentMap = new Map(students.map((s) => [s._id, s]));

      const rows = [
        ["Date", "Resident Name", "Roll ID", "Status", "Remarks"],
        ...records.map((a) => {
          const student = studentMap.get(a.studentId);
          return [
            `"${a.date}"`,
            `"${student?.name || ""}"`,
            `"${student?.studentId || ""}"`,
            `"${a.status}"`,
            `"${(a.remarks || "").replace(/"/g, '""')}"`,
          ];
        }),
      ];
      csvContent = rows.map((r) => r.join(",")).join("\n");
    } else if (type === "visitors") {
      const passes = await VisitorPass.find().sort({ visitDate: -1 }).lean();
      const visitorIds = passes.map((p) => p.visitorId);
      const visitors = await Visitor.find({ _id: { $in: visitorIds } }).lean();
      const visitorMap = new Map(visitors.map((v) => [v._id, v]));

      const studentIds = visitors.map((v) => v.studentId);
      const students = await Student.find({ _id: { $in: studentIds } }).lean();
      const studentMap = new Map(students.map((s) => [s._id, s]));

      const rows = [
        ["Pass Code", "Visitor Name", "Phone", "Relationship", "Host Resident", "Roll ID", "Visit Date", "Status", "Gate In", "Gate Out"],
        ...passes.map((p) => {
          const visitor = visitorMap.get(p.visitorId);
          const student = visitor ? studentMap.get(visitor.studentId) : null;
          return [
            `"${p.passCode}"`,
            `"${visitor?.name || ""}"`,
            `"${visitor?.phone || ""}"`,
            `"${visitor?.relationship || ""}"`,
            `"${student?.name || ""}"`,
            `"${student?.studentId || ""}"`,
            `"${new Date(p.visitDate).toLocaleDateString()}"`,
            `"${p.status}"`,
            `"${p.actualEntryTime ? new Date(p.actualEntryTime).toLocaleTimeString() : ""}"`,
            `"${p.actualExitTime ? new Date(p.actualExitTime).toLocaleTimeString() : ""}"`,
          ];
        }),
      ];
      csvContent = rows.map((r) => r.join(",")).join("\n");
    } else if (type === "leaves") {
      const leaves = await LeaveRequest.find().sort({ createdAt: -1 }).lean();
      const studentIds = leaves.map((l) => l.studentId);
      const students = await Student.find({ _id: { $in: studentIds } }).lean();
      const studentMap = new Map(students.map((s) => [s._id, s]));

      const rows = [
        ["Request Code", "Resident Name", "Roll ID", "Leave Type", "Destination", "Start Date", "End Date", "Status", "Reason"],
        ...leaves.map((l) => {
          const student = studentMap.get(l.studentId);
          return [
            `"${l.requestCode}"`,
            `"${student?.name || ""}"`,
            `"${student?.studentId || ""}"`,
            `"${l.leaveType}"`,
            `"${l.destination}"`,
            `"${new Date(l.startDate).toLocaleDateString()}"`,
            `"${new Date(l.endDate).toLocaleDateString()}"`,
            `"${l.status}"`,
            `"${l.reason.replace(/"/g, '""')}"`,
          ];
        }),
      ];
      csvContent = rows.map((r) => r.join(",")).join("\n");
    } else {
      throw new BadRequestError(`Invalid export report type: ${type}`);
    }

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode || 500 });
  }
}
