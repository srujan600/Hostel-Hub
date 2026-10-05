import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const whereClause: any = {};
    if (session.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
      });
      if (!student) throw new NotFoundError("Student record not found");
      whereClause.studentId = student.id;
    }

    const visitors = await prisma.visitor.findMany({
      where: whereClause,
      include: {
        passes: {
          orderBy: { visitDate: "desc" },
        },
        student: {
          select: {
            name: true,
            studentId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(visitors);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();

    const { name, phone, relationship, idProofType, idProofNumber, visitDate, expectedEntryTime, expectedExitTime } = body;

    if (!name || !phone || !relationship) {
      throw new BadRequestError("Visitor name, phone, and relationship are required");
    }

    let studentId = "";
    if (session.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
      });
      if (!student) throw new NotFoundError("Student record not found");
      studentId = student.id;
    } else {
      studentId = body.studentId;
      if (!studentId) throw new BadRequestError("Student ID is required");
    }

    // 1. Create or find existing visitor record
    let visitor = await prisma.visitor.findFirst({
      where: { studentId, phone },
    });

    if (!visitor) {
      visitor = await prisma.visitor.create({
        data: {
          studentId,
          name,
          phone,
          relationship,
          idProofType: idProofType || "NATIONAL_ID",
          idProofNumber: idProofNumber || null,
        },
      });
    }

    // 2. Generate pass
    const passCount = await prisma.visitorPass.count();
    const passCode = `VP-2026-${String(passCount + 1).padStart(4, "0")}`;

    const dateVal = visitDate ? new Date(visitDate) : new Date();
    const entryVal = expectedEntryTime ? new Date(expectedEntryTime) : new Date();
    const exitVal = expectedExitTime ? new Date(expectedExitTime) : new Date(Date.now() + 3 * 60 * 60 * 1000);

    const pass = await prisma.visitorPass.create({
      data: {
        visitorId: visitor.id,
        passCode,
        visitDate: dateVal,
        expectedEntryTime: entryVal,
        expectedExitTime: exitVal,
        status: "APPROVED", // Auto-approved for recognized family/guest or pending
        remarks: "Online student pre-registration",
      },
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "VISITOR_REGISTERED",
      targetType: "VisitorPass",
      targetId: pass.id,
      details: { visitorName: name, passCode, relationship },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse({ visitor, pass }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
