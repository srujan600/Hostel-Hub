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
    await requireAuth(req);
    const { id } = await params;

    const room = await prisma.room.findUnique({
      where: { id },
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
        beds: {
          include: {
            allocations: {
              where: { status: "ACTIVE" },
              include: {
                student: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    return successResponse(room);
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
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "WARDEN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to update room");
    }

    const { id } = await params;
    const body = await req.json();
    const { status, roomType } = body;

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const updated = await prisma.room.update({
      where: { id },
      data: {
        status: status || undefined,
        roomType: roomType || undefined,
      },
      include: { beds: true },
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "ROOM_UPDATED",
      targetType: "Room",
      targetId: room.id,
      details: body,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
