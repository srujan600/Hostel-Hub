import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IFeedback {
  _id: string;
  id?: string;
  studentId: string;
  category: "MESS" | "HOSTEL_FACILITY" | "MAINTENANCE" | "GENERAL";
  title: string;
  rating: number;
  comments: string;
  status: "RECEIVED" | "REVIEWED" | "ACTIONED";
  createdAt?: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    _id: { type: String, default: generateId },
    studentId: { type: String, required: true, ref: "Student", index: true },
    category: {
      type: String,
      enum: ["MESS", "HOSTEL_FACILITY", "MAINTENANCE", "GENERAL"],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    comments: { type: String, required: true },
    status: {
      type: String,
      enum: ["RECEIVED", "REVIEWED", "ACTIONED"],
      default: "RECEIVED",
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  baseSchemaOptions
);

export const Feedback: Model<IFeedback> =
  mongoose.models.Feedback || mongoose.model<IFeedback>("Feedback", FeedbackSchema);

export default Feedback;
