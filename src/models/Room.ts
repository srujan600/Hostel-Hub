import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IRoom {
  _id: string;
  id?: string;
  floorId: string;
  roomNumber: string;
  roomType: "SINGLE" | "DOUBLE" | "TRIPLE" | "QUAD";
  capacity: number;
  occupiedBeds: number;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    _id: { type: String, default: generateId },
    floorId: { type: String, required: true, ref: "Floor", index: true },
    roomNumber: { type: String, required: true, index: true },
    roomType: {
      type: String,
      enum: ["SINGLE", "DOUBLE", "TRIPLE", "QUAD"],
      default: "DOUBLE",
    },
    capacity: { type: Number, default: 2 },
    occupiedBeds: { type: Number, default: 0 },
    status: { type: String, default: "ACTIVE", index: true },
  },
  baseSchemaOptions
);

RoomSchema.index({ floorId: 1, roomNumber: 1 }, { unique: true });

export const Room: Model<IRoom> =
  mongoose.models.Room || mongoose.model<IRoom>("Room", RoomSchema);

export default Room;
