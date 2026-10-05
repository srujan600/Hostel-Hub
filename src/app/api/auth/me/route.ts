import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    // Refresh from database to ensure up-to-date role and status
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        student: {
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
          },
        },
        staff: {
          include: {
            assignedHostel: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User account not found");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedError(`Account status is '${user.status}'. Session terminated.`);
    }

    let activeAllocation: any = null;
    if (user.role === "STUDENT" && user.student?.allocations?.[0]) {
      const alloc = user.student.allocations[0];
      activeAllocation = {
        allocationId: alloc.id,
        academicYear: alloc.academicYear,
        hostel: alloc.bed.room.floor.block.hostel.name,
        hostelCode: alloc.bed.room.floor.block.hostel.code,
        block: alloc.bed.room.floor.block.name,
        blockCode: alloc.bed.room.floor.block.code,
        floor: alloc.bed.room.floor.name,
        roomNumber: alloc.bed.room.roomNumber,
        bedNumber: alloc.bed.bedNumber,
        roomType: alloc.bed.room.roomType,
      };
    }

    return successResponse({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      name: user.student?.name || user.staff?.name || user.username,
      studentProfile: user.student
        ? {
            studentId: user.student.studentId,
            course: user.student.course,
            department: user.student.department,
            yearOfStudy: user.student.yearOfStudy,
            phone: user.student.phone,
            emergencyContactName: user.student.emergencyContactName,
            emergencyContactPhone: user.student.emergencyContactPhone,
            activeAllocation,
          }
        : null,
      staffProfile: user.staff
        ? {
            employeeId: user.staff.employeeId,
            designation: user.staff.designation,
            phone: user.staff.phone,
            assignedHostel: user.staff.assignedHostel
              ? {
                  id: user.staff.assignedHostel.id,
                  name: user.staff.assignedHostel.name,
                  code: user.staff.assignedHostel.code,
                }
              : null,
          }
        : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
