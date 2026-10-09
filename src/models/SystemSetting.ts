import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface ISystemSetting {
  _id: string;
  id?: string;
  key: string;
  value: string;
  description?: string | null;
  category: string;
  updatedAt?: Date;
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    _id: { type: String, default: generateId },
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, required: true },
    description: { type: String, default: null },
    category: { type: String, default: "GENERAL", index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    ...baseSchemaOptions,
    timestamps: false,
  }
);

export const SystemSetting: Model<ISystemSetting> =
  mongoose.models.SystemSetting ||
  mongoose.model<ISystemSetting>("SystemSetting", SystemSettingSchema);

export default SystemSetting;
