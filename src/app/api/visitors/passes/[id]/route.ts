import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);

    if (
      session.role !== "WARDEN" &&
      session.role !== "ADMIN" &&
      session.role !== "SUPER_ADMIN" &&
      session.role !== "SECURITY"
    ) {
      throw new ForbiddenError("Forbidden: Staff authorization required to manage visitor passes");
    }

    const { id } = await params;
    const body = await req.json();
    const { status, remarks } = body;

    const pass = await prisma.visitorPass.findUnique({
      where: { id },
      include: {
        visitor: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!pass) {
      throw new NotFoundError("Visitor pass not found");
    }

    const updateData: any = {};
    if (remarks !== undefined) {
      updateData.remarks = remarks;
    }

    if (status) {
      updateData.status = status;
      if (status === "APPROVED" || status === "REJECTED") {
        updateData.approvedById = session.id;
      } else if (status === "CHECKED_IN") {
        if (!pass.actualEntryTime) {
          updateData.actualEntryTime = new Date();
        }
      } else if (status === "CHECKED_OUT") {
        if (!pass.actualExitTime) {
          updateData.actualExitTime = new Date();
        }
      }
    }

    const updatedPass = await prisma.visitorPass.update({
      where: { id },
      data: updateData,
      include: {
        visitor: {
          include: {
            student: true,
          },
        },
      },
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: `VISITOR_PASS_${status || "UPDATED"}`,
      targetType: "VisitorPass",
      targetId: id,
      details: { passCode: pass.passCode, previousStatus: pass.status, newStatus: status, remarks },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(updatedPass);
  } catch (error) {
    return errorResponse(error);
  }
}
