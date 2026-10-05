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
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Administrator privileges required");
    }

    const { id } = await params;
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        user: { select: { username: true, status: true, createdAt: true } },
        assignedHostel: true,
        assignedComplaints: { take: 5, orderBy: { createdAt: "desc" } },
      },
    });

    if (!staff) {
      throw new NotFoundError("Staff profile not found");
    }

    return successResponse(staff);
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
      throw new ForbiddenError("Forbidden: Administrator privileges required");
    }

    const { id } = await params;
    const body = await req.json();
    const { name, phone, designation, assignedHostelId, status } = body;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!staff) {
      throw new NotFoundError("Staff profile not found");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const st = await tx.staff.update({
        where: { id },
        data: {
          name: name ? name.trim() : undefined,
          phone: phone ? phone.trim() : undefined,
          designation: designation ? designation.trim() : undefined,
          assignedHostelId: assignedHostelId !== undefined ? assignedHostelId : undefined,
          status: status || undefined,
        },
        include: { assignedHostel: true },
      });

      if (status && status === "INACTIVE") {
        await tx.user.update({
          where: { id: staff.userId },
          data: { status: "INACTIVE" },
        });
      } else if (status && status === "ACTIVE") {
        await tx.user.update({
          where: { id: staff.userId },
          data: { status: "ACTIVE" },
        });
      }

      return st;
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "STAFF_UPDATED",
      targetType: "Staff",
      targetId: id,
      details: body,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
