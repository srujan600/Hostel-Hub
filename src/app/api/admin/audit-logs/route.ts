import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const whereClause: any = {};
    if (action && action !== "ALL") whereClause.action = action;
    if (actorRole && actorRole !== "ALL") whereClause.actorRole = actorRole;
    if (targetType && targetType !== "ALL") whereClause.targetType = targetType;

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

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

    // Metadata for filter dropdowns
    const distinctActions = await prisma.auditLog.groupBy({
      by: ["action"],
      _count: { id: true },
    });

    const distinctTargets = await prisma.auditLog.groupBy({
      by: ["targetType"],
      _count: { id: true },
    });

    return successResponse({
      logs: filtered,
      totalCount: filtered.length,
      availableActions: distinctActions.map((a) => a.action),
      availableTargets: distinctTargets.map((t) => t.targetType),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
