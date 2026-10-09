import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface INotification {
  _id: string;
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "URGENT";
  linkUrl?: string | null;
  metadata?: string | null;
  isRead: boolean;
  readAt?: Date | null;
  createdAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    _id: { type: String, default: generateId },
    userId: { type: String, required: true, ref: "User", index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["INFO", "SUCCESS", "WARNING", "URGENT"],
      default: "INFO",
    },
    linkUrl: { type: String, default: null },
    metadata: { type: String, default: null },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  baseSchemaOptions
);

NotificationSchema.index({ userId: 1, isRead: 1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
