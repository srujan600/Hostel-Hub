import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createComplaintSchema } from "@/lib/validations/complaint";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";
import { NotificationService } from "@/services/notification-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const whereClause: any = {};

    // Strict student data isolation: students only see their own complaints
    if (session.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
      });
      if (!student) throw new NotFoundError("Student record not found");
      whereClause.studentId = student.id;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }
    if (category && category !== "ALL") {
      whereClause.category = category;
    }

    const complaints = await prisma.complaint.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
            phone: true,
          },
        },
        assignedStaff: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(complaints);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();

    const parseResult = createComplaintSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid complaint data", parseResult.error.flatten());
    }

    const { category, title, description, location, priority, attachmentUrl } = parseResult.data;

    let studentId = "";
    if (session.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
      });
      if (!student) throw new NotFoundError("Student record not found");
      studentId = student.id;
    } else {
      // If admin/warden submits on behalf of a student
      studentId = body.studentId;
      if (!studentId) {
        throw new BadRequestError("Student ID is required when logging on behalf of a resident");
      }
    }

    // Check duplicate complaint protection (same student, same category, same location within last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const existingDuplicate = await prisma.complaint.findFirst({
      where: {
        studentId,
        category,
        location,
        createdAt: { gte: twoHoursAgo },
        status: { in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
      },
    });

    if (existingDuplicate) {
      throw new BadRequestError(
        `A similar complaint (${existingDuplicate.complaintCode}) was already submitted for ${location} recently. Our team is actively reviewing it.`
      );
    }

    // Generate unique complaint code
    const count = await prisma.complaint.count();
    const complaintCode = `CMP-2026-${String(count + 1).padStart(4, "0")}`;

    const complaint = await prisma.complaint.create({
      data: {
        complaintCode,
        studentId,
        category,
        title,
        description,
        location,
        priority,
        status: "SUBMITTED",
        attachmentUrl: attachmentUrl || null,
      },
      include: {
        student: true,
      },
    });

    // Audit log
    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "COMPLAINT_SUBMITTED",
      targetType: "Complaint",
      targetId: complaint.id,
      details: { code: complaintCode, title, category, priority, location },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    // Send confirmation notification to student
    await NotificationService.send({
      userId: session.id,
      title: "Complaint Lodged Successfully",
      message: `Your ticket ${complaintCode} (${title}) has been received and queued for inspection.`,
      type: "SUCCESS",
      linkUrl: `/student/complaints`,
    });

    return successResponse(complaint, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
