import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IFloor {
  _id: string;
  id?: string;
  blockId: string;
  floorNumber: number;
  name: string;
  totalRooms: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const FloorSchema = new Schema<IFloor>(
  {
    _id: { type: String, default: generateId },
    blockId: { type: String, required: true, ref: "Block", index: true },
    floorNumber: { type: Number, required: true },
    name: { type: String, required: true },
    totalRooms: { type: Number, default: 0 },
  },
  baseSchemaOptions
);

FloorSchema.index({ blockId: 1, floorNumber: 1 }, { unique: true });

export const Floor: Model<IFloor> =
  mongoose.models.Floor || mongoose.model<IFloor>("Floor", FloorSchema);

export default Floor;
