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
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "WARDEN") {
      throw new ForbiddenError("Forbidden: Staff authorization required");
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim();
    const course = searchParams.get("course");
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const allocationStatus = searchParams.get("allocationStatus");

    const whereClause: any = {};
    if (course && course !== "ALL") whereClause.course = { contains: course };
    if (department && department !== "ALL") whereClause.department = { contains: department };
    if (status && status !== "ALL") whereClause.status = status;

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            username: true,
            status: true,
            createdAt: true,
          },
        },
        allocations: {
          where: { status: "ACTIVE" },
          include: {
            bed: {
              include: {
                room: {
                  include: {
                    floor: {
                      include: {
                        block: {
                          include: {
                            hostel: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

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
      filtered = filtered.filter((s) => s.allocations.length > 0);
    } else if (allocationStatus === "UNALLOCATED") {
      filtered = filtered.filter((s) => s.allocations.length === 0);
    }

    const formatted = filtered.map((s) => {
      const activeAlloc = s.allocations[0];
      return {
        id: s.id,
        userId: s.userId,
        username: s.user.username,
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
              allocationId: activeAlloc.id,
              roomNumber: activeAlloc.bed.room.roomNumber,
              bedNumber: activeAlloc.bed.bedNumber,
              roomType: activeAlloc.bed.room.roomType,
              floorName: activeAlloc.bed.room.floor.name,
              blockName: activeAlloc.bed.room.floor.block.name,
              hostelName: activeAlloc.bed.room.floor.block.hostel.name,
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

    if (!username || !email || !password || !name || !studentId || !phone || !course) {
      throw new BadRequestError("All mandatory student fields are required");
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

    const existingStudent = await prisma.student.findUnique({
      where: { studentId: studentId.trim().toUpperCase() },
    });
    if (existingStudent) {
      throw new ConflictError(`Student with ID ${studentId} already exists`);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Transactional account creation
    const createdStudent = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          passwordHash,
          role: "STUDENT",
          status: "ACTIVE",
        },
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          studentId: studentId.trim().toUpperCase(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          course: course.trim(),
          department: department ? department.trim() : "School of Computing & Engineering",
          yearOfStudy: Number(yearOfStudy) || 1,
          gender: gender || "MALE",
          emergencyContactName: emergencyContactName ? emergencyContactName.trim() : "Guardian",
          emergencyContactPhone: emergencyContactPhone ? emergencyContactPhone.trim() : phone.trim(),
          address: address ? address.trim() : null,
          status: "ACTIVE",
        },
      });

      return student;
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "STUDENT_REGISTERED",
      targetType: "Student",
      targetId: createdStudent.id,
      details: { studentId: createdStudent.studentId, name: createdStudent.name },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(createdStudent, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
