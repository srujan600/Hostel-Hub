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
  Attendance,
} from "../src/models";
import { escapeRegex } from "../src/models/_utils";
import { hashPassword, verifyPassword, signToken, verifyToken } from "../src/lib/auth";
import { UserSession } from "../src/types";

async function runSecurityAndConstraintTests() {
  console.log("=== Phase 5: Security, Constraints & Business Logic Tests ===");
  await connectToDatabase();

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      process.exitCode = 1;
    }
  }

  // 1. Password Hashing & Salt Verification
  console.log("\n1. Testing Password Security:");
  const plain = "SuperSecretPassword123!";
  const hash = await hashPassword(plain);
  assert(hash.startsWith("$2a$10$") || hash.startsWith("$2b$10$"), "Bcrypt salt rounds set to 10");
  assert(await verifyPassword(plain, hash), "Password verification succeeds for correct password");
  assert(!(await verifyPassword("WrongPassword123!", hash)), "Password verification rejects wrong password");

  // 2. JWT Signing & Tamper Defense
  console.log("\n2. Testing JWT Signing & Tamper Defense:");
  const testSession: UserSession = {
    id: "test-user-security-id",
    username: "security_tester",
    name: "Security Tester",
    email: "security@hostelhub.local",
    role: "STUDENT",
    status: "ACTIVE",
  };
  const token = await signToken(testSession);
  assert(typeof token === "string" && token.split(".").length === 3, "JWT generated with standard header.payload.sig format");

  const verified = await verifyToken(token);
  assert(verified.id === testSession.id && verified.role === "STUDENT", "JWT verified successfully with correct session claims");

  let tamperFailed = false;
  try {
    const tampered = token.slice(0, -6) + "xxxxxx";
    await verifyToken(tampered);
  } catch (err) {
    tamperFailed = true;
  }
  assert(tamperFailed, "Tampered JWT token rejected with signature verification failure");

  // 3. NoSQL Regex Sanitization
  console.log("\n3. Testing NoSQL Regex Sanitization:");
  const maliciousRegexInput = "user.*)+[a-z]{1,5}?";
  const safeEscaped = escapeRegex(maliciousRegexInput);
  assert(!safeEscaped.includes(".*)") && safeEscaped.includes("\\."), "Malicious regex special characters escaped safely");

  // 4. Unique Constraints in MongoDB
  console.log("\n4. Testing MongoDB Unique Key Constraints:");
  // Clean up any test users from prior runs before building unique indexes
  await User.deleteMany({ email: { $regex: "^test_unique_" } });
  await User.init();
  await Attendance.init();

  const testEmail = `test_unique_${Date.now()}@test.local`;
  const testUsername = `user_${Date.now()}`;

  const user1 = await User.create({
    username: testUsername,
    email: testEmail,
    passwordHash: hash,
    role: "STUDENT",
    status: "ACTIVE",
  });
  assert(!!user1._id, "Initial user created successfully");

  let duplicateEmailPrevented = false;
  try {
    await User.create({
      username: `different_${Date.now()}`,
      email: testEmail, // duplicate email
      passwordHash: hash,
      role: "STUDENT",
      status: "ACTIVE",
    });
  } catch (err: any) {
    if (err.code === 11000 || err.name === "MongoServerError") {
      duplicateEmailPrevented = true;
    } else {
      console.error("Unexpected error in duplicate email test:", err);
    }
  }
  assert(duplicateEmailPrevented, "MongoDB enforces unique email constraint (E11000 duplicate key)");

  // 5. Compound Unique Constraints (Attendance: studentId + date)
  console.log("\n5. Testing Compound Unique Constraints (Attendance):");
  const testDate = "2026-10-09";
  const att1 = await Attendance.create({
    studentId: user1._id,
    date: testDate,
    status: "PRESENT",
    markedById: "staff-tester-id",
  });
  assert(!!att1._id, "Attendance record 1 created successfully");

  let duplicateAttendancePrevented = false;
  try {
    await Attendance.create({
      studentId: user1._id,
      date: testDate, // duplicate date for same student
      status: "ABSENT",
      markedById: "staff-tester-id",
    });
  } catch (err: any) {
    if (err.code === 11000 || err.name === "MongoServerError") {
      duplicateAttendancePrevented = true;
    } else {
      console.error("Unexpected error in duplicate attendance test:", err);
    }
  }
  assert(duplicateAttendancePrevented, "MongoDB enforces compound unique index on Attendance [studentId, date]");

  // 6. Atomic Concurrency (Race Condition Defense for Bed Allocation)
  console.log("\n6. Testing Atomic Concurrency on Bed Allocation:");
  // Create a temporary bed
  const tempBed = await Bed.create({
    roomId: "temp-room-test",
    bedNumber: `B-ATOMIC-${Date.now()}`,
    status: "AVAILABLE",
  });

  // Simulate two concurrent requests trying to claim the same bed simultaneously
  const [attempt1, attempt2] = await Promise.all([
    Bed.findOneAndUpdate({ _id: tempBed._id, status: "AVAILABLE" }, { $set: { status: "OCCUPIED" } }, { returnDocument: "after" }),
    Bed.findOneAndUpdate({ _id: tempBed._id, status: "AVAILABLE" }, { $set: { status: "OCCUPIED" } }, { returnDocument: "after" }),
  ]);

  const exactlyOneClaimed = (attempt1 !== null && attempt2 === null) || (attempt1 === null && attempt2 !== null);
  assert(exactlyOneClaimed, "Atomic findOneAndUpdate guarantees exactly ONE requester claims an AVAILABLE bed");

  // Clean up test documents
  await User.deleteMany({ email: testEmail });
  await Attendance.deleteMany({ studentId: user1._id });
  await Bed.deleteOne({ _id: tempBed._id });

  console.log(`\n=== Test Results: ${passed}/${total} passed ===`);
  if (passed === total) {
    console.log("All Phase 5 Security and Constraint validations PASSED!");
  }
}

runSecurityAndConstraintTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
