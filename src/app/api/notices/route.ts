import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Notice } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const priority = searchParams.get("priority");

    const now = new Date();
    const query: any = {
      isPublished: true,
      $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
    };

    if (session.role === "STUDENT") {
      query.targetAudience = { $in: ["ALL", "STUDENTS"] };
    }

    if (priority && priority !== "ALL") {
      query.priority = priority;
    }

    const notices = await Notice.find(query).sort({ publishDate: -1 }).lean();

    return successResponse(notices.map((n) => ({ ...n, id: n._id })));
  } catch (error) {
    return errorResponse(error);
  }
}
