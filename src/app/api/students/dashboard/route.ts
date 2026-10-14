import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import {
  Student,
  RoomAllocation,
  Bed,
  Room,
  Floor,
  Block,
  Hostel,
  Complaint,
  LeaveRequest,
  Notice,
  MessMenu,
  Attendance,
  SystemSetting,
} from "@/models";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "STUDENT") {
      throw new ForbiddenError("Student dashboard is reserved for resident students");
    }

    await connectToDatabase();

    const student = await Student.findOne({ userId: session.id }).lean();
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
    const todayDayName = days[new Date().getDay()];
    const todayDateStr = new Date().toISOString().split("T")[0];

    // Parallel fetch allocation, complaints, leaves, notices, mess, attendance, and curfew
    const [
      activeAlloc,
      [complaints, pendingComplaintsCount],
      [leaveRequests, pendingLeaveCount],
      notices,
      todayMeals,
      todayAttendance,
      curfewSetting,
    ] = await Promise.all([
      RoomAllocation.findOne({
        studentId: student._id,
        status: "ACTIVE",
      }).lean(),
      Promise.all([
        Complaint.find({ studentId: student._id }).sort({ createdAt: -1 }).limit(5).lean(),
        Complaint.countDocuments({
          studentId: student._id,
          status: { $in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
        }),
      ]),
      Promise.all([
        LeaveRequest.find({ studentId: student._id }).sort({ createdAt: -1 }).limit(3).lean(),
        LeaveRequest.countDocuments({
          studentId: student._id,
          status: "SUBMITTED",
        }),
      ]),
      Notice.find({
        isPublished: true,
        targetAudience: { $in: ["ALL", "STUDENTS"] },
      })
        .sort({ publishDate: -1 })
        .limit(4)
        .lean(),
      MessMenu.find({ dayOfWeek: todayDayName }).lean(),
      Attendance.findOne({
        studentId: student._id,
        date: todayDateStr,
      }).lean(),
      SystemSetting.findOne({ key: "CURFEW_TIME" }).lean(),
    ]);

    // Current Active Allocation resolution
    let roomData: any = null;
    if (activeAlloc) {
      const bed = await Bed.findById(activeAlloc.bedId).lean();
      if (bed) {
        const room = await Room.findById(bed.roomId).lean();
        if (room) {
          const floor = await Floor.findById(room.floorId).lean();
          if (floor) {
            const block = await Block.findById(floor.blockId).lean();
            if (block) {
              const hostel = await Hostel.findById(block.hostelId).lean();
              roomData = {
                hostelName: hostel ? hostel.name : "N/A",
                hostelCode: hostel ? hostel.code : "N/A",
                blockName: block.name,
                blockCode: block.code,
                floorName: floor.name,
                roomNumber: room.roomNumber,
                roomType: room.roomType,
                bedNumber: bed.bedNumber,
                academicYear: activeAlloc.academicYear,
              };
            }
          }
        }
      }
    }

    return successResponse({
      student: {
        id: student._id,
        name: student.name,
        studentId: student.studentId,
        course: student.course,
        department: student.department,
        yearOfStudy: student.yearOfStudy,
      },
      room: roomData,
      stats: {
        pendingComplaints: pendingComplaintsCount,
        pendingLeaves: pendingLeaveCount,
        todayAttendanceStatus: todayAttendance ? todayAttendance.status : "UNMARKED",
        curfewTime: curfewSetting?.value || "22:30",
      },
      recentComplaints: complaints.map((c: any) => ({ ...c, id: c._id })),
      recentLeaves: leaveRequests.map((l: any) => ({ ...l, id: l._id })),
      notices: notices.map((n: any) => ({ ...n, id: n._id })),
      todayMeals: todayMeals.map((m: any) => ({ ...m, id: m._id })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
