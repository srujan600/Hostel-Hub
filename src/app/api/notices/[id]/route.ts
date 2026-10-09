import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Notice } from "@/models";
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

    await connectToDatabase();

    const notice = await Notice.findById(id).lean();
    if (!notice) {
      throw new NotFoundError("Notice circular not found");
    }

    return successResponse({ ...notice, id: notice._id });
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

    await connectToDatabase();

    const notice = await Notice.findById(id);
    if (!notice) {
      throw new NotFoundError("Notice not found");
    }

    if (title !== undefined) notice.title = title.trim();
    if (content !== undefined) notice.content = content.trim();
    if (priority !== undefined) notice.priority = priority;
    if (targetAudience !== undefined) notice.targetAudience = targetAudience;
    if (expiryDate !== undefined) notice.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (isPublished !== undefined) notice.isPublished = isPublished;

    await notice.save();

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "NOTICE_UPDATED",
      targetType: "Notice",
      targetId: notice._id,
      details: body,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(notice.toJSON());
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

    await connectToDatabase();

    const notice = await Notice.findById(id);
    if (!notice) {
      throw new NotFoundError("Notice not found");
    }

    notice.isPublished = false;
    await notice.save();

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "NOTICE_ARCHIVED",
      targetType: "Notice",
      targetId: notice._id,
      details: { noticeCode: notice.noticeCode, title: notice.title },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse({
      message: "Notice successfully archived and unpublished",
      notice: notice.toJSON(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
