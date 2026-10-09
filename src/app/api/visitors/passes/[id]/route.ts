import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { VisitorPass, Visitor, Student } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);

    if (
      session.role !== "WARDEN" &&
      session.role !== "ADMIN" &&
      session.role !== "SUPER_ADMIN" &&
      session.role !== "SECURITY"
    ) {
      throw new ForbiddenError("Forbidden: Staff authorization required to manage visitor passes");
    }

    const { id } = await params;
    const body = await req.json();
    const { status, remarks } = body;

    await connectToDatabase();

    const pass = await VisitorPass.findById(id);
    if (!pass) {
      throw new NotFoundError("Visitor pass not found");
    }

    const previousStatus = pass.status;

    if (remarks !== undefined) {
      pass.remarks = remarks;
    }

    if (status) {
      pass.status = status;
      if (status === "APPROVED" || status === "REJECTED") {
        pass.approvedById = session.id;
      } else if (status === "CHECKED_IN") {
        if (!pass.actualEntryTime) {
          pass.actualEntryTime = new Date();
        }
      } else if (status === "CHECKED_OUT") {
        if (!pass.actualExitTime) {
          pass.actualExitTime = new Date();
        }
      }
    }

    await pass.save();

    const visitor = await Visitor.findById(pass.visitorId).lean();
    const student = visitor ? await Student.findById(visitor.studentId).lean() : null;

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: `VISITOR_PASS_${status || "UPDATED"}`,
      targetType: "VisitorPass",
      targetId: pass._id,
      details: { passCode: pass.passCode, previousStatus, newStatus: status, remarks },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse({
      ...pass.toJSON(),
      visitor: visitor
        ? {
            ...visitor,
            id: visitor._id,
            student: student ? { ...student, id: student._id } : null,
          }
        : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
