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
    const search = searchParams.get("search")?.toLowerCase().trim();
    const course = searchParams.get("course");
    const status = searchParams.get("status");

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { studentId: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    if (course && course !== "ALL") {
      whereClause.course = { contains: course };
    }
    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        allocations: {
          where: { status: "ACTIVE" },
          include: {
            bed: {
              include: {
                room: {
                  include: {
                    floor: {
                      include: {
                        block: {
                          include: {
                            hostel: true,
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
        complaints: {
          where: { status: { in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] } },
          select: { id: true, complaintCode: true, title: true, status: true },
        },
        leaveRequests: {
          where: { status: "SUBMITTED" },
          select: { id: true, requestCode: true, destination: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const formatted = students.map((s) => {
      const activeAlloc = s.allocations[0];
      return {
        id: s.id,
        name: s.name,
        studentId: s.studentId,
        email: s.email,
        phone: s.phone,
        course: s.course,
        department: s.department,
        yearOfStudy: s.yearOfStudy,
        gender: s.gender,
        status: s.status,
        emergencyContactName: s.emergencyContactName,
        emergencyContactPhone: s.emergencyContactPhone,
        address: s.address,
        roomAllocation: activeAlloc
          ? {
              allocationId: activeAlloc.id,
              roomNumber: activeAlloc.bed.room.roomNumber,
              bedNumber: activeAlloc.bed.bedNumber,
              roomType: activeAlloc.bed.room.roomType,
              floor: activeAlloc.bed.room.floor.name,
              block: activeAlloc.bed.room.floor.block.name,
              blockCode: activeAlloc.bed.room.floor.block.code,
              hostel: activeAlloc.bed.room.floor.block.hostel.name,
            }
          : null,
        activeComplaintsCount: s.complaints.length,
        hasPendingLeave: s.leaveRequests.length > 0,
      };
    });

    return successResponse(formatted);
  } catch (error) {
    return errorResponse(error);
  }
}
