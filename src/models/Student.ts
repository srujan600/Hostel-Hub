import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IStudent {
  _id: string;
  id?: string;
  userId: string;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  department: string;
  yearOfStudy: number;
  gender: "MALE" | "FEMALE" | "OTHER";
  emergencyContactName: string;
  emergencyContactPhone: string;
  address?: string;
  status: "ACTIVE" | "GRADUATED" | "SUSPENDED";
  createdAt?: Date;
  updatedAt?: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    _id: { type: String, default: generateId },
    userId: { type: String, required: true, unique: true, ref: "User", index: true },
    studentId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    course: { type: String, required: true, index: true },
    department: { type: String, required: true },
    yearOfStudy: { type: Number, default: 1 },
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER"], required: true },
    emergencyContactName: { type: String, required: true },
    emergencyContactPhone: { type: String, required: true },
    address: { type: String },
    status: {
      type: String,
      enum: ["ACTIVE", "GRADUATED", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
  },
  baseSchemaOptions
);

export const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>("Student", StudentSchema);

export default Student;
