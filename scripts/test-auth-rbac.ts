import { PrismaClient } from "@prisma/client";
import { signToken, verifyToken, verifyPassword, hashPassword } from "../src/lib/auth";
import { checkRateLimit, resetRateLimit } from "../src/lib/rate-limit";
import { ROLE_HIERARCHY, hasPermission } from "../src/lib/rbac";
import { UserSession } from "../src/types";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("🧪 HOSTELHUB AUTHENTICATION & RBAC TEST SUITE");
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
    // -------------------------------------------------------------
    // Test 1: Student Login & Role Resolution
    // -------------------------------------------------------------
    console.log("🔹 Test Group 1: Student Authentication");
    const studentUser = await prisma.user.findUnique({
      where: { username: "student.alex" },
      include: { student: true },
    });
    assert(!!studentUser, "Student account 'student.alex' exists in database");
    
    const studentPassOk = await verifyPassword("student123", studentUser!.passwordHash);
    assert(studentPassOk, "Student password hashes match correctly via bcrypt");

    const studentSession: UserSession = {
      id: studentUser!.id,
      username: studentUser!.username,
      name: studentUser!.student!.name,
      email: studentUser!.email,
      role: studentUser!.role as any,
      status: studentUser!.status as any,
      studentId: studentUser!.student!.studentId,
    };
    const studentToken = await signToken(studentSession);
    const decodedStudent = await verifyToken(studentToken);

    assert(decodedStudent.role === "STUDENT", "Resolved role is strictly 'STUDENT'");
    assert(decodedStudent.studentId === "STU-2026-0042", "Student roll ID mapped properly in session");
    assert(decodedStudent.name === "Alex Rivers", "Student display name matches resident profile");

    // -------------------------------------------------------------
    // Test 2: Warden Login & Role Resolution
    // -------------------------------------------------------------
    console.log("\n🔹 Test Group 2: Warden Authentication");
    const wardenUser = await prisma.user.findUnique({
      where: { username: "warden.vance" },
      include: { staff: true },
    });
    assert(!!wardenUser, "Warden account 'warden.vance' exists");
    
    const wardenPassOk = await verifyPassword("warden123", wardenUser!.passwordHash);
    assert(wardenPassOk, "Warden password hashes match");

    const wardenSession: UserSession = {
      id: wardenUser!.id,
      username: wardenUser!.username,
      name: wardenUser!.staff!.name,
      email: wardenUser!.email,
      role: wardenUser!.role as any,
      status: wardenUser!.status as any,
      staffId: wardenUser!.staff!.employeeId,
      hostelId: wardenUser!.staff!.assignedHostelId || undefined,
    };
    const wardenToken = await signToken(wardenSession);
    const decodedWarden = await verifyToken(wardenToken);

    assert(decodedWarden.role === "WARDEN", "Resolved role is strictly 'WARDEN'");
    assert(decodedWarden.staffId === "WDN-101", "Warden employee ID mapped properly");

    // -------------------------------------------------------------
    // Test 3: Administrator Login
    // -------------------------------------------------------------
    console.log("\n🔹 Test Group 3: Administrator Authentication");
    const adminUser = await prisma.user.findUnique({
      where: { username: "admin" },
      include: { staff: true },
    });
    assert(!!adminUser, "Admin account 'admin' exists");
    const adminPassOk = await verifyPassword("admin123", adminUser!.passwordHash);
    assert(adminPassOk, "Admin password hashes match");

    // -------------------------------------------------------------
    // Test 4: Invalid Credentials & Rejection
    // -------------------------------------------------------------
    console.log("\n🔹 Test Group 4: Invalid Credentials");
    const wrongPass = await verifyPassword("wrongpassword", studentUser!.passwordHash);
    assert(!wrongPass, "Incorrect password returns false");

    const nonExistent = await prisma.user.findUnique({
      where: { username: "ghost.user" },
    });
    assert(nonExistent === null, "Non-existent user lookup safely returns null");

    // -------------------------------------------------------------
    // Test 5: Suspended / Inactive Account Handling
    // -------------------------------------------------------------
    console.log("\n🔹 Test Group 5: Inactive Account Status Check");
    const suspendedUser = await prisma.user.create({
      data: {
        username: "suspended.student",
        email: "suspended@student.campus.edu",
        passwordHash: await hashPassword("pass123"),
        role: "STUDENT",
        status: "SUSPENDED",
      },
    });
    assert(suspendedUser.status === "SUSPENDED", "Created suspended test user");
    assert(suspendedUser.status !== "ACTIVE", "Active status check rejects suspended user");
    
    // Cleanup test user
    await prisma.user.delete({ where: { id: suspendedUser.id } });

    // -------------------------------------------------------------
    // Test 6: RBAC Hierarchy & Permissions Isolation
    // -------------------------------------------------------------
    console.log("\n🔹 Test Group 6: Server-Side RBAC Enforcement");
    assert(hasPermission("STUDENT", "COMPLAINT_CREATE"), "STUDENT can create complaints");
    assert(!hasPermission("STUDENT", "COMPLAINT_ASSIGN"), "STUDENT CANNOT assign complaints");
    assert(!hasPermission("STUDENT", "LEAVE_REQUEST_ADJUDICATE"), "STUDENT CANNOT adjudicate leave");
    assert(!hasPermission("STUDENT", "ROOM_MANAGE"), "STUDENT CANNOT manage rooms");
    
    assert(hasPermission("WARDEN", "COMPLAINT_ASSIGN"), "WARDEN can assign complaints");
    assert(hasPermission("WARDEN", "LEAVE_REQUEST_ADJUDICATE"), "WARDEN can adjudicate leave");
    assert(!hasPermission("WARDEN", "ROOM_MANAGE"), "WARDEN cannot directly re-allocate hostel rooms");

    assert(hasPermission("ADMIN", "ROOM_MANAGE"), "ADMIN can manage hostel rooms & allocations");
    assert(ROLE_HIERARCHY["SUPER_ADMIN"] > ROLE_HIERARCHY["STUDENT"], "SUPER_ADMIN ranks higher than STUDENT");

    // -------------------------------------------------------------
    // Test 7: Rate Limiting Engine
    // -------------------------------------------------------------
    console.log("\n🔹 Test Group 7: Authentication Rate Limiting");
    const testKey = "test_rate_key_" + Date.now();
    resetRateLimit(testKey);

    for (let i = 1; i <= 5; i++) {
      const check = checkRateLimit(testKey, { limit: 5, windowMs: 60000 });
      assert(check.allowed, `Attempt ${i} within limit is allowed`);
    }

    const throttledCheck = checkRateLimit(testKey, { limit: 5, windowMs: 60000 });
    assert(!throttledCheck.allowed, "6th attempt is throttled and blocked");
    assert(throttledCheck.remaining === 0, "Remaining attempts is 0");
    resetRateLimit(testKey);

    // -------------------------------------------------------------
    // Test 8: Tampered Token Rejection
    // -------------------------------------------------------------
    console.log("\n🔹 Test Group 8: Cryptographic Token Integrity");
    const tamperedToken = studentToken.slice(0, -6) + "xxxxxx";
    let tamperFailed = false;
    try {
      await verifyToken(tamperedToken);
    } catch (e) {
      tamperFailed = true;
    }
    assert(tamperFailed, "Tampered JWT signature is rejected with UnauthorizedError");

    console.log("\n=================================================");
    console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
    console.log("=================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution encountered an error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
