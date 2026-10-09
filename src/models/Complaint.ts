import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IComplaint {
  _id: string;
  id?: string;
  complaintCode: string;
  studentId: string;
  category:
    | "ELECTRICAL"
    | "PLUMBING"
    | "CARPENTRY"
    | "CLEANLINESS"
    | "INTERNET_WIFI"
    | "MESS_FOOD"
    | "DISCIPLINE"
    | "SECURITY"
    | "OTHER";
  title: string;
  description: string;
  location: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "SUBMITTED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  assignedStaffId?: string | null;
  attachmentUrl?: string | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    _id: { type: String, default: generateId },
    complaintCode: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, ref: "Student", index: true },
    category: {
      type: String,
      enum: [
        "ELECTRICAL",
        "PLUMBING",
        "CARPENTRY",
        "CLEANLINESS",
        "INTERNET_WIFI",
        "MESS_FOOD",
        "DISCIPLINE",
        "SECURITY",
        "OTHER",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      index: true,
    },
    status: {
      type: String,
      enum: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "SUBMITTED",
      index: true,
    },
    assignedStaffId: { type: String, ref: "Staff", default: null, index: true },
    attachmentUrl: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  baseSchemaOptions
);

ComplaintSchema.index({ studentId: 1, status: 1 });
ComplaintSchema.index({ assignedStaffId: 1, status: 1 });

export const Complaint: Model<IComplaint> =
  mongoose.models.Complaint || mongoose.model<IComplaint>("Complaint", ComplaintSchema);

export default Complaint;
