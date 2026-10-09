import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Notification } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;

    await connectToDatabase();

    const notif = await Notification.findById(id);
    if (!notif) {
      throw new NotFoundError("Notification not found");
    }

    if (notif.userId !== session.id) {
      throw new ForbiddenError("Cannot modify another user's notifications");
    }

    notif.isRead = true;
    notif.readAt = new Date();
    await notif.save();

    return successResponse(notif.toJSON());
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
    const { id } = await params;

    await connectToDatabase();

    const notif = await Notification.findById(id);
    if (!notif) {
      throw new NotFoundError("Notification not found");
    }

    if (notif.userId !== session.id) {
      throw new ForbiddenError("Cannot delete another user's notifications");
    }

    await Notification.deleteOne({ _id: id });

    return successResponse({ message: "Notification deleted" });
  } catch (error) {
    return errorResponse(error);
  }
}
