import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "STUDENT") {
      throw new ForbiddenError("Forbidden");
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.id },
      include: {
        user: { select: { email: true, username: true, createdAt: true } },
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
    });

    if (!student) throw new NotFoundError("Student profile not found");
    return successResponse(student);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "STUDENT") {
      throw new ForbiddenError("Forbidden");
    }

    const body = await req.json();
    const { phone, emergencyContactName, emergencyContactPhone, address } = body;

    const student = await prisma.student.findUnique({
      where: { userId: session.id },
    });
    if (!student) throw new NotFoundError("Student profile not found");

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        phone: phone || student.phone,
        emergencyContactName: emergencyContactName || student.emergencyContactName,
        emergencyContactPhone: emergencyContactPhone || student.emergencyContactPhone,
        address: address !== undefined ? address : student.address,
      },
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "STUDENT_PROFILE_UPDATED",
      targetType: "Student",
      targetId: student.id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
