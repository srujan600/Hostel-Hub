import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface ILeaveRequest {
  _id: string;
  id?: string;
  requestCode: string;
  studentId: string;
  leaveType: "DAY_OUTING" | "OVERNIGHT" | "VACATION" | "EMERGENCY";
  startDate: Date;
  endDate: Date;
  reason: string;
  destination: string;
  emergencyContact: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "COMPLETED";
  reviewedById?: string | null;
  reviewedAt?: Date | null;
  reviewRemarks?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    _id: { type: String, default: generateId },
    requestCode: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, ref: "Student", index: true },
    leaveType: {
      type: String,
      enum: ["DAY_OUTING", "OVERNIGHT", "VACATION", "EMERGENCY"],
      default: "DAY_OUTING",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    destination: { type: String, required: true },
    emergencyContact: { type: String, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "COMPLETED"],
      default: "SUBMITTED",
      index: true,
    },
    reviewedById: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewRemarks: { type: String, default: null },
  },
  baseSchemaOptions
);

LeaveRequestSchema.index({ studentId: 1, status: 1 });
LeaveRequestSchema.index({ startDate: 1, endDate: 1 });

export const LeaveRequest: Model<ILeaveRequest> =
  mongoose.models.LeaveRequest ||
  mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);

export default LeaveRequest;
