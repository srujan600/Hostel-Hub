import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Notice, Student } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";
import { NotificationService } from "@/services/notification-service";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Warden authorization required");
    }

    const body = await req.json();
    const { title, content, priority, targetAudience, expiryDate } = body;

    if (!title || !content) {
      throw new BadRequestError("Title and content are required");
    }

    await connectToDatabase();

    const count = await Notice.countDocuments();
    const noticeCode = `NOT-2026-${String(count + 1).padStart(3, "0")}`;

    const notice = await Notice.create({
      noticeCode,
      title: title.trim(),
      content: content.trim(),
      priority: priority || "NORMAL",
      targetAudience: targetAudience || "ALL",
      publishedById: session.id,
      isPublished: true,
      publishDate: new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "NOTICE_PUBLISHED",
      targetType: "Notice",
      targetId: notice._id,
      details: { code: noticeCode, title, priority, targetAudience },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    const students = await Student.find({ status: "ACTIVE" }, { userId: 1 }).lean();

    for (const s of students) {
      await NotificationService.send({
        userId: s.userId,
        title: `Notice: ${title}`,
        message: `${priority === "URGENT" ? "🚨 URGENT: " : ""}${title}`,
        type: priority === "URGENT" ? "URGENT" : "INFO",
        linkUrl: `/student/notices`,
      });
    }

    return successResponse(notice.toJSON(), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
