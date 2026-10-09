import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Visitor, VisitorPass, Student } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await connectToDatabase();

    const query: any = {};
    if (session.role === "STUDENT") {
      const student = await Student.findOne({ userId: session.id }).lean();
      if (!student) throw new NotFoundError("Student record not found");
      query.studentId = student._id;
    }

    const visitors = await Visitor.find(query).sort({ createdAt: -1 }).lean();
    const visitorIds = visitors.map((v) => v._id);
    const studentIds = [...new Set(visitors.map((v) => v.studentId))];

    const [passes, students] = await Promise.all([
      VisitorPass.find({ visitorId: { $in: visitorIds } }).sort({ visitDate: -1 }).lean(),
      Student.find({ _id: { $in: studentIds } }, { _id: 1, name: 1, studentId: 1 }).lean(),
    ]);

    const passesByVisitor = new Map<string, any[]>();
    passes.forEach((p) => {
      const list = passesByVisitor.get(p.visitorId) || [];
      list.push({ ...p, id: p._id });
      passesByVisitor.set(p.visitorId, list);
    });

    const studentMap = new Map(
      students.map((s) => [s._id, { name: s.name, studentId: s.studentId }])
    );

    const formatted = visitors.map((v) => ({
      ...v,
      id: v._id,
      passes: passesByVisitor.get(v._id) || [],
      student: studentMap.get(v.studentId) || null,
    }));

    return successResponse(formatted);
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

    await connectToDatabase();

    let studentId = "";
    if (session.role === "STUDENT") {
      const student = await Student.findOne({ userId: session.id }).lean();
      if (!student) throw new NotFoundError("Student record not found");
      studentId = student._id;
    } else {
      studentId = body.studentId;
      if (!studentId) throw new BadRequestError("Student ID is required");
    }

    let visitor = await Visitor.findOne({ studentId, phone });

    if (!visitor) {
      visitor = await Visitor.create({
        studentId,
        name,
        phone,
        relationship,
        idProofType: idProofType || "NATIONAL_ID",
        idProofNumber: idProofNumber || null,
      });
    }

    const passCount = await VisitorPass.countDocuments();
    const passCode = `VP-2026-${String(passCount + 1).padStart(4, "0")}`;

    const dateVal = visitDate ? new Date(visitDate) : new Date();

    const parseTime = (timeStr?: string, fallback: Date = new Date()): Date => {
      if (!timeStr) return fallback;
      const parsed = new Date(timeStr);
      if (!isNaN(parsed.getTime())) return parsed;
      if (typeof timeStr === "string" && timeStr.includes(":")) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const d = new Date(dateVal);
        d.setHours(isNaN(hours) ? 0 : hours, isNaN(minutes) ? 0 : minutes, 0, 0);
        if (!isNaN(d.getTime())) return d;
      }
      return fallback;
    };

    const entryVal = parseTime(expectedEntryTime, new Date());
    const exitVal = parseTime(expectedExitTime, new Date(entryVal.getTime() + 3 * 60 * 60 * 1000));

    const pass = await VisitorPass.create({
      visitorId: visitor._id,
      passCode,
      visitDate: dateVal,
      expectedEntryTime: entryVal,
      expectedExitTime: exitVal,
      status: session.role === "STUDENT" ? "PENDING" : "APPROVED",
      remarks: "Online pre-registration",
    });

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "VISITOR_REGISTERED",
      targetType: "VisitorPass",
      targetId: pass._id,
      details: { visitorName: name, passCode, relationship },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse(
      {
        visitor: visitor.toJSON(),
        pass: pass.toJSON(),
      },
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
