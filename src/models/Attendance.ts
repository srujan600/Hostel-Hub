import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IAttendance {
  _id: string;
  id?: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  markedById: string;
  remarks?: string | null;
  isCorrected: boolean;
  correctedById?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    _id: { type: String, default: generateId },
    studentId: { type: String, required: true, ref: "Student", index: true },
    date: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "LATE", "EXCUSED"],
      default: "PRESENT",
      index: true,
    },
    markedById: { type: String, required: true },
    remarks: { type: String, default: null },
    isCorrected: { type: Boolean, default: false },
    correctedById: { type: String, default: null },
  },
  baseSchemaOptions
);

AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1, status: 1 });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>("Attendance", AttendanceSchema);

export default Attendance;
