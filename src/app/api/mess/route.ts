import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MessMenu, Feedback, Student } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, NotFoundError, ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    await connectToDatabase();

    const menus = await MessMenu.find().sort({ dayOfWeek: 1, mealType: 1 }).lean();

    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const todayName = days[new Date().getDay()];

    const formattedMenus = menus.map((m) => ({ ...m, id: m._id }));
    const todayMeals = formattedMenus.filter((m) => m.dayOfWeek === todayName);

    return successResponse({
      todayDay: todayName,
      todayMeals,
      allMenus: formattedMenus,
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

    await connectToDatabase();

    let studentId = "";
    if (session.role === "STUDENT") {
      const student = await Student.findOne({ userId: session.id }).lean();
      if (!student) throw new NotFoundError("Student record not found");
      studentId = student._id;
    } else {
      throw new BadRequestError("Feedback can only be submitted by resident students");
    }

    const feedback = await Feedback.create({
      studentId,
      category: category || "MESS",
      title,
      comments,
      rating: typeof rating === "number" ? Math.min(5, Math.max(1, rating)) : 5,
      status: "RECEIVED",
    });

    return successResponse(feedback.toJSON(), 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Staff authorization required to edit mess menu");
    }

    const body = await req.json();
    const { dayOfWeek, mealType, items, timings } = body;

    if (!dayOfWeek || !mealType || !items) {
      throw new BadRequestError("Day of week, meal type, and items are required");
    }

    await connectToDatabase();

    const updated = await MessMenu.findOneAndUpdate(
      { dayOfWeek, mealType },
      {
        $set: {
          items: items.trim(),
          ...(timings ? { timings: timings.trim() } : {}),
        },
        $setOnInsert: {
          timings: timings ? timings.trim() : "08:00 - 10:00 AM",
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return successResponse(updated.toJSON());
  } catch (error) {
    return errorResponse(error);
  }
}
