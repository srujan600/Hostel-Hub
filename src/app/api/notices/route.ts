import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const priority = searchParams.get("priority");

    const now = new Date();
    const whereClause: any = {
      isPublished: true,
      AND: [
        {
          OR: [
            { expiryDate: null },
            { expiryDate: { gte: now } },
          ],
        },
      ],
    };

    if (session.role === "STUDENT") {
      whereClause.AND.push({
        OR: [
          { targetAudience: "ALL" },
          { targetAudience: "STUDENTS" },
        ],
      });
    }

    if (priority && priority !== "ALL") {
      whereClause.priority = priority;
    }

    const notices = await prisma.notice.findMany({
      where: whereClause,
      orderBy: { publishDate: "desc" },
    });

    return successResponse(notices);
  } catch (error) {
    return errorResponse(error);
  }
}
