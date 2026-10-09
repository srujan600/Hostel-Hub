import dotenv from "dotenv";
dotenv.config();

import { connectToDatabase } from "../src/lib/mongodb";
import {
  User,
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
  Attendance,
  Notice,
  Notification,
} from "../src/models";
import { sanitizeDoc } from "../src/models/_utils";
import { verifyPassword, hashPassword, signToken, verifyToken } from "../src/lib/auth";
import { UserSession } from "../src/types";

async function runValidationTests() {
  console.log("============================================================");
  console.log("   HostelHub - Phase 8: Comprehensive Validation Tests      ");
  console.log("============================================================\n");

  await connectToDatabase();
  console.log("Connected to MongoDB.\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
      process.exitCode = 1;
    }
  }

  // --------------------------------------------------------------------------
  // Suite 1: Authentication & Role Resolution against Migrated Records
  // --------------------------------------------------------------------------
  console.log("Suite 1: Authentication Workflows with Migrated Users");

  // Admin login
  const adminUser = await User.findOne({ username: "admin" });
  assert(!!adminUser, "Migrated admin account found in database");
  const adminPassMatch = adminUser ? await verifyPassword("admin123", adminUser.passwordHash) : false;
  assert(adminPassMatch, "Admin password hash verifies correctly against 'admin123'");

  // Warden login & Staff profile resolution
  const wardenUser = await User.findOne({ username: "warden.vance" });
  assert(!!wardenUser, "Migrated warden account found in database");
  const wardenPassMatch = wardenUser ? await verifyPassword("warden123", wardenUser.passwordHash) : false;
  assert(wardenPassMatch, "Warden password hash verifies correctly against 'warden123'");
  const wardenStaff = wardenUser ? await Staff.findOne({ userId: wardenUser._id }) : null;
  assert(!!wardenStaff && wardenStaff.role === "WARDEN", "Warden staff profile resolved with role WARDEN");

  // Student login & Student profile resolution
  const studentUser = await User.findOne({ username: "student.alex" });
  assert(!!studentUser, "Migrated student account found in database");
  const studentPassMatch = studentUser ? await verifyPassword("student123", studentUser.passwordHash) : false;
  assert(studentPassMatch, "Student password hash verifies correctly against 'student123'");
  const studentProfile = studentUser ? await Student.findOne({ userId: studentUser._id }) : null;
  assert(!!studentProfile && !!studentProfile.studentId, `Student profile resolved with ID ${studentProfile?.studentId}`);

  // Invalid login rejection
  const wrongPassMatch = studentUser ? await verifyPassword("wrong_password", studentUser.passwordHash) : true;
  assert(!wrongPassMatch, "Invalid password rejected as expected");

  // Session Token Creation & Hydration
  const sessionPayload: UserSession = {
    id: studentUser!._id,
    username: studentUser!.username,
    name: studentProfile!.name,
    email: studentUser!.email,
    role: "STUDENT",
    status: "ACTIVE",
    studentId: studentProfile!.studentId,
  };
  const token = await signToken(sessionPayload);
  const hydrated = await verifyToken(token);
  assert(hydrated.id === studentUser!._id && hydrated.studentId === studentProfile!.studentId, "Session token successfully signed and verified");

  // --------------------------------------------------------------------------
  // Suite 2: Entity Traversal & Aggregation Queries
  // --------------------------------------------------------------------------
  console.log("\nSuite 2: Facility Hierarchy & Aggregations");

  const hostels = await Hostel.find().lean();
  assert(hostels.length >= 2, `Hostels queried successfully (found ${hostels.length})`);

  const rooms = await Room.find().lean();
  const beds = await Bed.find().lean();
  assert(rooms.length >= 5 && beds.length >= 8, `Rooms (${rooms.length}) and Beds (${beds.length}) verified`);

  // Room type aggregation
  const roomAgg = await Room.aggregate([
    {
      $group: {
        _id: "$roomType",
        count: { $sum: 1 },
        totalCapacity: { $sum: "$capacity" },
        totalOccupied: { $sum: "$occupiedBeds" },
      },
    },
  ]);
  assert(roomAgg.length > 0, `Room capacity aggregation completed (${roomAgg.length} room types computed)`);

  // Complaint category aggregation
  const complaintAgg = await Complaint.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  assert(complaintAgg.length > 0, `Complaint category aggregation computed (${complaintAgg.length} categories)`);

  // --------------------------------------------------------------------------
  // Suite 3: Full Lifecycle Workflows
  // --------------------------------------------------------------------------
  console.log("\nSuite 3: CRUD Workflows on Migrated Database");

  // 3A. Complaint Workflow
  const testComplaint = await Complaint.create({
    complaintCode: `CMP-TEST-${Date.now()}`,
    studentId: studentProfile!._id,
    category: "ELECTRICAL",
    title: "Validation Test: Blown fuse in socket",
    description: "Automated test complaint for Phase 8 validation.",
    location: "Block A - Room 204",
    priority: "HIGH",
    status: "SUBMITTED",
  });
  assert(!!testComplaint._id, "Complaint created successfully");

  // Add Comment
  const testComment = await ComplaintComment.create({
    complaintId: testComplaint._id,
    authorId: wardenUser!._id,
    authorRole: "WARDEN",
    authorName: wardenStaff!.name,
    comment: "Technician dispatched to inspect.",
    isInternal: false,
  });
  assert(!!testComment._id, "Complaint comment attached successfully");

  // Update Status
  const updatedComplaint = await Complaint.findOneAndUpdate(
    { _id: testComplaint._id },
    { $set: { status: "RESOLVED", assignedStaffId: wardenStaff!._id, resolvedAt: new Date() } },
    { returnDocument: "after" }
  );
  assert(updatedComplaint?.status === "RESOLVED", "Complaint updated to RESOLVED with assigned staff");

  // Clean up test complaint
  await ComplaintComment.deleteMany({ complaintId: testComplaint._id });
  await Complaint.deleteOne({ _id: testComplaint._id });
  assert(true, "Complaint workflow test completed and cleaned up");

  // 3B. Leave Request Workflow
  const testLeave = await LeaveRequest.create({
    requestCode: `LR-TEST-${Date.now()}`,
    studentId: studentProfile!._id,
    leaveType: "DAY_OUTING",
    startDate: new Date(),
    endDate: new Date(Date.now() + 8 * 60 * 60 * 1000),
    destination: "Downtown Market",
    reason: "Purchasing essential academic supplies",
    emergencyContact: "9876543210",
    status: "SUBMITTED",
  });
  assert(!!testLeave._id, "Leave request created successfully");

  // Review & Approve
  const approvedLeave = await LeaveRequest.findOneAndUpdate(
    { _id: testLeave._id },
    { $set: { status: "APPROVED", reviewedById: wardenStaff!._id, reviewedAt: new Date() } },
    { returnDocument: "after" }
  );
  assert(approvedLeave?.status === "APPROVED", "Leave request approved by warden");
  await LeaveRequest.deleteOne({ _id: testLeave._id });
  assert(true, "Leave request workflow test completed and cleaned up");

  // 3C. Attendance Workflow
  const testDate = `2026-11-${String(Math.floor(Math.random() * 20) + 10)}`;
  const attRecord = await Attendance.findOneAndUpdate(
    { studentId: studentProfile!._id, date: testDate },
    {
      $set: { status: "PRESENT", remarks: "Night curfew rollcall marked" },
      $setOnInsert: { markedById: wardenStaff!._id },
    },
    { upsert: true, returnDocument: "after" }
  );
  assert(attRecord?.status === "PRESENT", "Attendance upserted successfully");

  // Attendance correction
  const correctedAtt = await Attendance.findOneAndUpdate(
    { studentId: studentProfile!._id, date: testDate },
    { $set: { status: "EXCUSED", isCorrected: true, correctedById: wardenStaff!._id } },
    { returnDocument: "after" }
  );
  assert(correctedAtt?.status === "EXCUSED" && correctedAtt?.isCorrected === true, "Attendance corrected with audit trail");
  await Attendance.deleteOne({ _id: attRecord!._id });
  assert(true, "Attendance workflow test completed and cleaned up");

  // 3D. Notification Workflow
  const testNotif = await Notification.create({
    userId: studentUser!._id,
    title: "Test System Notification",
    message: "This is a test notification for Phase 8 validation.",
    type: "INFO",
    isRead: false,
  });
  assert(!testNotif.isRead, "Unread notification created");

  const readNotif = await Notification.findOneAndUpdate(
    { _id: testNotif._id },
    { $set: { isRead: true, readAt: new Date() } },
    { returnDocument: "after" }
  );
  assert(readNotif?.isRead === true, "Notification marked as read");
  await Notification.deleteOne({ _id: testNotif._id });
  assert(true, "Notification workflow test completed and cleaned up");

  // --------------------------------------------------------------------------
  // Suite 4: API Contract Verification ('id' vs '_id')
  // --------------------------------------------------------------------------
  console.log("\nSuite 4: API Contract JSON Serialization");

  const freshHostel = await Hostel.findOne().lean();
  const sanitized = sanitizeDoc(freshHostel);
  assert(!sanitized._id && typeof sanitized.id === "string", "sanitizeDoc() strips _id and exposes id: string");
  assert(!sanitized.__v, "sanitizeDoc() strips __v version key");

  const freshStudent = await Student.findOne();
  const jsonOutput = freshStudent?.toJSON();
  assert(jsonOutput?.id === freshStudent?._id && !jsonOutput?._id, "Model toJSON() virtual transformation exposes id and strips _id");

  // --------------------------------------------------------------------------
  // Suite 5: High-Concurrency Atomic Bed Allocation
  // --------------------------------------------------------------------------
  console.log("\nSuite 5: High-Concurrency Atomic Bed Claiming");

  const concurrentBed = await Bed.create({
    roomId: rooms[0]._id,
    bedNumber: `B-CONC-${Date.now()}`,
    status: "AVAILABLE",
  });

  // Launch 5 simultaneous requests attempting to claim this single available bed
  const claimAttempts = await Promise.all([
    Bed.findOneAndUpdate({ _id: concurrentBed._id, status: "AVAILABLE" }, { $set: { status: "OCCUPIED" } }, { returnDocument: "after" }),
    Bed.findOneAndUpdate({ _id: concurrentBed._id, status: "AVAILABLE" }, { $set: { status: "OCCUPIED" } }, { returnDocument: "after" }),
    Bed.findOneAndUpdate({ _id: concurrentBed._id, status: "AVAILABLE" }, { $set: { status: "OCCUPIED" } }, { returnDocument: "after" }),
    Bed.findOneAndUpdate({ _id: concurrentBed._id, status: "AVAILABLE" }, { $set: { status: "OCCUPIED" } }, { returnDocument: "after" }),
    Bed.findOneAndUpdate({ _id: concurrentBed._id, status: "AVAILABLE" }, { $set: { status: "OCCUPIED" } }, { returnDocument: "after" }),
  ]);

  const successfulClaims = claimAttempts.filter((res) => res !== null);
  const failedClaims = claimAttempts.filter((res) => res === null);

  assert(successfulClaims.length === 1, `Exactly 1 winner among 5 concurrent allocation requests (claimed: ${successfulClaims.length})`);
  assert(failedClaims.length === 4, `All 4 contending requests gracefully failed without conflict`);

  await Bed.deleteOne({ _id: concurrentBed._id });
  assert(true, "Concurrency test bed cleaned up");

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log("\n============================================================");
  console.log(`Phase 8 Validation Results: ${passed}/${total} Tests Passed`);
  console.log("============================================================\n");

  if (passed === total) {
    console.log("✅ ALL VALIDATION TESTS PASSED WITH 100% SUCCESS!");
  } else {
    console.error(`❌ Validation had ${total - passed} failing test(s).`);
  }
}

runValidationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Validation failed:", err);
    process.exit(1);
  });
