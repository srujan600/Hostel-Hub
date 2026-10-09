import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IRoleEntity {
  _id: string;
  id?: string;
  code: string;
  name: string;
  description?: string;
  permissions: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RoleEntitySchema = new Schema<IRoleEntity>(
  {
    _id: { type: String, default: generateId },
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    permissions: { type: String, required: true },
  },
  baseSchemaOptions
);

export const RoleEntity: Model<IRoleEntity> =
  mongoose.models.RoleEntity || mongoose.model<IRoleEntity>("RoleEntity", RoleEntitySchema);

export default RoleEntity;
