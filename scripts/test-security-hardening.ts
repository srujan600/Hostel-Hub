import { prisma } from "../src/lib/prisma";
import { signToken, verifyToken, requireAuth, hashPassword } from "../src/lib/auth";
import { checkRateLimit, resetRateLimit } from "../src/lib/rate-limit";
import { requirePermission, hasPermission } from "../src/lib/rbac";
import { NextRequest } from "next/server";
import { UserSession } from "../src/types";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error("    Details:", details);
    testsFailed++;
  }
}

async function runSecurityTests() {
  console.log("\n=======================================================");
  console.log("  HOSTELHUB PHASE 13 — SECURITY & IDOR HARDENING SUITE");
  console.log("=======================================================\n");

  let alphaUser: any = null;
  let alphaStudent: any = null;
  let betaUser: any = null;
  let betaStudent: any = null;
  let wardenUser: any = null;
  let wardenStaff: any = null;
  let securityUser: any = null;
  let securityStaff: any = null;
  let adminUser: any = null;

  try {
    // -------------------------------------------------------------
    // Setup Test Fixtures: Two Distinct Students, Warden, Security, Admin
    // -------------------------------------------------------------
    console.log("Section 1: Initializing Test Principals & Security Fixtures");
    const testPasswordHash = await hashPassword("SecurePass123!");

    // Student Alpha
    alphaUser = await prisma.user.create({
      data: {
        username: `sec_alpha_${Date.now()}`,
        email: `alpha_${Date.now()}@campus.edu`,
        passwordHash: testPasswordHash,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });
    alphaStudent = await prisma.student.create({
      data: {
        userId: alphaUser.id,
        name: "Student Alpha",
        studentId: `STU-SEC-A${Date.now().toString().slice(-4)}`,
        email: alphaUser.email,
        course: "Computer Science",
        department: "Engineering",
        yearOfStudy: 2,
        gender: "MALE",
        emergencyContactName: "Parent Alpha",
        emergencyContactPhone: "+91 9999900001",
        phone: "+91 9999900001",
      },
    });

    // Student Beta
    betaUser = await prisma.user.create({
      data: {
        username: `sec_beta_${Date.now()}`,
        email: `beta_${Date.now()}@campus.edu`,
        passwordHash: testPasswordHash,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });
    betaStudent = await prisma.student.create({
      data: {
        userId: betaUser.id,
        name: "Student Beta",
        studentId: `STU-SEC-B${Date.now().toString().slice(-4)}`,
        email: betaUser.email,
        course: "Electrical Engineering",
        department: "Engineering",
        yearOfStudy: 3,
        gender: "FEMALE",
        emergencyContactName: "Parent Beta",
        emergencyContactPhone: "+91 9999900002",
        phone: "+91 9999900002",
      },
    });

    // Staff / Warden
    wardenUser = await prisma.user.create({
      data: {
        username: `sec_warden_${Date.now()}`,
        email: `warden_${Date.now()}@campus.edu`,
        passwordHash: testPasswordHash,
        role: "WARDEN",
        status: "ACTIVE",
      },
    });
    wardenStaff = await prisma.staff.create({
      data: {
        userId: wardenUser.id,
        name: "Warden Henderson",
        employeeId: `EMP-SEC-W${Date.now().toString().slice(-4)}`,
        email: wardenUser.email,
        designation: "Block Warden",
        phone: "+91 9999900003",
        role: "WARDEN",
      },
    });

    // Staff / Security
    securityUser = await prisma.user.create({
      data: {
        username: `sec_guard_${Date.now()}`,
        email: `guard_${Date.now()}@campus.edu`,
        passwordHash: testPasswordHash,
        role: "SECURITY",
        status: "ACTIVE",
      },
    });
    securityStaff = await prisma.staff.create({
      data: {
        userId: securityUser.id,
        name: "Officer Vikram",
        employeeId: `EMP-SEC-S${Date.now().toString().slice(-4)}`,
        email: securityUser.email,
        designation: "Gate Supervisor",
        phone: "+91 9999900004",
        role: "SECURITY",
      },
    });

    // Admin
    adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    assert(!!alphaStudent && !!betaStudent, "Student Alpha and Beta created successfully");
    assert(!!wardenStaff && !!securityStaff, "Staff principals created successfully");

    // Sessions and Tokens
    const alphaSession: UserSession = {
      id: alphaUser.id,
      username: alphaUser.username,
      name: alphaStudent.name,
      email: alphaUser.email,
      role: "STUDENT",
      status: "ACTIVE",
      studentId: alphaStudent.studentId,
    };
    const alphaToken = await signToken(alphaSession);

    const betaSession: UserSession = {
      id: betaUser.id,
      username: betaUser.username,
      name: betaStudent.name,
      email: betaUser.email,
      role: "STUDENT",
      status: "ACTIVE",
      studentId: betaStudent.studentId,
    };
    const betaToken = await signToken(betaSession);

    const wardenSession: UserSession = {
      id: wardenUser.id,
      username: wardenUser.username,
      name: wardenStaff.name,
      email: wardenUser.email,
      role: "WARDEN",
      status: "ACTIVE",
      staffId: wardenStaff.employeeId,
    };
    const wardenToken = await signToken(wardenSession);

    const securitySession: UserSession = {
      id: securityUser.id,
      username: securityUser.username,
      name: securityStaff.name,
      email: securityUser.email,
      role: "SECURITY",
      status: "ACTIVE",
      staffId: securityStaff.employeeId,
    };
    const securityToken = await signToken(securitySession);

    // -------------------------------------------------------------
    // Section 2: Unauthenticated Access Rejection
    // -------------------------------------------------------------
    console.log("\nSection 2: Unauthenticated Access Rejection");
    const unauthReq = new NextRequest("http://localhost:3000/api/complaints");
    let unauthRejected = false;
    try {
      await requireAuth(unauthReq);
    } catch (err: any) {
      if (err.statusCode === 401 || err.name === "UnauthorizedError") {
        unauthRejected = true;
      }
    }
    assert(unauthRejected, "Request without credentials rejected with 401 Unauthorized");

    // Tampered Token Rejection
    const tamperedToken = alphaToken.slice(0, -6) + "xxxxxx";
    const tamperedReq = new NextRequest("http://localhost:3000/api/complaints", {
      headers: { authorization: `Bearer ${tamperedToken}` },
    });
    let tamperedRejected = false;
    try {
      await requireAuth(tamperedReq);
    } catch (err: any) {
      if (err.statusCode === 401 || err.name === "UnauthorizedError") {
        tamperedRejected = true;
      }
    }
    assert(tamperedRejected, "Tampered cryptographic signature rejected with 401 Unauthorized");

    // Suspended Account Rejection
    const suspendedUser = await prisma.user.create({
      data: {
        username: `sec_susp_${Date.now()}`,
        email: `susp_${Date.now()}@campus.edu`,
        passwordHash: testPasswordHash,
        role: "STUDENT",
        status: "SUSPENDED",
      },
    });
    const suspendedSession: UserSession = {
      id: suspendedUser.id,
      username: suspendedUser.username,
      name: "Suspended Resident",
      email: suspendedUser.email,
      role: "STUDENT",
      status: "SUSPENDED",
    };
    const suspendedToken = await signToken(suspendedSession);
    const suspendedReq = new NextRequest("http://localhost:3000/api/complaints", {
      headers: { authorization: `Bearer ${suspendedToken}` },
    });
    let suspendedRejected = false;
    try {
      await requireAuth(suspendedReq);
    } catch (err: any) {
      if (err.statusCode === 401 || err.name === "UnauthorizedError") {
        suspendedRejected = true;
      }
    }
    assert(suspendedRejected, "Suspended account rejected with 401 Unauthorized");
    await prisma.user.delete({ where: { id: suspendedUser.id } });

    // -------------------------------------------------------------
    // Section 3: Horizontal Privilege Boundary & IDOR Prevention
    // -------------------------------------------------------------
    console.log("\nSection 3: Horizontal Privilege Boundary & IDOR Prevention");

    // 1. Complaint Ownership Isolation
    const complaintAlpha = await prisma.complaint.create({
      data: {
        complaintCode: `CMP-SEC-A${Date.now().toString().slice(-4)}`,
        studentId: alphaStudent.id,
        category: "CARPENTRY",
        title: "Alpha Study Table Drawer Jammed",
        description: "Drawer lock cylinder stuck.",
        location: "Room 101",
        priority: "LOW",
        status: "SUBMITTED",
      },
    });

    // Check: Can Beta view Alpha's complaint?
    const { GET: getComplaintById } = await import("../src/app/api/complaints/[id]/route");
    const betaViewAlphaReq = new NextRequest(`http://localhost:3000/api/complaints/${complaintAlpha.id}`, {
      headers: { authorization: `Bearer ${betaToken}` },
    });
    const betaViewRes = await getComplaintById(betaViewAlphaReq, {
      params: Promise.resolve({ id: complaintAlpha.id }),
    });
    const betaViewJson = await betaViewRes.json();
    assert(
      betaViewRes.status === 403 && betaViewJson.success === false,
      "IDOR BLOCKED: Student Beta cannot view Student Alpha's complaint (403 Forbidden)"
    );

    // Check: Can Beta post comments to Alpha's complaint?
    const { POST: postComplaintComment } = await import("../src/app/api/complaints/[id]/comments/route");
    const betaCommentReq = new NextRequest(`http://localhost:3000/api/complaints/${complaintAlpha.id}/comments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${betaToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ comment: "Malicious cross-tenant injection" }),
    });
    const betaCommentRes = await postComplaintComment(betaCommentReq, {
      params: Promise.resolve({ id: complaintAlpha.id }),
    });
    const betaCommentJson = await betaCommentRes.json();
    assert(
      betaCommentRes.status === 403 && betaCommentJson.success === false,
      "IDOR BLOCKED: Student Beta cannot comment on Student Alpha's complaint (403 Forbidden)"
    );

    // Check: Internal Staff Comment confidentiality
    await prisma.complaintComment.create({
      data: {
        complaintId: complaintAlpha.id,
        authorId: wardenUser.id,
        authorRole: "WARDEN",
        authorName: wardenStaff.name,
        comment: "CONFIDENTIAL STAFF NOTE: Verify resident did not force lock cylinder.",
        isInternal: true,
      },
    });
    await prisma.complaintComment.create({
      data: {
        complaintId: complaintAlpha.id,
        authorId: wardenUser.id,
        authorRole: "WARDEN",
        authorName: wardenStaff.name,
        comment: "PUBLIC UPDATE: Carpenter dispatched to Room 101.",
        isInternal: false,
      },
    });

    // When Alpha views their own complaint, verify internal comment is scrubbed
    const alphaViewReq = new NextRequest(`http://localhost:3000/api/complaints/${complaintAlpha.id}`, {
      headers: { authorization: `Bearer ${alphaToken}` },
    });
    const alphaViewRes = await getComplaintById(alphaViewReq, {
      params: Promise.resolve({ id: complaintAlpha.id }),
    });
    const alphaViewJson = await alphaViewRes.json();
    assert(alphaViewRes.status === 200, "Student Alpha can view their own complaint");
    const commentsList = alphaViewJson.data.comments || [];
    const hasInternalNote = commentsList.some((c: any) => c.isInternal === true);
    assert(!hasInternalNote, "SECURITY HARDENED: Internal staff notes are scrubbed from student response");
    assert(
      commentsList.some((c: any) => c.comment.includes("PUBLIC UPDATE")),
      "Public staff comments remain visible to student"
    );

    // 2. Leave Request Ownership Isolation
    const leaveAlpha = await prisma.leaveRequest.create({
      data: {
        requestCode: `LEV-SEC-A${Date.now().toString().slice(-4)}`,
        studentId: alphaStudent.id,
        leaveType: "DAY_OUTING",
        startDate: new Date(Date.now() + 24 * 3600 * 1000),
        endDate: new Date(Date.now() + 30 * 3600 * 1000),
        reason: "Family function in city centre",
        destination: "City Centre Mall",
        emergencyContact: "+91 9999900001",
        status: "SUBMITTED",
      },
    });

    const { GET: getLeaveById } = await import("../src/app/api/leave-requests/[id]/route");
    const betaViewLeaveReq = new NextRequest(`http://localhost:3000/api/leave-requests/${leaveAlpha.id}`, {
      headers: { authorization: `Bearer ${betaToken}` },
    });
    const betaViewLeaveRes = await getLeaveById(betaViewLeaveReq, {
      params: Promise.resolve({ id: leaveAlpha.id }),
    });
    const betaViewLeaveJson = await betaViewLeaveRes.json();
    assert(
      betaViewLeaveRes.status === 403 && betaViewLeaveJson.success === false,
      "IDOR BLOCKED: Student Beta cannot view Student Alpha's leave application (403 Forbidden)"
    );

    // 3. Notification Isolation
    const notifAlpha = await prisma.notification.create({
      data: {
        userId: alphaUser.id,
        title: "Confidential Alpha Notice",
        message: "Your room allocation is confirmed.",
        type: "INFO",
      },
    });

    const { PATCH: patchNotification, DELETE: deleteNotification } = await import(
      "../src/app/api/notifications/[id]/route"
    );
    const betaPatchNotifReq = new NextRequest(`http://localhost:3000/api/notifications/${notifAlpha.id}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${betaToken}` },
    });
    const betaPatchNotifRes = await patchNotification(betaPatchNotifReq, {
      params: Promise.resolve({ id: notifAlpha.id }),
    });
    assert(
      betaPatchNotifRes.status === 403,
      "IDOR BLOCKED: Student Beta cannot mark Student Alpha's notification as read (403 Forbidden)"
    );

    const betaDeleteNotifReq = new NextRequest(`http://localhost:3000/api/notifications/${notifAlpha.id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${betaToken}` },
    });
    const betaDeleteNotifRes = await deleteNotification(betaDeleteNotifReq, {
      params: Promise.resolve({ id: notifAlpha.id }),
    });
    assert(
      betaDeleteNotifRes.status === 403,
      "IDOR BLOCKED: Student Beta cannot delete Student Alpha's notification (403 Forbidden)"
    );

    // 4. Attendance Roll Call Parameter Tampering
    const { GET: getAttendance } = await import("../src/app/api/attendance/route");
    const alphaTamperAttendanceReq = new NextRequest(
      `http://localhost:3000/api/attendance?studentId=${betaStudent.id}`,
      {
        headers: { authorization: `Bearer ${alphaToken}` },
      }
    );
    const alphaAttendanceRes = await getAttendance(alphaTamperAttendanceReq);
    const alphaAttendanceJson = await alphaAttendanceRes.json();
    assert(
      alphaAttendanceRes.status === 200,
      "Student requesting attendance completes with success"
    );
    // Ensure all records returned belong only to Alpha
    const returnedRecords = alphaAttendanceJson.data.records || [];
    const containsForeignRecords = returnedRecords.some((r: any) => r.studentId !== alphaStudent.id);
    assert(
      !containsForeignRecords,
      "IDOR BLOCKED: Student cannot query other students' attendance via query parameters"
    );

    // -------------------------------------------------------------
    // Section 4: Vertical Privilege Escalation & Role Boundaries
    // -------------------------------------------------------------
    console.log("\nSection 4: Vertical Privilege Escalation & Role Boundaries");

    // 1. Student attempting to access Admin Audit Logs
    const { GET: getAuditLogs } = await import("../src/app/api/admin/audit-logs/route");
    const studentAuditReq = new NextRequest("http://localhost:3000/api/admin/audit-logs", {
      headers: { authorization: `Bearer ${alphaToken}` },
    });
    const studentAuditRes = await getAuditLogs(studentAuditReq);
    assert(
      studentAuditRes.status === 403,
      "RBAC ENFORCED: Student cannot access Admin Audit Logs (403 Forbidden)"
    );

    // 2. Student attempting to manage Admin Staff
    const { GET: getStaffList, POST: createStaffMember } = await import("../src/app/api/admin/staff/route");
    const studentStaffGetReq = new NextRequest("http://localhost:3000/api/admin/staff", {
      headers: { authorization: `Bearer ${alphaToken}` },
    });
    const studentStaffGetRes = await getStaffList(studentStaffGetReq);
    assert(
      studentStaffGetRes.status === 403,
      "RBAC ENFORCED: Student cannot view staff directory in admin console (403 Forbidden)"
    );

    const studentStaffPostReq = new NextRequest("http://localhost:3000/api/admin/staff", {
      method: "POST",
      headers: {
        authorization: `Bearer ${alphaToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Rogue Admin",
        email: "rogue@campus.edu",
        username: "rogue_admin",
        password: "Password123!",
        role: "ADMIN",
        employeeId: "ROGUE-001",
      }),
    });
    const studentStaffPostRes = await createStaffMember(studentStaffPostReq);
    assert(
      studentStaffPostRes.status === 403,
      "RBAC ENFORCED: Student cannot create staff or administrators (403 Forbidden)"
    );

    // 3. Student attempting to allocate bed
    const { POST: createAllocation } = await import("../src/app/api/allocations/route");
    const studentAllocReq = new NextRequest("http://localhost:3000/api/allocations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${alphaToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentId: alphaStudent.id,
        bedId: "fake-bed-id",
        academicYear: "2026-2027",
      }),
    });
    const studentAllocRes = await createAllocation(studentAllocReq);
    assert(
      studentAllocRes.status === 403,
      "RBAC ENFORCED: Student cannot execute room allocation mutations (403 Forbidden)"
    );

    // 4. Student attempting to adjudicate leave
    const { PATCH: adjudicateLeave } = await import("../src/app/api/leave-requests/[id]/route");
    const studentAdjudicateReq = new NextRequest(
      `http://localhost:3000/api/leave-requests/${leaveAlpha.id}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${alphaToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status: "APPROVED",
          reviewRemarks: "Self-approval attempt",
        }),
      }
    );
    const studentAdjudicateRes = await adjudicateLeave(studentAdjudicateReq, {
      params: Promise.resolve({ id: leaveAlpha.id }),
    });
    assert(
      studentAdjudicateRes.status === 403,
      "RBAC ENFORCED: Student cannot self-approve or adjudicate leave requests (403 Forbidden)"
    );

    // 5. Student attempting to record roll call attendance
    const { POST: recordAttendance } = await import("../src/app/api/warden/attendance/route");
    const studentRollCallReq = new NextRequest("http://localhost:3000/api/warden/attendance", {
      method: "POST",
      headers: {
        authorization: `Bearer ${alphaToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        date: "2026-10-05",
        records: [{ studentId: alphaStudent.id, status: "PRESENT" }],
      }),
    });
    const studentRollCallRes = await recordAttendance(studentRollCallReq);
    assert(
      studentRollCallRes.status === 403,
      "RBAC ENFORCED: Student cannot submit roll call attendance (403 Forbidden)"
    );

    // 6. Security guard attempting to access audit logs
    const securityAuditReq = new NextRequest("http://localhost:3000/api/admin/audit-logs", {
      headers: { authorization: `Bearer ${securityToken}` },
    });
    const securityAuditRes = await getAuditLogs(securityAuditReq);
    assert(
      securityAuditRes.status === 403,
      "RBAC ENFORCED: Security staff cannot inspect administrative audit logs (403 Forbidden)"
    );

    // 7. Security guard attempting to adjudicate leave
    const securityAdjudicateReq = new NextRequest(
      `http://localhost:3000/api/leave-requests/${leaveAlpha.id}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${securityToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "APPROVED" }),
      }
    );
    const securityAdjudicateRes = await adjudicateLeave(securityAdjudicateReq, {
      params: Promise.resolve({ id: leaveAlpha.id }),
    });
    assert(
      securityAdjudicateRes.status === 403,
      "RBAC ENFORCED: Security staff cannot adjudicate leave requests (403 Forbidden)"
    );

    // 8. Warden attempting to access administrative audit logs
    const wardenAuditReq = new NextRequest("http://localhost:3000/api/admin/audit-logs", {
      headers: { authorization: `Bearer ${wardenToken}` },
    });
    const wardenAuditRes = await getAuditLogs(wardenAuditReq);
    assert(
      wardenAuditRes.status === 403,
      "RBAC ENFORCED: Warden cannot access institutional system audit ledger (403 Forbidden)"
    );

    // -------------------------------------------------------------
    // Section 5: Rate Limiting & Throttling Enforcement
    // -------------------------------------------------------------
    console.log("\nSection 5: Rate Limiting & Throttling Enforcement");
    const testRateKey = `test_security_throttle_${Date.now()}`;
    resetRateLimit(testRateKey);

    // 5 attempts within limit
    for (let i = 1; i <= 5; i++) {
      const check = checkRateLimit(testRateKey, { limit: 5, windowMs: 60000 });
      assert(check.allowed, `Rate limiter allows request ${i}/5 (remaining: ${check.remaining})`);
    }

    // 6th attempt should be blocked
    const throttledCheck = checkRateLimit(testRateKey, { limit: 5, windowMs: 60000 });
    assert(!throttledCheck.allowed, "Rate limiter throttles 6th attempt (remaining: 0)");
    assert(throttledCheck.resetInSec > 0, "Rate limiter returns positive cooldown window in seconds");

    // Reset rate limiter
    resetRateLimit(testRateKey);
    const resetCheck = checkRateLimit(testRateKey, { limit: 5, windowMs: 60000 });
    assert(resetCheck.allowed && resetCheck.remaining === 4, "Rate limit reset clears cooldown state");

    // -------------------------------------------------------------
    // Section 6: Cleanup Test Fixtures
    // -------------------------------------------------------------
    console.log("\nSection 6: Cleaning Up Test Fixtures");
    await prisma.complaintComment.deleteMany({ where: { complaintId: complaintAlpha.id } });
    await prisma.complaint.delete({ where: { id: complaintAlpha.id } });
    await prisma.leaveRequest.delete({ where: { id: leaveAlpha.id } });
    await prisma.notification.delete({ where: { id: notifAlpha.id } });
    await prisma.student.delete({ where: { id: alphaStudent.id } });
    await prisma.student.delete({ where: { id: betaStudent.id } });
    await prisma.staff.delete({ where: { id: wardenStaff.id } });
    await prisma.staff.delete({ where: { id: securityStaff.id } });
    await prisma.user.delete({ where: { id: alphaUser.id } });
    await prisma.user.delete({ where: { id: betaUser.id } });
    await prisma.user.delete({ where: { id: wardenUser.id } });
    await prisma.user.delete({ where: { id: securityUser.id } });
    console.log("  ✓ All test security principals cleanly expunged");

  } catch (err) {
    console.error("Critical test execution failure:", err);
    testsFailed++;
  }

  console.log("\n=======================================================");
  console.log(`  SECURITY TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("=======================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runSecurityTests();
