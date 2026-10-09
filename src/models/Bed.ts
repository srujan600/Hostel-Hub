import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IBed {
  _id: string;
  id?: string;
  roomId: string;
  bedNumber: string;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED";
  createdAt?: Date;
  updatedAt?: Date;
}

const BedSchema = new Schema<IBed>(
  {
    _id: { type: String, default: generateId },
    roomId: { type: String, required: true, ref: "Room", index: true },
    bedNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ["AVAILABLE", "OCCUPIED", "MAINTENANCE", "RESERVED"],
      default: "AVAILABLE",
      index: true,
    },
  },
  baseSchemaOptions
);

BedSchema.index({ roomId: 1, bedNumber: 1 }, { unique: true });

export const Bed: Model<IBed> =
  mongoose.models.Bed || mongoose.model<IBed>("Bed", BedSchema);

export default Bed;
