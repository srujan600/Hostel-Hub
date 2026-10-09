import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AuditLog } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Administrator privileges required to inspect audit logs");
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim();
    const action = searchParams.get("action");
    const actorRole = searchParams.get("actorRole");
    const targetType = searchParams.get("targetType");
    const limit = Number(searchParams.get("limit")) || 100;

    await connectToDatabase();

    const query: any = {};
    if (action && action !== "ALL") query.action = action;
    if (actorRole && actorRole !== "ALL") query.actorRole = actorRole;
    if (targetType && targetType !== "ALL") query.targetType = targetType;

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(limit).lean();

    let filtered = logs;
    if (search) {
      filtered = logs.filter(
        (l) =>
          l.action.toLowerCase().includes(search) ||
          l.actorName.toLowerCase().includes(search) ||
          l.targetType.toLowerCase().includes(search) ||
          (l.details && l.details.toLowerCase().includes(search))
      );
    }

    const [distinctActions, distinctTargets] = await Promise.all([
      AuditLog.distinct("action"),
      AuditLog.distinct("targetType"),
    ]);

    return successResponse({
      logs: filtered.map((l) => ({ ...l, id: l._id })),
      totalCount: filtered.length,
      availableActions: distinctActions,
      availableTargets: distinctTargets,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
