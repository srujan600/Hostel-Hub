import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Staff, User, Hostel } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError, ConflictError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Administrator privileges required to manage staff");
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim();
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    await connectToDatabase();

    const query: any = {};
    if (role && role !== "ALL") query.role = role;
    if (status && status !== "ALL") query.status = status;

    const staffList = await Staff.find(query).sort({ name: 1 }).lean();

    const userIds = staffList.map((s) => s.userId);
    const hostelIds = staffList.map((s) => s.assignedHostelId).filter((id): id is string => Boolean(id));

    const [users, hostels] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select("_id username status createdAt").lean(),
      Hostel.find({ _id: { $in: hostelIds } }).select("_id code name").lean(),
    ]);

    const userMap = new Map(users.map((u) => [u._id, u]));
    const hostelMap = new Map(hostels.map((h) => [h._id, h]));

    let formatted = staffList.map((s) => {
      const u = userMap.get(s.userId);
      const h = s.assignedHostelId ? hostelMap.get(s.assignedHostelId) : null;
      return {
        ...s,
        id: s._id,
        user: u
          ? {
              username: u.username,
              status: u.status,
              createdAt: u.createdAt,
            }
          : null,
        assignedHostel: h
          ? {
              id: h._id,
              code: h.code,
              name: h.name,
            }
          : null,
      };
    });

    if (search) {
      formatted = formatted.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.employeeId.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search) ||
          s.phone.includes(search)
      );
    }

    return successResponse(formatted);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Administrator privileges required to register staff");
    }

    const body = await req.json();
    const {
      username,
      email,
      password,
      name,
      employeeId,
      phone,
      role,
      designation,
      assignedHostelId,
    } = body;

    if (!username || !email || !password || !name || !employeeId || !phone || !role) {
      throw new BadRequestError("All mandatory staff fields are required");
    }

    const validRoles = ["WARDEN", "ADMIN", "SUPER_ADMIN", "SECURITY"];
    if (!validRoles.includes(role)) {
      throw new BadRequestError(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }

    await connectToDatabase();

    const existingUser = await User.findOne({
      $or: [{ username: username.trim().toLowerCase() }, { email: email.trim().toLowerCase() }],
    });
    if (existingUser) {
      throw new ConflictError("A user with this username or email already exists");
    }

    const existingStaff = await Staff.findOne({
      employeeId: employeeId.trim().toUpperCase(),
    });
    if (existingStaff) {
      throw new ConflictError(`Staff member with Employee ID ${employeeId} already exists`);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
      status: "ACTIVE",
    });

    const staff = await Staff.create({
      userId: user._id,
      employeeId: employeeId.trim().toUpperCase(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role,
      designation: designation ? designation.trim() : role === "WARDEN" ? "Resident Warden" : "Campus Security Officer",
      assignedHostelId: assignedHostelId || null,
      status: "ACTIVE",
    });

    const assignedHostel = assignedHostelId ? await Hostel.findById(assignedHostelId).lean() : null;

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "STAFF_REGISTERED",
      targetType: "Staff",
      targetId: staff._id,
      details: { employeeId: staff.employeeId, name: staff.name, role: staff.role },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(
      {
        ...staff.toJSON(),
        assignedHostel: assignedHostel ? { ...assignedHostel, id: assignedHostel._id } : null,
      },
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
