import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const notifications = await prisma.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.id,
        isRead: false,
      },
    });

    return successResponse({
      notifications,
      unreadCount,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();

    if (body.markAllRead) {
      const updated = await prisma.notification.updateMany({
        where: {
          userId: session.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return successResponse({ updatedCount: updated.count, message: "All notifications marked as read" });
    }

    return successResponse({ message: "No action performed" });
  } catch (error) {
    return errorResponse(error);
  }
}
