import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req);
    const { id } = await params;

    const hostel = await prisma.hostel.findUnique({
      where: { id },
      include: {
        blocks: {
          include: {
            floors: {
              include: {
                rooms: {
                  include: {
                    beds: {
                      include: {
                        allocations: {
                          where: { status: "ACTIVE" },
                          include: {
                            student: {
                              select: {
                                id: true,
                                name: true,
                                studentId: true,
                                phone: true,
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
        },
      },
    });

    if (!hostel) {
      throw new NotFoundError("Hostel not found");
    }

    return successResponse(hostel);
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
      throw new ForbiddenError("Forbidden: Administrator privileges required to update hostels");
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, address, genderType, status } = body;

    const hostel = await prisma.hostel.findUnique({ where: { id } });
    if (!hostel) {
      throw new NotFoundError("Hostel not found");
    }

    const updated = await prisma.hostel.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        description: description !== undefined ? description?.trim() : undefined,
        address: address !== undefined ? address?.trim() : undefined,
        genderType: genderType !== undefined ? genderType : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "HOSTEL_UPDATED",
      targetType: "Hostel",
      targetId: hostel.id,
      details: body,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
