import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IRoomAllocation {
  _id: string;
  id?: string;
  studentId: string;
  bedId: string;
  academicYear: string;
  allocatedAt: Date;
  vacatedAt?: Date | null;
  status: "ACTIVE" | "TRANSFERRED" | "VACATED";
  remarks?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RoomAllocationSchema = new Schema<IRoomAllocation>(
  {
    _id: { type: String, default: generateId },
    studentId: { type: String, required: true, ref: "Student", index: true },
    bedId: { type: String, required: true, ref: "Bed", index: true },
    academicYear: { type: String, required: true },
    allocatedAt: { type: Date, default: Date.now },
    vacatedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["ACTIVE", "TRANSFERRED", "VACATED"],
      default: "ACTIVE",
      index: true,
    },
    remarks: { type: String },
  },
  baseSchemaOptions
);

RoomAllocationSchema.index({ studentId: 1, status: 1 });
RoomAllocationSchema.index({ bedId: 1, status: 1 });

export const RoomAllocation: Model<IRoomAllocation> =
  mongoose.models.RoomAllocation ||
  mongoose.model<IRoomAllocation>("RoomAllocation", RoomAllocationSchema);

export default RoomAllocation;
