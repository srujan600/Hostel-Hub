import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "WARDEN" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Warden authorization required");
    }

    const { searchParams } = new URL(req.url);
    const blockFilter = searchParams.get("block");
    const floorFilter = searchParams.get("floor");

    const hostels = await prisma.hostel.findMany({
      include: {
        blocks: {
          where: blockFilter && blockFilter !== "ALL" ? { code: blockFilter } : undefined,
          include: {
            floors: {
              where: floorFilter && floorFilter !== "ALL" ? { floorNumber: parseInt(floorFilter, 10) } : undefined,
              include: {
                rooms: {
                  include: {
                    beds: {
                      include: {
                        allocations: {
                          where: { status: "ACTIVE" },
                          include: {
                            student: {
                              select: {
                                id: true,
                                name: true,
                                studentId: true,
                                course: true,
                                phone: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return successResponse(hostels);
  } catch (error) {
    return errorResponse(error);
  }
}
