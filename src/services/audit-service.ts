import { connectToDatabase } from "@/lib/mongodb";
import { AuditLog } from "@/models";
import { logger } from "@/lib/logger";

export interface CreateAuditLogParams {
  actorId: string;
  actorRole: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  static async record(params: CreateAuditLogParams) {
    try {
      logger.info(
        `[AUDIT] ${params.actorRole} '${params.actorName}' performed '${params.action}' on ${params.targetType}:${params.targetId}`
      );

      await connectToDatabase();

      return await AuditLog.create({
        actorId: params.actorId,
        actorRole: params.actorRole,
        actorName: params.actorName,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      });
    } catch (error) {
      // Audit log failures must be logged but not crash the primary operational flow
      logger.error(
        `[AUDIT ERROR] Failed to persist audit log: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
