import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, NotFoundError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const menus = await prisma.messMenu.findMany({
      orderBy: [{ dayOfWeek: "asc" }, { mealType: "asc" }],
    });

    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const todayName = days[new Date().getDay()];

    const todayMeals = menus.filter((m) => m.dayOfWeek === todayName);

    return successResponse({
      todayDay: todayName,
      todayMeals,
      allMenus: menus,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();

    const { title, comments, rating, category } = body;
    if (!title || !comments) {
      throw new BadRequestError("Title and feedback comments are required");
    }

    let studentId = "";
    if (session.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
      });
      if (!student) throw new NotFoundError("Student record not found");
      studentId = student.id;
    } else {
      throw new BadRequestError("Feedback can only be submitted by resident students");
    }

    const feedback = await prisma.feedback.create({
      data: {
        studentId,
        category: category || "MESS",
        title,
        comments,
        rating: typeof rating === "number" ? Math.min(5, Math.max(1, rating)) : 5,
        status: "RECEIVED",
      },
    });

    return successResponse(feedback, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
