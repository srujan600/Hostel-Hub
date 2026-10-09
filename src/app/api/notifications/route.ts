import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Notification } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await connectToDatabase();

    const notifications = await Notification.find({ userId: session.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: session.id,
      isRead: false,
    });

    return successResponse({
      notifications: notifications.map((n) => ({ ...n, id: n._id })),
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

    await connectToDatabase();

    if (body.markAllRead) {
      const result = await Notification.updateMany(
        { userId: session.id, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );

      return successResponse({
        updatedCount: result.modifiedCount,
        message: "All notifications marked as read",
      });
    }

    return successResponse({ message: "No action performed" });
  } catch (error) {
    return errorResponse(error);
  }
}
