import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const whereClause: any = {};
    if (role && role !== "ALL") whereClause.role = role;
    if (status && status !== "ALL") whereClause.status = status;

    const staffList = await prisma.staff.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            username: true,
            status: true,
            createdAt: true,
          },
        },
        assignedHostel: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    let filtered = staffList;
    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.employeeId.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search) ||
          s.phone.includes(search)
      );
    }

    return successResponse(filtered);
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

    // Uniqueness checks
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: username.trim().toLowerCase() }, { email: email.trim().toLowerCase() }],
      },
    });
    if (existingUser) {
      throw new ConflictError("A user with this username or email already exists");
    }

    const existingStaff = await prisma.staff.findUnique({
      where: { employeeId: employeeId.trim().toUpperCase() },
    });
    if (existingStaff) {
      throw new ConflictError(`Staff member with Employee ID ${employeeId} already exists`);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Transactional creation
    const createdStaff = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          passwordHash,
          role,
          status: "ACTIVE",
        },
      });

      const staff = await tx.staff.create({
        data: {
          userId: user.id,
          employeeId: employeeId.trim().toUpperCase(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          role,
          designation: designation ? designation.trim() : (role === "WARDEN" ? "Resident Warden" : "Campus Security Officer"),
          assignedHostelId: assignedHostelId || null,
          status: "ACTIVE",
        },
        include: {
          assignedHostel: true,
        },
      });

      return staff;
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "STAFF_REGISTERED",
      targetType: "Staff",
      targetId: createdStaff.id,
      details: { employeeId: createdStaff.employeeId, name: createdStaff.name, role: createdStaff.role },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(createdStaff, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
