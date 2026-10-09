import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IStaff {
  _id: string;
  id?: string;
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: "WARDEN" | "ADMIN" | "SUPER_ADMIN" | "SECURITY";
  designation: string;
  assignedHostelId?: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt?: Date;
  updatedAt?: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    _id: { type: String, default: generateId },
    userId: { type: String, required: true, unique: true, ref: "User", index: true },
    employeeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["WARDEN", "ADMIN", "SUPER_ADMIN", "SECURITY"],
      required: true,
      index: true,
    },
    designation: { type: String, required: true },
    assignedHostelId: { type: String, ref: "Hostel", default: null, index: true },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
  },
  baseSchemaOptions
);

export const Staff: Model<IStaff> =
  mongoose.models.Staff || mongoose.model<IStaff>("Staff", StaffSchema);

export default Staff;
