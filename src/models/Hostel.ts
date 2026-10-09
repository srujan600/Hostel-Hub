import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IHostel {
  _id: string;
  id?: string;
  code: string;
  name: string;
  description?: string;
  address?: string;
  genderType: "MALE" | "FEMALE" | "CO_ED";
  totalBlocks: number;
  totalRooms: number;
  totalCapacity: number;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const HostelSchema = new Schema<IHostel>(
  {
    _id: { type: String, default: generateId },
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    address: { type: String },
    genderType: {
      type: String,
      enum: ["MALE", "FEMALE", "CO_ED"],
      default: "CO_ED",
    },
    totalBlocks: { type: Number, default: 0 },
    totalRooms: { type: Number, default: 0 },
    totalCapacity: { type: Number, default: 0 },
    status: { type: String, default: "ACTIVE", index: true },
  },
  baseSchemaOptions
);

export const Hostel: Model<IHostel> =
  mongoose.models.Hostel || mongoose.model<IHostel>("Hostel", HostelSchema);

export default Hostel;
