import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting HostelHub database seeding...");

  // Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.visitorPass.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.complaintComment.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.roomAllocation.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.block.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.student.deleteMany();
  await prisma.hostel.deleteMany();
  await prisma.roleEntity.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.messMenu.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleared old tables.");

  // 1. Roles
  const roles = [
    { code: "STUDENT", name: "Student Resident", permissions: JSON.stringify(["COMPLAINT_CREATE", "LEAVE_REQUEST_CREATE", "VISITOR_REGISTER"]) },
    { code: "WARDEN", name: "Hostel Warden", permissions: JSON.stringify(["COMPLAINT_ASSIGN", "COMPLAINT_UPDATE_STATUS", "LEAVE_REQUEST_ADJUDICATE", "ATTENDANCE_RECORD", "NOTICE_PUBLISH"]) },
    { code: "ADMIN", name: "Hostel Administrator", permissions: JSON.stringify(["ROOM_MANAGE", "BED_ALLOCATE", "BED_TRANSFER", "BED_VACATE", "USER_MANAGE", "AUDIT_LOG_VIEW"]) },
    { code: "SUPER_ADMIN", name: "Super Administrator / Management", permissions: JSON.stringify(["ALL"]) },
    { code: "SECURITY", name: "Campus Security Staff", permissions: JSON.stringify(["VISITOR_CHECK_IN_OUT"]) },
  ];
  for (const r of roles) {
    await prisma.roleEntity.create({ data: r });
  }

  // 2. Passwords
  const adminPass = await bcrypt.hash("admin123", 10);
  const wardenPass = await bcrypt.hash("warden123", 10);
  const studentPass = await bcrypt.hash("student123", 10);
  const securityPass = await bcrypt.hash("security123", 10);

  // 3. System Settings
  const settings = [
    { key: "CURFEW_TIME", value: "22:30", description: "Standard resident curfew check-in time", category: "CURFEW" },
    { key: "MAX_LEAVE_DAYS", value: "14", description: "Maximum consecutive leave permitted online", category: "GENERAL" },
    { key: "AUTO_PASS_EXPIRY_HOURS", value: "4", description: "Visitor pass default duration in hours", category: "SECURITY" },
    { key: "CAMPUS_NAME", value: "North Campus Central", description: "Institution Campus Label", category: "GENERAL" },
  ];
  for (const s of settings) {
    await prisma.systemSetting.create({ data: s });
  }

  // 4. Hostel & Physical Topology
  const hostel = await prisma.hostel.create({
    data: {
      code: "H-NORTH-01",
      name: "St. Jude Hall of Residence",
      description: "North Campus Senior & Undergraduate Residence Wing",
      address: "Gate 3, North Academic Enclave",
      genderType: "CO_ED",
      totalBlocks: 3,
      totalRooms: 120,
      totalCapacity: 280,
      status: "ACTIVE",
    },
  });

  const blockC = await prisma.block.create({
    data: {
      hostelId: hostel.id,
      code: "BLK-C",
      name: "Block C — North Wing",
      totalFloors: 4,
      totalRooms: 40,
      status: "ACTIVE",
    },
  });

  const floor2 = await prisma.floor.create({
    data: {
      blockId: blockC.id,
      floorNumber: 2,
      name: "Second Floor",
      totalRooms: 10,
    },
  });

  const floor3 = await prisma.floor.create({
    data: {
      blockId: blockC.id,
      floorNumber: 3,
      name: "Third Floor",
      totalRooms: 10,
    },
  });

  // Rooms & Beds
  const room204 = await prisma.room.create({
    data: {
      floorId: floor2.id,
      roomNumber: "204",
      roomType: "DOUBLE",
      capacity: 2,
      occupiedBeds: 1,
      status: "ACTIVE",
    },
  });

  const bed204A = await prisma.bed.create({
    data: { roomId: room204.id, bedNumber: "A", status: "OCCUPIED" },
  });
  const bed204B = await prisma.bed.create({
    data: { roomId: room204.id, bedNumber: "B", status: "AVAILABLE" },
  });

  const room205 = await prisma.room.create({
    data: {
      floorId: floor2.id,
      roomNumber: "205",
      roomType: "SINGLE",
      capacity: 1,
      occupiedBeds: 1,
      status: "ACTIVE",
    },
  });

  const bed205A = await prisma.bed.create({
    data: { roomId: room205.id, bedNumber: "A", status: "OCCUPIED" },
  });

  const room301 = await prisma.room.create({
    data: {
      floorId: floor3.id,
      roomNumber: "301",
      roomType: "DOUBLE",
      capacity: 2,
      occupiedBeds: 1,
      status: "ACTIVE",
    },
  });

  const bed301A = await prisma.bed.create({
    data: { roomId: room301.id, bedNumber: "A", status: "OCCUPIED" },
  });
  const bed301B = await prisma.bed.create({
    data: { roomId: room301.id, bedNumber: "B", status: "AVAILABLE" },
  });

  // 5. Users & Profiles
  // Admin
  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@hostelhub.campus.edu",
      passwordHash: adminPass,
      role: "ADMIN",
      status: "ACTIVE",
      staff: {
        create: {
          employeeId: "ADM-001",
          name: "Dr. Evelyn Reed",
          email: "admin@hostelhub.campus.edu",
          phone: "+91 98765 00001",
          role: "ADMIN",
          designation: "Dean of Student Housing & Facilities",
          assignedHostelId: hostel.id,
        },
      },
    },
    include: { staff: true },
  });

  // Wardens
  const wardenUser = await prisma.user.create({
    data: {
      username: "warden.vance",
      email: "m.vance@hostelhub.campus.edu",
      passwordHash: wardenPass,
      role: "WARDEN",
      status: "ACTIVE",
      staff: {
        create: {
          employeeId: "WDN-101",
          name: "Marcus Vance",
          email: "m.vance@hostelhub.campus.edu",
          phone: "+91 98765 11101",
          role: "WARDEN",
          designation: "Lead Residential Warden • Block C",
          assignedHostelId: hostel.id,
        },
      },
    },
    include: { staff: true },
  });

  const wardenSarah = await prisma.user.create({
    data: {
      username: "warden.sarah",
      email: "s.jenkins@hostelhub.campus.edu",
      passwordHash: wardenPass,
      role: "WARDEN",
      status: "ACTIVE",
      staff: {
        create: {
          employeeId: "WDN-102",
          name: "Sarah Jenkins",
          email: "s.jenkins@hostelhub.campus.edu",
          phone: "+91 98765 11102",
          role: "WARDEN",
          designation: "Associate Warden • Wing A",
          assignedHostelId: hostel.id,
        },
      },
    },
  });

  // Security
  const securityUser = await prisma.user.create({
    data: {
      username: "security.raj",
      email: "security.gate1@hostelhub.campus.edu",
      passwordHash: securityPass,
      role: "SECURITY",
      status: "ACTIVE",
      staff: {
        create: {
          employeeId: "SEC-201",
          name: "Rajesh Kumar",
          email: "security.gate1@hostelhub.campus.edu",
          phone: "+91 98765 22201",
          role: "SECURITY",
          designation: "Chief Security Officer • Main Gate",
          assignedHostelId: hostel.id,
        },
      },
    },
  });

  // Students
  const alexUser = await prisma.user.create({
    data: {
      username: "student.alex",
      email: "alex.rivers@student.campus.edu",
      passwordHash: studentPass,
      role: "STUDENT",
      status: "ACTIVE",
      student: {
        create: {
          studentId: "STU-2026-0042",
          name: "Alex Rivers",
          email: "alex.rivers@student.campus.edu",
          phone: "+91 91234 56780",
          course: "B.Tech Computer Science & Engineering",
          department: "School of Engineering & Applied Tech",
          yearOfStudy: 3,
          gender: "MALE",
          emergencyContactName: "Robert Rivers (Father)",
          emergencyContactPhone: "+91 98111 22233",
          address: "42 Greenfield Avenue, Metro Heights",
          status: "ACTIVE",
        },
      },
    },
    include: { student: true },
  });

  const priyaUser = await prisma.user.create({
    data: {
      username: "student.priya",
      email: "priya.sharma@student.campus.edu",
      passwordHash: studentPass,
      role: "STUDENT",
      status: "ACTIVE",
      student: {
        create: {
          studentId: "STU-2026-0088",
          name: "Priya Sharma",
          email: "priya.sharma@student.campus.edu",
          phone: "+91 91234 56781",
          course: "B.Tech Artificial Intelligence & Data",
          department: "School of Computing",
          yearOfStudy: 2,
          gender: "FEMALE",
          emergencyContactName: "Dr. Sunita Sharma (Mother)",
          emergencyContactPhone: "+91 98111 44455",
          address: "18 Cyber City Towers, Sector 4",
          status: "ACTIVE",
        },
      },
    },
    include: { student: true },
  });

  const jordanUser = await prisma.user.create({
    data: {
      username: "student.jordan",
      email: "jordan.lee@student.campus.edu",
      passwordHash: studentPass,
      role: "STUDENT",
      status: "ACTIVE",
      student: {
        create: {
          studentId: "STU-2026-0105",
          name: "Jordan Lee",
          email: "jordan.lee@student.campus.edu",
          phone: "+91 91234 56782",
          course: "Bachelor of Architecture (B.Arch)",
          department: "School of Design & Environment",
          yearOfStudy: 4,
          gender: "MALE",
          emergencyContactName: "Margaret Lee (Guardian)",
          emergencyContactPhone: "+91 98111 66677",
          address: "9 Westlake Enclave, Ridge Road",
          status: "ACTIVE",
        },
      },
    },
    include: { student: true },
  });

  // 6. Room Allocations
  if (alexUser.student) {
    await prisma.roomAllocation.create({
      data: {
        studentId: alexUser.student.id,
        bedId: bed204A.id,
        academicYear: "2026-2027",
        status: "ACTIVE",
        remarks: "Allocated standard double room occupancy",
      },
    });
  }

  if (priyaUser.student) {
    await prisma.roomAllocation.create({
      data: {
        studentId: priyaUser.student.id,
        bedId: bed205A.id,
        academicYear: "2026-2027",
        status: "ACTIVE",
        remarks: "Merit single room accommodation",
      },
    });
  }

  if (jordanUser.student) {
    await prisma.roomAllocation.create({
      data: {
        studentId: jordanUser.student.id,
        bedId: bed301A.id,
        academicYear: "2026-2027",
        status: "ACTIVE",
        remarks: "Senior year assignment",
      },
    });
  }

  // 7. Complaints
  if (alexUser.student && wardenUser.staff) {
    const complaint1 = await prisma.complaint.create({
      data: {
        complaintCode: "CMP-2026-0012",
        studentId: alexUser.student.id,
        category: "ELECTRICAL",
        title: "Faulty AC Unit & Thermostat Failure",
        description: "The air conditioning unit in Room 204 trips the sub-circuit breaker after 15 minutes of operation. Cooling coils iced up.",
        location: "Block C • Room 204",
        priority: "HIGH",
        status: "IN_PROGRESS",
        assignedStaffId: wardenUser.staff.id,
      },
    });

    await prisma.complaintComment.create({
      data: {
        complaintId: complaint1.id,
        authorId: wardenUser.id,
        authorRole: "WARDEN",
        authorName: "Marcus Vance",
        comment: "Dispatched campus senior electrician team. Estimated inspection at 14:00 today.",
        isInternal: false,
      },
    });

    await prisma.complaint.create({
      data: {
        complaintCode: "CMP-2026-0013",
        studentId: alexUser.student.id,
        category: "INTERNET_WIFI",
        title: "Ethernet port jack dead on wall socket B",
        description: "Wall RJ45 jack does not supply link negotiation. Wi-Fi signal drops during evening peak hours.",
        location: "Block C • Room 204",
        priority: "MEDIUM",
        status: "SUBMITTED",
      },
    });
  }

  if (priyaUser.student) {
    await prisma.complaint.create({
      data: {
        complaintCode: "CMP-2026-0014",
        studentId: priyaUser.student.id,
        category: "PLUMBING",
        title: "Low water pressure in 2nd Floor West Wing washroom",
        description: "Hot water geyser valve leaking, resulting in very low flow rate in shower stall 2.",
        location: "Block C • 2nd Floor Common Facilities",
        priority: "MEDIUM",
        status: "ASSIGNED",
      },
    });
  }

  // 8. Leave Requests
  if (alexUser.student) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const returnDate = new Date(tomorrow);
    returnDate.setDate(returnDate.getDate() + 2);
    returnDate.setHours(20, 0, 0, 0);

    await prisma.leaveRequest.create({
      data: {
        requestCode: "LEV-2026-0089",
        studentId: alexUser.student.id,
        leaveType: "OVERNIGHT",
        startDate: tomorrow,
        endDate: returnDate,
        reason: "Attending sister's wedding ceremony in home town",
        destination: "Metro Heights, Sector 12",
        emergencyContact: "+91 98111 22233",
        status: "SUBMITTED",
      },
    });

    const pastStart = new Date();
    pastStart.setDate(pastStart.getDate() - 5);
    const pastEnd = new Date();
    pastEnd.setDate(pastEnd.getDate() - 3);

    await prisma.leaveRequest.create({
      data: {
        requestCode: "LEV-2026-0072",
        studentId: alexUser.student.id,
        leaveType: "DAY_OUTING",
        startDate: pastStart,
        endDate: pastEnd,
        reason: "Regional Inter-College Hackathon Finals",
        destination: "City Innovation Centre",
        emergencyContact: "+91 98111 22233",
        status: "COMPLETED",
        reviewedById: wardenUser.id,
        reviewedAt: pastStart,
        reviewRemarks: "Approved by Lead Warden. Curfew extension verified.",
      },
    });
  }

  // 9. Visitors & Passes
  if (alexUser.student) {
    const visitor = await prisma.visitor.create({
      data: {
        studentId: alexUser.student.id,
        name: "Robert Rivers",
        phone: "+91 98111 22233",
        relationship: "PARENT",
        idProofType: "NATIONAL_ID",
        idProofNumber: "AADHAR-9921-3829-1092",
        address: "Metro Heights",
      },
    });

    const todayVisit = new Date();
    todayVisit.setHours(14, 0, 0, 0);
    const todayExit = new Date(todayVisit);
    todayExit.setHours(17, 30, 0, 0);

    await prisma.visitorPass.create({
      data: {
        visitorId: visitor.id,
        passCode: "VP-2026-0512",
        visitDate: todayVisit,
        expectedEntryTime: todayVisit,
        expectedExitTime: todayExit,
        status: "APPROVED",
        approvedById: wardenUser.id,
        remarks: "Approved for visitor lounge discussion.",
      },
    });
  }

  // 10. Notices
  await prisma.notice.create({
    data: {
      noticeCode: "NOT-2026-001",
      title: "Mandatory Campus Fire Drill & Evacuation Protocol",
      content: "All residents of Block C, A, and B must participate in the institutional fire drill scheduled for Saturday at 10:00 AM. Assembly points are marked at North Lawn.",
      priority: "HIGH",
      targetAudience: "ALL",
      targetHostelId: hostel.id,
      publishedById: wardenUser.id,
      isPublished: true,
      publishDate: new Date(),
    },
  });

  await prisma.notice.create({
    data: {
      noticeCode: "NOT-2026-002",
      title: "Strict Curfew Adherence (22:30 Sharp)",
      content: "Turnstile biometric logs will be enforced from tonight. Any resident returning after 22:30 without an authorized Warden Out-Pass will face gate disciplinary logging.",
      priority: "URGENT",
      targetAudience: "STUDENTS",
      publishedById: wardenUser.id,
      isPublished: true,
      publishDate: new Date(),
    },
  });

  await prisma.notice.create({
    data: {
      noticeCode: "NOT-2026-003",
      title: "Special Sunday Dining Banquet & Feedback Session",
      content: "The Mess Committee will serve a special menu this Sunday. Wardens and student representatives will be present to review feedback on seasonal provisions.",
      priority: "NORMAL",
      targetAudience: "ALL",
      publishedById: adminUser.id,
      isPublished: true,
      publishDate: new Date(),
    },
  });

  // 11. Mess Menus
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  for (const day of days) {
    await prisma.messMenu.create({
      data: {
        dayOfWeek: day,
        mealType: "BREAKFAST",
        items: "Idli, Sambar, Coconut Chutney, Poha, Fresh Fruits, Boiled Eggs, Tea & Coffee",
        timings: "07:30 AM - 09:30 AM",
      },
    });
    await prisma.messMenu.create({
      data: {
        dayOfWeek: day,
        mealType: "LUNCH",
        items: "Steamed Rice, Yellow Dal Tadka, Paneer Butter Masala / Chicken Curry, Mixed Salad, Gulab Jamun",
        timings: "12:30 PM - 02:30 PM",
      },
    });
    await prisma.messMenu.create({
      data: {
        dayOfWeek: day,
        mealType: "SNACKS",
        items: "Crispy Samosa, Veg Cutlet, Tea & Cold Coffee",
        timings: "05:00 PM - 06:15 PM",
      },
    });
    await prisma.messMenu.create({
      data: {
        dayOfWeek: day,
        mealType: "DINNER",
        items: "Butter Roti, Jeera Rice, Rajma Masala, Palak Corn, Curd, Seasonal Custard",
        timings: "08:00 PM - 10:00 PM",
      },
    });
  }

  // 12. Attendance
  const todayStr = new Date().toISOString().split("T")[0];
  if (alexUser.student) {
    await prisma.attendance.create({
      data: {
        studentId: alexUser.student.id,
        date: todayStr,
        status: "PRESENT",
        markedById: wardenUser.id,
        remarks: "Verified present in Room 204 during 21:00 evening roll call",
      },
    });
  }
  if (priyaUser.student) {
    await prisma.attendance.create({
      data: {
        studentId: priyaUser.student.id,
        date: todayStr,
        status: "PRESENT",
        markedById: wardenUser.id,
        remarks: "Verified present in Room 205",
      },
    });
  }

  // 13. Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: adminUser.id,
      actorRole: "ADMIN",
      actorName: "Dr. Evelyn Reed",
      action: "ROOM_ALLOCATED",
      targetType: "RoomAllocation",
      targetId: bed204A.id,
      details: JSON.stringify({ student: "Alex Rivers", room: "204", bed: "A", year: "2026-2027" }),
    },
  });

  console.log("✅ Database successfully seeded with 22 entities & realistic campus fixtures!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
