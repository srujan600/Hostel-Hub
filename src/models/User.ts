import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IUser {
  _id: string;
  id?: string;
  username: string;
  email: string;
  passwordHash: string;
  role: "STUDENT" | "WARDEN" | "ADMIN" | "SUPER_ADMIN" | "SECURITY";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, default: generateId },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["STUDENT", "WARDEN", "ADMIN", "SUPER_ADMIN", "SECURITY"],
      default: "STUDENT",
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
  },
  baseSchemaOptions
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
