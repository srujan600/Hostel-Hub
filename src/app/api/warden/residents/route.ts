import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Student, RoomAllocation, Bed, Room, Floor, Block, Hostel, Complaint, LeaveRequest } from "@/models";
import { escapeRegex } from "@/models/_utils";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Warden authorization required");
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim();
    const course = searchParams.get("course");
    const status = searchParams.get("status");

    await connectToDatabase();

    const query: any = {};
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { studentId: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
        { phone: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (course && course !== "ALL") {
      query.course = { $regex: escapeRegex(course), $options: "i" };
    }
    if (status && status !== "ALL") {
      query.status = status;
    }

    const students = await Student.find(query).sort({ name: 1 }).lean();
    const studentIds = students.map((s) => s._id);

    const [allocations, activeComplaints, pendingLeaves] = await Promise.all([
      RoomAllocation.find({ studentId: { $in: studentIds }, status: "ACTIVE" }).lean(),
      Complaint.find(
        { studentId: { $in: studentIds }, status: { $in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] } },
        { _id: 1, studentId: 1, complaintCode: 1, title: 1, status: 1 }
      ).lean(),
      LeaveRequest.find(
        { studentId: { $in: studentIds }, status: "SUBMITTED" },
        { _id: 1, studentId: 1, requestCode: 1, destination: 1 }
      ).lean(),
    ]);

    const bedIds = allocations.map((a) => a.bedId);
    const beds = await Bed.find({ _id: { $in: bedIds } }).lean();
    const roomIds = beds.map((b) => b.roomId);
    const rooms = await Room.find({ _id: { $in: roomIds } }).lean();
    const floorIds = rooms.map((r) => r.floorId);
    const floors = await Floor.find({ _id: { $in: floorIds } }).lean();
    const blockIds = floors.map((f) => f.blockId);
    const blocks = await Block.find({ _id: { $in: blockIds } }).lean();
    const hostelIds = blocks.map((b) => b.hostelId);
    const hostels = await Hostel.find({ _id: { $in: hostelIds } }).lean();

    const bedMap = new Map(beds.map((b) => [b._id, b]));
    const roomMap = new Map(rooms.map((r) => [r._id, r]));
    const floorMap = new Map(floors.map((f) => [f._id, f]));
    const blockMap = new Map(blocks.map((b) => [b._id, b]));
    const hostelMap = new Map(hostels.map((h) => [h._id, h]));
    const allocMap = new Map(allocations.map((a) => [a.studentId, a]));

    const complaintCountMap = new Map<string, number>();
    activeComplaints.forEach((c) => {
      complaintCountMap.set(c.studentId, (complaintCountMap.get(c.studentId) || 0) + 1);
    });

    const pendingLeaveSet = new Set(pendingLeaves.map((l) => l.studentId));

    const formatted = students.map((s) => {
      const activeAlloc = allocMap.get(s._id);
      const bed = activeAlloc ? bedMap.get(activeAlloc.bedId) : null;
      const room = bed ? roomMap.get(bed.roomId) : null;
      const floor = room ? floorMap.get(room.floorId) : null;
      const block = floor ? blockMap.get(floor.blockId) : null;
      const hostel = block ? hostelMap.get(block.hostelId) : null;

      return {
        id: s._id,
        name: s.name,
        studentId: s.studentId,
        email: s.email,
        phone: s.phone,
        course: s.course,
        department: s.department,
        yearOfStudy: s.yearOfStudy,
        gender: s.gender,
        status: s.status,
        emergencyContactName: s.emergencyContactName,
        emergencyContactPhone: s.emergencyContactPhone,
        address: s.address,
        roomAllocation: activeAlloc
          ? {
              allocationId: activeAlloc._id,
              roomNumber: room?.roomNumber || "N/A",
              bedNumber: bed?.bedNumber || "N/A",
              roomType: room?.roomType || "N/A",
              floor: floor?.name || "N/A",
              block: block?.name || "N/A",
              blockCode: block?.code || "N/A",
              hostel: hostel?.name || "N/A",
            }
          : null,
        activeComplaintsCount: complaintCountMap.get(s._id) || 0,
        hasPendingLeave: pendingLeaveSet.has(s._id),
      };
    });

    return successResponse(formatted);
  } catch (error) {
    return errorResponse(error);
  }
}
