import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User, Student, Staff, RoomAllocation, Bed, Room, Floor, Block, Hostel } from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    await connectToDatabase();

    // Refresh from database to ensure up-to-date role and status
    const user = await User.findById(session.id);

    if (!user) {
      throw new NotFoundError("User account not found");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedError(`Account status is '${user.status}'. Session terminated.`);
    }

    let studentProfileData: any = null;
    let staffProfileData: any = null;
    let activeAllocation: any = null;

    if (user.role === "STUDENT") {
      const student = await Student.findOne({ userId: user._id });
      if (student) {
        const alloc = await RoomAllocation.findOne({
          studentId: student._id,
          status: "ACTIVE",
        });

        if (alloc) {
          const bed = await Bed.findById(alloc.bedId);
          if (bed) {
            const room = await Room.findById(bed.roomId);
            if (room) {
              const floor = await Floor.findById(room.floorId);
              if (floor) {
                const block = await Block.findById(floor.blockId);
                if (block) {
                  const hostel = await Hostel.findById(block.hostelId);
                  activeAllocation = {
                    allocationId: alloc._id,
                    academicYear: alloc.academicYear,
                    hostel: hostel ? hostel.name : "N/A",
                    hostelCode: hostel ? hostel.code : "N/A",
                    block: block.name,
                    blockCode: block.code,
                    floor: floor.name,
                    roomNumber: room.roomNumber,
                    bedNumber: bed.bedNumber,
                    roomType: room.roomType,
                  };
                }
              }
            }
          }
        }

        studentProfileData = {
          studentId: student.studentId,
          course: student.course,
          department: student.department,
          yearOfStudy: student.yearOfStudy,
          phone: student.phone,
          emergencyContactName: student.emergencyContactName,
          emergencyContactPhone: student.emergencyContactPhone,
          activeAllocation,
        };
      }
    } else {
      const staff = await Staff.findOne({ userId: user._id });
      if (staff) {
        let assignedHostelData: any = null;
        if (staff.assignedHostelId) {
          const hostel = await Hostel.findById(staff.assignedHostelId);
          if (hostel) {
            assignedHostelData = {
              id: hostel._id,
              name: hostel.name,
              code: hostel.code,
            };
          }
        }

        staffProfileData = {
          employeeId: staff.employeeId,
          designation: staff.designation,
          phone: staff.phone,
          assignedHostel: assignedHostelData,
        };
      }
    }

    return successResponse({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      name:
        (user.role === "STUDENT" ? studentProfileData?.name : staffProfileData?.name) ||
        user.username,
      studentProfile: studentProfileData,
      staffProfile: staffProfileData,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
