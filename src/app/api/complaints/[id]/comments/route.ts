import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();

    const commentText = body.comment?.trim();
    if (!commentText) {
      throw new BadRequestError("Comment text is required");
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      throw new NotFoundError("Complaint ticket not found");
    }

    if (session.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
      });
      if (complaint.studentId !== student?.id) {
        throw new ForbiddenError("You cannot comment on another student's complaint");
      }
    }

    const comment = await prisma.complaintComment.create({
      data: {
        complaintId: complaint.id,
        authorId: session.id,
        authorRole: session.role,
        authorName: session.name,
        comment: commentText,
        isInternal: body.isInternal === true && session.role !== "STUDENT",
      },
    });

    return successResponse(comment, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
