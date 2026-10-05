import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const notif = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notif) {
      throw new NotFoundError("Notification not found");
    }

    if (notif.userId !== session.id) {
      throw new ForbiddenError("Cannot modify another user's notifications");
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
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
    const { id } = await params;

    const notif = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notif) {
      throw new NotFoundError("Notification not found");
    }

    if (notif.userId !== session.id) {
      throw new ForbiddenError("Cannot delete another user's notifications");
    }

    await prisma.notification.delete({
      where: { id },
    });

    return successResponse({ message: "Notification deleted" });
  } catch (error) {
    return errorResponse(error);
  }
}
