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

    const notice = await prisma.notice.findUnique({
      where: { id },
    });

    if (!notice) {
      throw new NotFoundError("Notice circular not found");
    }

    return successResponse(notice);
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
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to edit notices");
    }

    const { id } = await params;
    const body = await req.json();
    const { title, content, priority, targetAudience, expiryDate, isPublished } = body;

    const notice = await prisma.notice.findUnique({ where: { id } });
    if (!notice) {
      throw new NotFoundError("Notice not found");
    }

    const updated = await prisma.notice.update({
      where: { id },
      data: {
        title: title ? title.trim() : undefined,
        content: content ? content.trim() : undefined,
        priority: priority || undefined,
        targetAudience: targetAudience || undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        isPublished: isPublished !== undefined ? isPublished : undefined,
      },
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "NOTICE_UPDATED",
      targetType: "Notice",
      targetId: id,
      details: body,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to remove notices");
    }

    const { id } = await params;
    const notice = await prisma.notice.findUnique({ where: { id } });
    if (!notice) {
      throw new NotFoundError("Notice not found");
    }

    // Soft delete by setting isPublished to false
    const archived = await prisma.notice.update({
      where: { id },
      data: { isPublished: false },
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "NOTICE_ARCHIVED",
      targetType: "Notice",
      targetId: id,
      details: { noticeCode: notice.noticeCode, title: notice.title },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse({ message: "Notice successfully archived and unpublished", notice: archived });
  } catch (error) {
    return errorResponse(error);
  }
}
