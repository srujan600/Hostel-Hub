import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Staff } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    await connectToDatabase();

    const staffList = await Staff.find(
      { status: "ACTIVE" },
      {
        _id: 1,
        employeeId: 1,
        name: 1,
        email: 1,
        phone: 1,
        role: 1,
        designation: 1,
        assignedHostelId: 1,
      }
    )
      .sort({ name: 1 })
      .lean();

    return successResponse(staffList.map((s) => ({ ...s, id: s._id })));
  } catch (error) {
    return errorResponse(error);
  }
}
