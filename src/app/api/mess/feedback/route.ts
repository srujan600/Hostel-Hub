import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to view mess feedback");
    }

    const feedbacks = await prisma.feedback.findMany({
      where: { category: "MESS" },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalCount = feedbacks.length;
    const avgRating = totalCount > 0 ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / totalCount).toFixed(1) : "5.0";

    const ratingDistribution = {
      5: feedbacks.filter((f) => f.rating === 5).length,
      4: feedbacks.filter((f) => f.rating === 4).length,
      3: feedbacks.filter((f) => f.rating === 3).length,
      2: feedbacks.filter((f) => f.rating === 2).length,
      1: feedbacks.filter((f) => f.rating === 1).length,
    };

    return successResponse({
      totalCount,
      avgRating: Number(avgRating),
      ratingDistribution,
      feedbacks,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
