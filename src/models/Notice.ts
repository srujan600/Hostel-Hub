import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface INotice {
  _id: string;
  id?: string;
  noticeCode: string;
  title: string;
  content: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  targetAudience: string;
  targetHostelId?: string | null;
  targetBlockId?: string | null;
  publishedById: string;
  isPublished: boolean;
  publishDate: Date;
  expiryDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const NoticeSchema = new Schema<INotice>(
  {
    _id: { type: String, default: generateId },
    noticeCode: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
      default: "NORMAL",
      index: true,
    },
    targetAudience: { type: String, default: "ALL" },
    targetHostelId: { type: String, default: null },
    targetBlockId: { type: String, default: null },
    publishedById: { type: String, required: true },
    isPublished: { type: Boolean, default: true, index: true },
    publishDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, default: null },
  },
  baseSchemaOptions
);

NoticeSchema.index({ isPublished: 1, publishDate: -1 });

export const Notice: Model<INotice> =
  mongoose.models.Notice || mongoose.model<INotice>("Notice", NoticeSchema);

export default Notice;
