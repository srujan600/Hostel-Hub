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

    // 1. Current Active Allocation
    let roomData: any = null;
    const activeAlloc = await RoomAllocation.findOne({
      studentId: student._id,
      status: "ACTIVE",
    }).lean();

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

    // 2. Active Complaints
    const [complaints, pendingComplaintsCount] = await Promise.all([
      Complaint.find({ studentId: student._id }).sort({ createdAt: -1 }).limit(5).lean(),
      Complaint.countDocuments({
        studentId: student._id,
        status: { $in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
      }),
    ]);

    // 3. Active / Recent Leave Requests
    const [leaveRequests, pendingLeaveCount] = await Promise.all([
      LeaveRequest.find({ studentId: student._id }).sort({ createdAt: -1 }).limit(3).lean(),
      LeaveRequest.countDocuments({
        studentId: student._id,
        status: "SUBMITTED",
      }),
    ]);

    // 4. Latest Notices
    const notices = await Notice.find({
      isPublished: true,
      targetAudience: { $in: ["ALL", "STUDENTS"] },
    })
      .sort({ publishDate: -1 })
      .limit(4)
      .lean();

    // 5. Today's Mess Menu
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
    const todayDayName = days[new Date().getDay()];
    const todayMeals = await MessMenu.find({ dayOfWeek: todayDayName }).lean();

    // 6. Today's Attendance
    const todayDateStr = new Date().toISOString().split("T")[0];
    const todayAttendance = await Attendance.findOne({
      studentId: student._id,
      date: todayDateStr,
    }).lean();

    // 7. System Curfew Setting
    const curfewSetting = await SystemSetting.findOne({ key: "CURFEW_TIME" }).lean();

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
