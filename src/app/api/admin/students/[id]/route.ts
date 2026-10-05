import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "WARDEN") {
      throw new ForbiddenError("Forbidden: Staff authorization required");
    }

    const { id } = await params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { username: true, status: true } },
        allocations: {
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
        complaints: true,
        leaveRequests: true,
      },
    });

    if (!student) {
      throw new NotFoundError("Student not found");
    }

    return successResponse(student);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Administrator privileges required to update student status");
    }

    const { id } = await params;
    const body = await req.json();
    const { name, phone, course, department, yearOfStudy, status, emergencyContactName, emergencyContactPhone, address } = body;

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const st = await tx.student.update({
        where: { id },
        data: {
          name: name ? name.trim() : undefined,
          phone: phone ? phone.trim() : undefined,
          course: course ? course.trim() : undefined,
          department: department ? department.trim() : undefined,
          yearOfStudy: yearOfStudy !== undefined ? Number(yearOfStudy) : undefined,
          status: status || undefined,
          emergencyContactName: emergencyContactName ? emergencyContactName.trim() : undefined,
          emergencyContactPhone: emergencyContactPhone ? emergencyContactPhone.trim() : undefined,
          address: address !== undefined ? address : undefined,
        },
      });

      // Synchronize User status if student status is suspended
      if (status && (status === "SUSPENDED" || status === "INACTIVE")) {
        await tx.user.update({
          where: { id: student.userId },
          data: { status: "SUSPENDED" },
        });
      } else if (status === "ACTIVE") {
        await tx.user.update({
          where: { id: student.userId },
          data: { status: "ACTIVE" },
        });
      }

      return st;
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "STUDENT_UPDATED",
      targetType: "Student",
      targetId: id,
      details: body,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
