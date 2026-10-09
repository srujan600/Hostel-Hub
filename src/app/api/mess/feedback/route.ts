import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Feedback, Student } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to view mess feedback");
    }

    await connectToDatabase();

    const feedbacks = await Feedback.find({ category: "MESS" })
      .sort({ createdAt: -1 })
      .lean();

    const studentIds = [...new Set(feedbacks.map((f) => f.studentId))];
    const students = await Student.find(
      { _id: { $in: studentIds } },
      { _id: 1, name: 1, studentId: 1 }
    ).lean();

    const studentMap = new Map(
      students.map((s) => [s._id, { id: s._id, name: s.name, studentId: s.studentId }])
    );

    const formattedFeedbacks = feedbacks.map((f) => ({
      ...f,
      id: f._id,
      student: studentMap.get(f.studentId) || null,
    }));

    const totalCount = formattedFeedbacks.length;
    const avgRating =
      totalCount > 0
        ? (formattedFeedbacks.reduce((acc, f) => acc + f.rating, 0) / totalCount).toFixed(1)
        : "5.0";

    const ratingDistribution = {
      5: formattedFeedbacks.filter((f) => f.rating === 5).length,
      4: formattedFeedbacks.filter((f) => f.rating === 4).length,
      3: formattedFeedbacks.filter((f) => f.rating === 3).length,
      2: formattedFeedbacks.filter((f) => f.rating === 2).length,
      1: formattedFeedbacks.filter((f) => f.rating === 1).length,
    };

    return successResponse({
      totalCount,
      avgRating: Number(avgRating),
      ratingDistribution,
      feedbacks: formattedFeedbacks,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
