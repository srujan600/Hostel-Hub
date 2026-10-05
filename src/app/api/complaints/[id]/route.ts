import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
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
        assignedStaff: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            designation: true,
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundError("Complaint ticket not found");
    }

    // Role isolation check: student can only view their own ticket
    if (session.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
      });
      if (complaint.studentId !== student?.id) {
        throw new ForbiddenError("You do not have access to view this complaint");
      }
    }

    return successResponse(complaint);
  } catch (error) {
    return errorResponse(error);
  }
}
