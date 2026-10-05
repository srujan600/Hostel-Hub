import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "STUDENT") {
      throw new ForbiddenError("Room portal is reserved for students");
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.id },
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
                    beds: {
                      include: {
                        allocations: {
                          where: { status: "ACTIVE" },
                          include: {
                            student: true,
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

    if (!student || !student.allocations[0]) {
      return successResponse({
        hasAllocation: false,
        message: "No active room allocation found. Please contact administration.",
      });
    }

    const activeAlloc = student.allocations[0];
    const room = activeAlloc.bed.room;
    const block = room.floor.block;
    const hostel = block.hostel;

    // Map roommates
    const beds = room.beds.map((b) => {
      const activeBedAlloc = b.allocations[0];
      const isCurrentStudent = activeBedAlloc?.studentId === student.id;
      return {
        bedId: b.id,
        bedNumber: b.bedNumber,
        status: b.status,
        isMyBed: isCurrentStudent,
        occupant: activeBedAlloc
          ? {
              name: isCurrentStudent ? `${activeBedAlloc.student.name} (You)` : activeBedAlloc.student.name,
              course: activeBedAlloc.student.course,
              yearOfStudy: activeBedAlloc.student.yearOfStudy,
            }
          : null,
      };
    });

    return successResponse({
      hasAllocation: true,
      allocation: {
        id: activeAlloc.id,
        academicYear: activeAlloc.academicYear,
        allocatedAt: activeAlloc.allocatedAt,
        status: activeAlloc.status,
      },
      hostel: {
        id: hostel.id,
        name: hostel.name,
        code: hostel.code,
        genderType: hostel.genderType,
        address: hostel.address,
      },
      block: {
        id: block.id,
        name: block.name,
        code: block.code,
      },
      floor: {
        id: room.floor.id,
        name: room.floor.name,
        floorNumber: room.floor.floorNumber,
      },
      room: {
        id: room.id,
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        capacity: room.capacity,
        occupiedBeds: room.occupiedBeds,
        status: room.status,
        myBedNumber: activeAlloc.bed.bedNumber,
        beds,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
