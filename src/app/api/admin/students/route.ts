import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Student, User, RoomAllocation, Bed, Room, Floor, Block, Hostel } from "@/models";
import { escapeRegex } from "@/models/_utils";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError, ConflictError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "WARDEN") {
      throw new ForbiddenError("Forbidden: Staff authorization required");
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim();
    const course = searchParams.get("course");
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const allocationStatus = searchParams.get("allocationStatus");

    await connectToDatabase();

    const query: any = {};
    if (course && course !== "ALL") query.course = { $regex: escapeRegex(course), $options: "i" };
    if (department && department !== "ALL") query.department = { $regex: escapeRegex(department), $options: "i" };
    if (status && status !== "ALL") query.status = status;

    const students = await Student.find(query).sort({ name: 1 }).lean();
    const studentIds = students.map((s) => s._id);
    const userIds = students.map((s) => s.userId);

    const [users, activeAllocations] = await Promise.all([
      User.find({ _id: { $in: userIds } }, { _id: 1, username: 1, status: 1, createdAt: 1 }).lean(),
      RoomAllocation.find({ studentId: { $in: studentIds }, status: "ACTIVE" }).lean(),
    ]);

    const bedIds = activeAllocations.map((a) => a.bedId);
    const beds = await Bed.find({ _id: { $in: bedIds } }).lean();
    const roomIds = beds.map((b) => b.roomId);
    const rooms = await Room.find({ _id: { $in: roomIds } }).lean();
    const floorIds = rooms.map((r) => r.floorId);
    const floors = await Floor.find({ _id: { $in: floorIds } }).lean();
    const blockIds = floors.map((f) => f.blockId);
    const blocks = await Block.find({ _id: { $in: blockIds } }).lean();
    const hostelIds = blocks.map((b) => b.hostelId);
    const hostels = await Hostel.find({ _id: { $in: hostelIds } }).lean();

    const userMap = new Map(users.map((u) => [u._id, u]));
    const allocMap = new Map(activeAllocations.map((a) => [a.studentId, a]));
    const bedMap = new Map(beds.map((b) => [b._id, b]));
    const roomMap = new Map(rooms.map((r) => [r._id, r]));
    const floorMap = new Map(floors.map((f) => [f._id, f]));
    const blockMap = new Map(blocks.map((b) => [b._id, b]));
    const hostelMap = new Map(hostels.map((h) => [h._id, h]));

    let filtered = students;
    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.studentId.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search) ||
          s.phone.includes(search)
      );
    }

    if (allocationStatus === "ALLOCATED") {
      filtered = filtered.filter((s) => allocMap.has(s._id));
    } else if (allocationStatus === "UNALLOCATED") {
      filtered = filtered.filter((s) => !allocMap.has(s._id));
    }

    const formatted = filtered.map((s) => {
      const activeAlloc = allocMap.get(s._id);
      const bed = activeAlloc ? bedMap.get(activeAlloc.bedId) : null;
      const room = bed ? roomMap.get(bed.roomId) : null;
      const floor = room ? floorMap.get(room.floorId) : null;
      const block = floor ? blockMap.get(floor.blockId) : null;
      const hostel = block ? hostelMap.get(block.hostelId) : null;
      const user = userMap.get(s.userId);

      return {
        id: s._id,
        userId: s.userId,
        username: user?.username || s.studentId,
        studentId: s.studentId,
        name: s.name,
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
        createdAt: s.createdAt,
        allocation: activeAlloc
          ? {
              allocationId: activeAlloc._id,
              roomNumber: room?.roomNumber || "N/A",
              bedNumber: bed?.bedNumber || "N/A",
              roomType: room?.roomType || "N/A",
              floorName: floor?.name || "N/A",
              blockName: block?.name || "N/A",
              hostelName: hostel?.name || "N/A",
            }
          : null,
      };
    });

    return successResponse(formatted);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Administrator privileges required to register students");
    }

    const body = await req.json();
    const {
      username,
      email,
      password,
      name,
      studentId,
      phone,
      course,
      department,
      yearOfStudy,
      gender,
      emergencyContactName,
      emergencyContactPhone,
      address,
    } = body;

    if (
      !username ||
      !email ||
      !password ||
      !name ||
      !studentId ||
      !phone ||
      !course ||
      !department ||
      !gender ||
      !emergencyContactName ||
      !emergencyContactPhone
    ) {
      throw new BadRequestError("All mandatory student fields are required");
    }

    await connectToDatabase();

    const existingUser = await User.findOne({
      $or: [{ username: username.trim().toLowerCase() }, { email: email.trim().toLowerCase() }],
    });
    if (existingUser) {
      throw new ConflictError("A user with this username or email already exists");
    }

    const existingStudent = await Student.findOne({
      $or: [{ studentId: studentId.trim().toUpperCase() }, { email: email.trim().toLowerCase() }],
    });
    if (existingStudent) {
      throw new ConflictError("A student with this Student ID or email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: "STUDENT",
      status: "ACTIVE",
    });

    const student = await Student.create({
      userId: user._id,
      studentId: studentId.trim().toUpperCase(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      course: course.trim(),
      department: department.trim(),
      yearOfStudy: Number(yearOfStudy) || 1,
      gender,
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      address: address ? address.trim() : null,
      status: "ACTIVE",
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "STUDENT_REGISTERED",
      targetType: "Student",
      targetId: student._id,
      details: { studentId: student.studentId, name: student.name, course: student.course },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(
      {
        ...student.toJSON(),
        user: { username: user.username, email: user.email },
      },
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
