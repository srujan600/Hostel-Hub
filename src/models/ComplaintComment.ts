import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IComplaintComment {
  _id: string;
  id?: string;
  complaintId: string;
  authorId: string;
  authorRole: string;
  authorName: string;
  comment: string;
  isInternal: boolean;
  createdAt?: Date;
}

const ComplaintCommentSchema = new Schema<IComplaintComment>(
  {
    _id: { type: String, default: generateId },
    complaintId: { type: String, required: true, ref: "Complaint", index: true },
    authorId: { type: String, required: true },
    authorRole: { type: String, required: true },
    authorName: { type: String, required: true },
    comment: { type: String, required: true },
    isInternal: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  baseSchemaOptions
);

export const ComplaintComment: Model<IComplaintComment> =
  mongoose.models.ComplaintComment ||
  mongoose.model<IComplaintComment>("ComplaintComment", ComplaintCommentSchema);

export default ComplaintComment;
