import { connectToDatabase } from "@/lib/mongodb";
import { Notification } from "@/models";
import { logger } from "@/lib/logger";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "URGENT";
  linkUrl?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  static async send(params: CreateNotificationParams) {
    try {
      logger.info(
        `[NOTIFICATION] To User '${params.userId}': ${params.title} - ${params.message}`
      );

      await connectToDatabase();

      return await Notification.create({
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        linkUrl: params.linkUrl || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        isRead: false,
      });
    } catch (error) {
      logger.error(
        `[NOTIFICATION ERROR] Failed to create notification: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  static async markAsRead(notificationId: string, userId: string) {
    try {
      await connectToDatabase();
      return await Notification.updateMany(
        { _id: notificationId, userId },
        { $set: { isRead: true, readAt: new Date() } }
      );
    } catch (error) {
      logger.error(
        `[NOTIFICATION ERROR] Failed to mark notification as read: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
