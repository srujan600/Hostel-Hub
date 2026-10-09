import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Staff, User, Hostel, Complaint } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Administrator privileges required");
    }

    const { id } = await params;
    await connectToDatabase();

    const staff = await Staff.findById(id).lean();
    if (!staff) {
      throw new NotFoundError("Staff profile not found");
    }

    const [user, hostel, complaints] = await Promise.all([
      User.findById(staff.userId, { username: 1, status: 1, createdAt: 1 }).lean(),
      staff.assignedHostelId ? Hostel.findById(staff.assignedHostelId).lean() : null,
      Complaint.find({ assignedStaffId: staff._id }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return successResponse({
      ...staff,
      id: staff._id,
      user: user ? { ...user, id: user._id } : null,
      assignedHostel: hostel ? { ...hostel, id: hostel._id } : null,
      assignedComplaints: complaints.map((c) => ({ ...c, id: c._id })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: Administrator privileges required");
    }

    const { id } = await params;
    const body = await req.json();
    const { name, phone, designation, assignedHostelId, status } = body;

    await connectToDatabase();

    const staff = await Staff.findById(id);
    if (!staff) {
      throw new NotFoundError("Staff profile not found");
    }

    if (name) staff.name = name.trim();
    if (phone) staff.phone = phone.trim();
    if (designation) staff.designation = designation.trim();
    if (assignedHostelId !== undefined) staff.assignedHostelId = assignedHostelId;
    if (status) staff.status = status;

    await staff.save();

    if (status) {
      await User.updateOne({ _id: staff.userId }, { $set: { status } });
    }

    const assignedHostel = staff.assignedHostelId
      ? await Hostel.findById(staff.assignedHostelId).lean()
      : null;

    await AuditService.record({
      actorId: session.id,
      actorRole: session.role,
      actorName: session.name,
      action: "STAFF_UPDATED",
      targetType: "Staff",
      targetId: id,
      details: body,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse({
      ...staff.toJSON(),
      assignedHostel: assignedHostel ? { ...assignedHostel, id: assignedHostel._id } : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
