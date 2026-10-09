import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IMessMenu {
  _id: string;
  id?: string;
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  mealType: "BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER";
  items: string;
  timings: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const MessMenuSchema = new Schema<IMessMenu>(
  {
    _id: { type: String, default: generateId },
    dayOfWeek: {
      type: String,
      enum: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
      required: true,
    },
    mealType: {
      type: String,
      enum: ["BREAKFAST", "LUNCH", "SNACKS", "DINNER"],
      required: true,
    },
    items: { type: String, required: true },
    timings: { type: String, required: true },
  },
  baseSchemaOptions
);

MessMenuSchema.index({ dayOfWeek: 1, mealType: 1 }, { unique: true });

export const MessMenu: Model<IMessMenu> =
  mongoose.models.MessMenu || mongoose.model<IMessMenu>("MessMenu", MessMenuSchema);

export default MessMenu;
