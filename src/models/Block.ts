import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IBlock {
  _id: string;
  id?: string;
  hostelId: string;
  code: string;
  name: string;
  totalFloors: number;
  totalRooms: number;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const BlockSchema = new Schema<IBlock>(
  {
    _id: { type: String, default: generateId },
    hostelId: { type: String, required: true, ref: "Hostel", index: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    totalFloors: { type: Number, default: 0 },
    totalRooms: { type: Number, default: 0 },
    status: { type: String, default: "ACTIVE" },
  },
  baseSchemaOptions
);

BlockSchema.index({ hostelId: 1, code: 1 }, { unique: true });

export const Block: Model<IBlock> =
  mongoose.models.Block || mongoose.model<IBlock>("Block", BlockSchema);

export default Block;
