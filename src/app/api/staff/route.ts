import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const staffList = await prisma.staff.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        designation: true,
        assignedHostelId: true,
      },
      orderBy: { name: "asc" },
    });

    return successResponse(staffList);
  } catch (error) {
    return errorResponse(error);
  }
}
