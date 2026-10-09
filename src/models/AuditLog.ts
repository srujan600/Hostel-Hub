import mongoose, { Schema, Model } from "mongoose";
import { generateId, baseSchemaOptions } from "./_utils";

export interface IAuditLog {
  _id: string;
  id?: string;
  actorId: string;
  actorRole: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    _id: { type: String, default: generateId },
    actorId: { type: String, required: true, index: true },
    actorRole: { type: String, required: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    details: { type: String, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    ...baseSchemaOptions,
    timestamps: false,
  }
);

AuditLogSchema.index({ targetType: 1, targetId: 1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
