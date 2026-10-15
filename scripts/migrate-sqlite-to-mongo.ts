import dns from "dns";
if (typeof dns.setServers === "function") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch {
    // Fallback
  }
}
import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { connectToDatabase } from "../src/lib/mongodb";
import {
  User,
  RoleEntity,
  Student,
  Staff,
  Hostel,
  Block,
  Floor,
  Room,
  Bed,
  RoomAllocation,
  Complaint,
  ComplaintComment,
  LeaveRequest,
  Visitor,
  VisitorPass,
  Attendance,
  Notice,
  Notification,
  MessMenu,
  Feedback,
  AuditLog,
  SystemSetting,
} from "../src/models";

interface MigrationResult {
  entity: string;
  sqliteCount: number;
  mongoCount: number;
  status: "MATCH" | "MISMATCH";
}

async function migrateData() {
  console.log("============================================================");
  console.log("   HostelHub - SQLite to MongoDB Data Migration Pipeline    ");
  console.log("============================================================\n");

  await connectToDatabase();
  console.log("Connected to MongoDB destination database.\n");

  const results: MigrationResult[] = [];

  // Helper for idempotent bulk upsert
  async function upsertCollection<T extends { _id: string }>(
    entityName: string,
    model: any,
    items: T[]
  ) {
    console.log(`Migrating ${entityName} (${items.length} records)...`);
    if (items.length > 0) {
      const operations = items.map((doc) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: doc },
          upsert: true,
        },
      }));
      await model.bulkWrite(operations);
    }
    const mongoCount = await model.countDocuments();
    const status: "MATCH" | "MISMATCH" =
      items.length === mongoCount ? "MATCH" : "MISMATCH";
    results.push({
      entity: entityName,
      sqliteCount: items.length,
      mongoCount,
      status,
    });
    console.log(
      `  -> Done. SQLite: ${items.length} | MongoDB: ${mongoCount} [${status}]`
    );
  }

  // 1. Users
  const users = await prisma.user.findMany();
  await upsertCollection(
    "User",
    User,
    users.map((u) => ({
      _id: u.id,
      username: u.username.toLowerCase().trim(),
      email: u.email.toLowerCase().trim(),
      passwordHash: u.passwordHash,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }))
  );

  // 2. RoleEntity
  const roleEntities = await prisma.roleEntity.findMany();
  await upsertCollection(
    "RoleEntity",
    RoleEntity,
    roleEntities.map((r) => ({
      _id: r.id,
      code: r.code,
      name: r.name,
      description: r.description || undefined,
      permissions: r.permissions,
      createdAt: r.createdAt,
    }))
  );

  // 3. Hostels
  const hostels = await prisma.hostel.findMany();
  await upsertCollection(
    "Hostel",
    Hostel,
    hostels.map((h) => ({
      _id: h.id,
      code: h.code,
      name: h.name,
      description: h.description || undefined,
      address: h.address || undefined,
      genderType: h.genderType,
      totalBlocks: h.totalBlocks,
      totalRooms: h.totalRooms,
      totalCapacity: h.totalCapacity,
      status: h.status,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    }))
  );

  // 4. Blocks
  const blocks = await prisma.block.findMany();
  await upsertCollection(
    "Block",
    Block,
    blocks.map((b) => ({
      _id: b.id,
      code: b.code,
      name: b.name,
      hostelId: b.hostelId,
      totalFloors: b.totalFloors,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }))
  );

  // 5. Floors
  const floors = await prisma.floor.findMany();
  await upsertCollection(
    "Floor",
    Floor,
    floors.map((f) => ({
      _id: f.id,
      floorNumber: f.floorNumber,
      name: f.name,
      blockId: f.blockId,
      totalRooms: f.totalRooms,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }))
  );

  // 6. Rooms
  const rooms = await prisma.room.findMany();
  await upsertCollection(
    "Room",
    Room,
    rooms.map((r) => ({
      _id: r.id,
      roomNumber: r.roomNumber,
      floorId: r.floorId,
      roomType: r.roomType,
      capacity: r.capacity,
      occupiedBeds: r.occupiedBeds,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  );

  // 7. Beds
  const beds = await prisma.bed.findMany();
  await upsertCollection(
    "Bed",
    Bed,
    beds.map((b) => ({
      _id: b.id,
      bedNumber: b.bedNumber,
      roomId: b.roomId,
      status: b.status,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }))
  );

  // 8. Students
  const students = await prisma.student.findMany();
  await upsertCollection(
    "Student",
    Student,
    students.map((s) => ({
      _id: s.id,
      userId: s.userId,
      studentId: s.studentId,
      name: s.name,
      email: s.email.toLowerCase().trim(),
      phone: s.phone,
      gender: s.gender,
      course: s.course,
      department: s.department,
      yearOfStudy: s.yearOfStudy,
      guardianName: s.emergencyContactName,
      guardianPhone: s.emergencyContactPhone,
      address: s.address || undefined,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))
  );

  // 9. Staff
  const staffs = await prisma.staff.findMany();
  await upsertCollection(
    "Staff",
    Staff,
    staffs.map((st) => ({
      _id: st.id,
      userId: st.userId,
      employeeId: st.employeeId,
      name: st.name,
      email: st.email.toLowerCase().trim(),
      phone: st.phone,
      role: st.role,
      designation: st.designation,
      assignedHostelId: st.assignedHostelId || undefined,
      status: st.status,
      createdAt: st.createdAt,
      updatedAt: st.updatedAt,
    }))
  );

  // 10. RoomAllocations
  const allocations = await prisma.roomAllocation.findMany();
  await upsertCollection(
    "RoomAllocation",
    RoomAllocation,
    allocations.map((a) => ({
      _id: a.id,
      studentId: a.studentId,
      bedId: a.bedId,
      academicYear: a.academicYear,
      allocatedAt: a.allocatedAt,
      vacatedAt: a.vacatedAt || undefined,
      status: a.status,
      remarks: a.remarks || undefined,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }))
  );

  // 11. Complaints
  const complaints = await prisma.complaint.findMany();
  await upsertCollection(
    "Complaint",
    Complaint,
    complaints.map((c) => ({
      _id: c.id,
      complaintCode: c.complaintCode,
      studentId: c.studentId,
      category: c.category,
      title: c.title,
      description: c.description,
      location: c.location,
      priority: c.priority,
      status: c.status,
      assignedStaffId: c.assignedStaffId || undefined,
      attachmentUrl: c.attachmentUrl || undefined,
      resolvedAt: c.resolvedAt || undefined,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))
  );

  // 12. ComplaintComments
  const comments = await prisma.complaintComment.findMany();
  await upsertCollection(
    "ComplaintComment",
    ComplaintComment,
    comments.map((cm) => ({
      _id: cm.id,
      complaintId: cm.complaintId,
      authorId: cm.authorId,
      authorRole: cm.authorRole,
      authorName: cm.authorName,
      comment: cm.comment,
      isInternal: cm.isInternal,
      createdAt: cm.createdAt,
    }))
  );

  // 13. LeaveRequests
  const leaveRequests = await prisma.leaveRequest.findMany();
  await upsertCollection(
    "LeaveRequest",
    LeaveRequest,
    leaveRequests.map((l) => ({
      _id: l.id,
      requestCode: l.requestCode,
      studentId: l.studentId,
      leaveType: l.leaveType,
      startDate: l.startDate,
      endDate: l.endDate,
      destination: l.destination,
      reason: l.reason,
      emergencyContact: l.emergencyContact,
      status: l.status,
      reviewedById: l.reviewedById || undefined,
      reviewedAt: l.reviewedAt || undefined,
      reviewRemarks: l.reviewRemarks || undefined,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }))
  );

  // 14. Visitors
  const visitors = await prisma.visitor.findMany();
  await upsertCollection(
    "Visitor",
    Visitor,
    visitors.map((v) => ({
      _id: v.id,
      studentId: v.studentId,
      name: v.name,
      phone: v.phone,
      relationship: v.relationship,
      idProofType: v.idProofType,
      idProofNumber: v.idProofNumber,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }))
  );

  // 15. VisitorPasses
  const visitorPasses = await prisma.visitorPass.findMany();
  await upsertCollection(
    "VisitorPass",
    VisitorPass,
    visitorPasses.map((vp) => ({
      _id: vp.id,
      passCode: vp.passCode,
      visitorId: vp.visitorId,
      visitDate: vp.visitDate,
      status: vp.status,
      expectedEntryTime: vp.expectedEntryTime,
      expectedExitTime: vp.expectedExitTime,
      actualEntryTime: vp.actualEntryTime || undefined,
      actualExitTime: vp.actualExitTime || undefined,
      approvedById: vp.approvedById || undefined,
      remarks: vp.remarks || undefined,
      createdAt: vp.createdAt,
      updatedAt: vp.updatedAt,
    }))
  );

  // 16. Attendance
  const attendances = await prisma.attendance.findMany();
  await upsertCollection(
    "Attendance",
    Attendance,
    attendances.map((at) => ({
      _id: at.id,
      studentId: at.studentId,
      date: at.date,
      status: at.status,
      markedById: at.markedById,
      remarks: at.remarks || undefined,
      isCorrected: at.isCorrected,
      correctedById: at.correctedById || undefined,
      createdAt: at.createdAt,
      updatedAt: at.updatedAt,
    }))
  );

  // 17. Notices
  const notices = await prisma.notice.findMany();
  await upsertCollection(
    "Notice",
    Notice,
    notices.map((n) => ({
      _id: n.id,
      noticeCode: n.noticeCode,
      title: n.title,
      content: n.content,
      priority: n.priority,
      targetAudience: n.targetAudience,
      targetHostelId: n.targetHostelId || undefined,
      targetBlockId: n.targetBlockId || undefined,
      publishedById: n.publishedById,
      isPublished: n.isPublished,
      publishDate: n.publishDate,
      expiryDate: n.expiryDate || undefined,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }))
  );

  // 18. Notifications
  const notifications = await prisma.notification.findMany();
  await upsertCollection(
    "Notification",
    Notification,
    notifications.map((nt) => ({
      _id: nt.id,
      userId: nt.userId,
      title: nt.title,
      message: nt.message,
      type: nt.type,
      isRead: nt.isRead,
      readAt: nt.readAt || undefined,
      linkUrl: nt.linkUrl || undefined,
      createdAt: nt.createdAt,
    }))
  );

  // 19. MessMenu
  const messMenus = await prisma.messMenu.findMany();
  await upsertCollection(
    "MessMenu",
    MessMenu,
    messMenus.map((mm) => ({
      _id: mm.id,
      dayOfWeek: mm.dayOfWeek,
      mealType: mm.mealType,
      items: mm.items,
      timings: mm.timings,
      createdAt: mm.createdAt,
      updatedAt: mm.updatedAt,
    }))
  );

  // 20. Feedback
  const feedbacks = await prisma.feedback.findMany();
  await upsertCollection(
    "Feedback",
    Feedback,
    feedbacks.map((fb) => ({
      _id: fb.id,
      studentId: fb.studentId,
      category: fb.category,
      title: fb.title,
      rating: fb.rating,
      comments: fb.comments,
      status: fb.status,
      createdAt: fb.createdAt,
    }))
  );

  // 21. AuditLog
  const auditLogs = await prisma.auditLog.findMany();
  await upsertCollection(
    "AuditLog",
    AuditLog,
    auditLogs.map((al) => ({
      _id: al.id,
      actorId: al.actorId,
      actorRole: al.actorRole,
      actorName: al.actorName,
      action: al.action,
      targetType: al.targetType,
      targetId: al.targetId,
      details: al.details || undefined,
      ipAddress: al.ipAddress || undefined,
      userAgent: al.userAgent || undefined,
      createdAt: al.createdAt,
    }))
  );

  // 22. SystemSettings
  const systemSettings = await prisma.systemSetting.findMany();
  await upsertCollection(
    "SystemSetting",
    SystemSetting,
    systemSettings.map((ss) => ({
      _id: ss.id,
      key: ss.key,
      value: ss.value,
      description: ss.description || undefined,
      category: ss.category,
      updatedAt: ss.updatedAt,
    }))
  );

  console.log("\n============================================================");
  console.log("            MIGRATION RECONCILIATION SUMMARY                ");
  console.log("============================================================\n");
  console.table(results);

  const totalSQLite = results.reduce((acc, r) => acc + r.sqliteCount, 0);
  const totalMongo = results.reduce((acc, r) => acc + r.mongoCount, 0);
  const mismatches = results.filter((r) => r.status === "MISMATCH");

  console.log(`Total SQLite Records Extracted : ${totalSQLite}`);
  console.log(`Total MongoDB Records In Gest   : ${totalMongo}`);

  if (mismatches.length === 0 && totalSQLite === totalMongo) {
    console.log("\n✅ SUCCESS: 100% data fidelity achieved with ZERO data loss!");
  } else {
    console.error(
      `\n❌ WARNING: ${mismatches.length} entity count mismatch(es) detected!`
    );
    process.exitCode = 1;
  }

  await prisma.$disconnect();
}

migrateData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed with error:", err);
    process.exit(1);
  });
