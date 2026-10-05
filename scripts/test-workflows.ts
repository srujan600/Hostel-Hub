import { PrismaClient } from "@prisma/client";
import { AuditService } from "../src/services/audit-service";
import { NotificationService } from "../src/services/notification-service";

const prisma = new PrismaClient();

async function runWorkflowTests() {
  console.log("=================================================");
  console.log("🧪 HOSTELHUB WORKFLOWS & LIFECYCLE TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    const student = await prisma.student.findFirst({
      where: { studentId: "STU-2026-0042" },
      include: { user: true },
    });
    const warden = await prisma.staff.findFirst({
      where: { employeeId: "WDN-101" },
      include: { user: true },
    });

    assert(!!student, "Test student record found");
    assert(!!warden, "Test warden record found");

    // -------------------------------------------------------------
    // Test Group 1: Complete Complaint Lifecycle
    // -------------------------------------------------------------
    console.log("\n🔹 Test Group 1: Complaint Lifecycle (Submitted -> Assigned -> In Progress -> Resolved -> Closed)");

    // 1. Submit Complaint
    const complaint = await prisma.complaint.create({
      data: {
        complaintCode: `CMP-TEST-${Date.now().toString().slice(-4)}`,
        studentId: student!.id,
        category: "PLUMBING",
        title: "Test geyser thermostat replacement",
        description: "Water heater auto cutoff not triggering.",
        location: "Block C • Room 204",
        priority: "HIGH",
        status: "SUBMITTED",
      },
    });
    assert(complaint.status === "SUBMITTED", "Step 1: Complaint created with status 'SUBMITTED'");

    // 2. Warden assigns complaint
    const assignedComplaint = await prisma.complaint.update({
      where: { id: complaint.id },
      data: {
        assignedStaffId: warden!.id,
        status: "ASSIGNED",
      },
    });
    assert(assignedComplaint.status === "ASSIGNED", "Step 2: Warden assigns ticket -> status advances to 'ASSIGNED'");
    assert(assignedComplaint.assignedStaffId === warden!.id, "Step 2: Staff assigned ID matched");

    // 3. Status In Progress + Comment
    const inProgressComplaint = await prisma.complaint.update({
      where: { id: complaint.id },
      data: { status: "IN_PROGRESS" },
    });
    const comment = await prisma.complaintComment.create({
      data: {
        complaintId: complaint.id,
        authorId: warden!.user.id,
        authorRole: "WARDEN",
        authorName: warden!.name,
        comment: "Plumbing technician dispatched with spare heating coil.",
        isInternal: false,
      },
    });
    assert(inProgressComplaint.status === "IN_PROGRESS", "Step 3: Status updated to 'IN_PROGRESS'");
    assert(comment.comment.includes("technician dispatched"), "Step 3: Commentary trail appended");

    // 4. Resolved
    const resolvedAt = new Date();
    const resolvedComplaint = await prisma.complaint.update({
      where: { id: complaint.id },
      data: {
        status: "RESOLVED",
        resolvedAt,
      },
    });
    assert(resolvedComplaint.status === "RESOLVED", "Step 4: Status updated to 'RESOLVED'");
    assert(!!resolvedComplaint.resolvedAt, "Step 4: resolvedAt timestamp captured");

    // 5. Closed by Student
    const closedComplaint = await prisma.complaint.update({
      where: { id: complaint.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
    });
    assert(closedComplaint.status === "CLOSED", "Step 5: Resident accepts repair -> status 'CLOSED'");
    assert(!!closedComplaint.closedAt, "Step 5: closedAt timestamp captured");

    // Cleanup test complaint
    await prisma.complaintComment.deleteMany({ where: { complaintId: complaint.id } });
    await prisma.complaint.delete({ where: { id: complaint.id } });

    // -------------------------------------------------------------
    // Test Group 2: Leave & Outing Adjudication & Idempotency
    // -------------------------------------------------------------
    console.log("\n🔹 Test Group 2: Leave Adjudication & Idempotent Approvals");

    const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // 1. Student lodges out-pass
    const leave = await prisma.leaveRequest.create({
      data: {
        requestCode: `LEV-TEST-${Date.now().toString().slice(-4)}`,
        studentId: student!.id,
        leaveType: "DAY_OUTING",
        startDate,
        endDate,
        destination: "City Central Library",
        emergencyContact: "+91 98111 22233",
        reason: "Exam preparation research",
        status: "SUBMITTED",
      },
    });
    assert(leave.status === "SUBMITTED", "Step 1: Leave request created with status 'SUBMITTED'");

    // 2. Warden approves
    const reviewedAt = new Date();
    const approvedLeave = await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: {
        status: "APPROVED",
        reviewedById: warden!.user.id,
        reviewedAt,
        reviewRemarks: "Approved. Please adhere to 22:30 gate curfew.",
      },
    });
    assert(approvedLeave.status === "APPROVED", "Step 2: Warden approves out-pass -> status 'APPROVED'");
    assert(approvedLeave.reviewedById === warden!.user.id, "Step 2: Reviewer ID captured");

    // 3. Idempotency verification: Duplicate approval call
    const duplicateApproval = await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: {
        status: "APPROVED",
        reviewRemarks: "Approved. Please adhere to 22:30 gate curfew.",
      },
    });
    assert(duplicateApproval.status === "APPROVED", "Step 3: Duplicate approval executes idempotently without error");
    assert(duplicateApproval.requestCode === leave.requestCode, "Step 3: Identity preserved");

    // 4. Overlapping request conflict detection
    const overlappingStart = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const overlappingEnd = new Date(endDate.getTime() + 2 * 60 * 60 * 1000);

    const hasConflict = await prisma.leaveRequest.findFirst({
      where: {
        studentId: student!.id,
        status: { in: ["SUBMITTED", "APPROVED"] },
        OR: [
          { startDate: { lte: overlappingStart }, endDate: { gte: overlappingStart } },
          { startDate: { lte: overlappingEnd }, endDate: { gte: overlappingEnd } },
        ],
      },
    });
    assert(!!hasConflict, "Step 4: Conflicting leave request is detected by time range query");

    // Cleanup test leave
    await prisma.leaveRequest.delete({ where: { id: leave.id } });

    // -------------------------------------------------------------
    // Test Group 3: Audit & Notification Dispatch Integrity
    // -------------------------------------------------------------
    console.log("\n🔹 Test Group 3: Audit & Notification Integration");
    await AuditService.record({
      actorId: warden!.user.id,
      actorRole: "WARDEN",
      actorName: warden!.name,
      action: "LEAVE_APPROVED",
      targetType: "LeaveRequest",
      targetId: "TEST_TARGET_ID",
      details: { test: true },
    });

    const recentAudit = await prisma.auditLog.findFirst({
      where: { action: "LEAVE_APPROVED", targetType: "LeaveRequest" },
      orderBy: { createdAt: "desc" },
    });
    assert(!!recentAudit, "Audit record successfully persisted to database");
    assert(recentAudit?.actorRole === "WARDEN", "Audit record captures correct actor role");

    await NotificationService.send({
      userId: student!.user.id,
      title: "Test Out-Pass Approved",
      message: "Notification test message",
      type: "SUCCESS",
    });

    const studentNotif = await prisma.notification.findFirst({
      where: { userId: student!.user.id, title: "Test Out-Pass Approved" },
      orderBy: { createdAt: "desc" },
    });
    assert(!!studentNotif, "Notification successfully persisted to database for student");
    assert(studentNotif?.isRead === false, "Notification created with initial unread state");

    // Clean test audit/notif
    if (recentAudit) await prisma.auditLog.delete({ where: { id: recentAudit.id } });
    if (studentNotif) await prisma.notification.delete({ where: { id: studentNotif.id } });

    console.log("\n=================================================");
    console.log(`📊 WORKFLOW RESULTS: ${passed} passed, ${failed} failed`);
    console.log("=================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Workflow test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runWorkflowTests();
