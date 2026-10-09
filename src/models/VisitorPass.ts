import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IVisitorPass {
  _id: string;
  id?: string;
  visitorId: string;
  passCode: string;
  visitDate: Date;
  expectedEntryTime: Date;
  expectedExitTime: Date;
  actualEntryTime?: Date | null;
  actualExitTime?: Date | null;
  status: "PENDING" | "APPROVED" | "CHECKED_IN" | "CHECKED_OUT" | "REJECTED" | "EXPIRED";
  approvedById?: string | null;
  remarks?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const VisitorPassSchema = new Schema<IVisitorPass>(
  {
    _id: { type: String, default: generateId },
    visitorId: { type: String, required: true, ref: "Visitor", index: true },
    passCode: { type: String, required: true, unique: true, index: true },
    visitDate: { type: Date, required: true, index: true },
    expectedEntryTime: { type: Date, required: true },
    expectedExitTime: { type: Date, required: true },
    actualEntryTime: { type: Date, default: null },
    actualExitTime: { type: Date, default: null },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "CHECKED_IN", "CHECKED_OUT", "REJECTED", "EXPIRED"],
      default: "PENDING",
      index: true,
    },
    approvedById: { type: String, default: null },
    remarks: { type: String, default: null },
  },
  baseSchemaOptions
);

export const VisitorPass: Model<IVisitorPass> =
  mongoose.models.VisitorPass ||
  mongoose.model<IVisitorPass>("VisitorPass", VisitorPassSchema);

export default VisitorPass;
