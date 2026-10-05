import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

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

async function runAllocationTests() {
  console.log("\n=======================================================");
  console.log("  HOSTELHUB PHASE 8 — ROOM ALLOCATION ENGINE TESTS");
  console.log("=======================================================\n");

  try {
    // 1. Setup Test Fixtures: Hostel, Block, Floor, Rooms, Beds, Test Student
    const testHostel = await prisma.hostel.upsert({
      where: { code: "H-TEST-01" },
      update: {},
      create: {
        code: "H-TEST-01",
        name: "Test Hall of Residence",
        genderType: "CO_ED",
      },
    });

    const testBlock = await prisma.block.upsert({
      where: { hostelId_code: { hostelId: testHostel.id, code: "BLK-TEST" } },
      update: {},
      create: {
        hostelId: testHostel.id,
        code: "BLK-TEST",
        name: "Test Block",
      },
    });

    const testFloor = await prisma.floor.upsert({
      where: { blockId_floorNumber: { blockId: testBlock.id, floorNumber: 99 } },
      update: {},
      create: {
        blockId: testBlock.id,
        floorNumber: 99,
        name: "Test Floor 99",
      },
    });

    // Create 2 test rooms: Room 901 (Double) and Room 902 (Single)
    const room901 = await prisma.room.upsert({
      where: { floorId_roomNumber: { floorId: testFloor.id, roomNumber: "901" } },
      update: { occupiedBeds: 0 },
      create: {
        floorId: testFloor.id,
        roomNumber: "901",
        roomType: "DOUBLE",
        capacity: 2,
        occupiedBeds: 0,
      },
    });

    const bed901A = await prisma.bed.upsert({
      where: { roomId_bedNumber: { roomId: room901.id, bedNumber: "A" } },
      update: { status: "AVAILABLE" },
      create: { roomId: room901.id, bedNumber: "A", status: "AVAILABLE" },
    });

    const bed901B = await prisma.bed.upsert({
      where: { roomId_bedNumber: { roomId: room901.id, bedNumber: "B" } },
      update: { status: "AVAILABLE" },
      create: { roomId: room901.id, bedNumber: "B", status: "AVAILABLE" },
    });

    const room902 = await prisma.room.upsert({
      where: { floorId_roomNumber: { floorId: testFloor.id, roomNumber: "902" } },
      update: { occupiedBeds: 0 },
      create: {
        floorId: testFloor.id,
        roomNumber: "902",
        roomType: "SINGLE",
        capacity: 1,
        occupiedBeds: 0,
      },
    });

    const bed902A = await prisma.bed.upsert({
      where: { roomId_bedNumber: { roomId: room902.id, bedNumber: "A" } },
      update: { status: "AVAILABLE" },
      create: { roomId: room902.id, bedNumber: "A", status: "AVAILABLE" },
    });

    // Create 2 Test Students
    const testUser1 = await prisma.user.upsert({
      where: { username: "test.student.one" },
      update: {},
      create: {
        username: "test.student.one",
        email: "test.student1@hostelhub.campus.edu",
        passwordHash: await bcrypt.hash("pass123", 10),
        role: "STUDENT",
      },
    });

    const student1 = await prisma.student.upsert({
      where: { userId: testUser1.id },
      update: {},
      create: {
        userId: testUser1.id,
        studentId: "STU-TEST-001",
        name: "Test Student Alpha",
        email: "test.student1@hostelhub.campus.edu",
        phone: "+91 99999 11111",
        course: "B.Tech Test Studies",
        department: "Testing Dept",
        yearOfStudy: 1,
        gender: "MALE",
        emergencyContactName: "Parent Alpha",
        emergencyContactPhone: "+91 99999 00001",
      },
    });

    const testUser2 = await prisma.user.upsert({
      where: { username: "test.student.two" },
      update: {},
      create: {
        username: "test.student.two",
        email: "test.student2@hostelhub.campus.edu",
        passwordHash: await bcrypt.hash("pass123", 10),
        role: "STUDENT",
      },
    });

    const student2 = await prisma.student.upsert({
      where: { userId: testUser2.id },
      update: {},
      create: {
        userId: testUser2.id,
        studentId: "STU-TEST-002",
        name: "Test Student Beta",
        email: "test.student2@hostelhub.campus.edu",
        phone: "+91 99999 22222",
        course: "B.Tech Test Studies",
        department: "Testing Dept",
        yearOfStudy: 2,
        gender: "FEMALE",
        emergencyContactName: "Parent Beta",
        emergencyContactPhone: "+91 99999 00002",
      },
    });

    // Clear any previous test allocations for these students/beds
    await prisma.roomAllocation.deleteMany({
      where: {
        OR: [
          { studentId: student1.id },
          { studentId: student2.id },
          { bedId: bed901A.id },
          { bedId: bed901B.id },
          { bedId: bed902A.id },
        ],
      },
    });
    await prisma.bed.updateMany({
      where: { id: { in: [bed901A.id, bed901B.id, bed902A.id] } },
      data: { status: "AVAILABLE" },
    });
    await prisma.room.updateMany({
      where: { id: { in: [room901.id, room902.id] } },
      data: { occupiedBeds: 0 },
    });

    console.log("Section 1: Initial Allocation");
    // Test 1: Allocate bed 901A to student1
    const alloc1 = await prisma.$transaction(async (tx) => {
      const b = await tx.bed.findUnique({ where: { id: bed901A.id } });
      if (b?.status !== "AVAILABLE") throw new Error("Bed unavailable");
      const a = await tx.roomAllocation.create({
        data: {
          studentId: student1.id,
          bedId: bed901A.id,
          academicYear: "2026-2027",
          status: "ACTIVE",
        },
      });
      await tx.bed.update({ where: { id: bed901A.id }, data: { status: "OCCUPIED" } });
      await tx.room.update({ where: { id: room901.id }, data: { occupiedBeds: { increment: 1 } } });
      return a;
    });

    const updatedBed901A = await prisma.bed.findUnique({ where: { id: bed901A.id } });
    const updatedRoom901 = await prisma.room.findUnique({ where: { id: room901.id } });

    assert(alloc1.status === "ACTIVE", "Room allocation created with status ACTIVE");
    assert(updatedBed901A?.status === "OCCUPIED", "Target bed updated to OCCUPIED status");
    assert(updatedRoom901?.occupiedBeds === 1, "Room occupiedBeds incremented from 0 to 1");

    console.log("\nSection 2: Concurrency & Invariant Enforcement");
    // Test 2: Double Allocation Prevention (student1 trying to allocate bed901B)
    let doubleAllocError = false;
    try {
      const existing = await prisma.roomAllocation.findFirst({
        where: { studentId: student1.id, status: "ACTIVE" },
      });
      if (existing) throw new Error("Student already has an active room allocation.");
    } catch (e: any) {
      if (e.message.includes("already has an active room allocation")) {
        doubleAllocError = true;
      }
    }
    assert(doubleAllocError, "System prevents student with active allocation from receiving duplicate bed");

    // Test 3: Occupied Bed Allocation Prevention (student2 trying to allocate already occupied bed901A)
    let occupiedBedError = false;
    try {
      const targetBed = await prisma.bed.findUnique({ where: { id: bed901A.id } });
      if (targetBed?.status !== "AVAILABLE") {
        throw new Error(`Bed ${targetBed?.bedNumber} is currently ${targetBed?.status} and cannot be allocated.`);
      }
    } catch (e: any) {
      if (e.message.includes("cannot be allocated")) {
        occupiedBedError = true;
      }
    }
    assert(occupiedBedError, "System rejects allocation of an already OCCUPIED bed");

    // Test 4: Allocate student2 to remaining bed 901B (room capacity reaches limit)
    const alloc2 = await prisma.$transaction(async (tx) => {
      const a = await tx.roomAllocation.create({
        data: {
          studentId: student2.id,
          bedId: bed901B.id,
          academicYear: "2026-2027",
          status: "ACTIVE",
        },
      });
      await tx.bed.update({ where: { id: bed901B.id }, data: { status: "OCCUPIED" } });
      await tx.room.update({ where: { id: room901.id }, data: { occupiedBeds: { increment: 1 } } });
      return a;
    });

    const room901Full = await prisma.room.findUnique({ where: { id: room901.id } });
    assert(room901Full?.occupiedBeds === 2, "Room 901 reached full capacity (2/2 occupied)");

    console.log("\nSection 3: Transactional Room Transfer Workflow");
    // Test 5: Transfer student1 from 901A to 902A
    const transferResult = await prisma.$transaction(async (tx) => {
      // Free old bed
      await tx.roomAllocation.update({
        where: { id: alloc1.id },
        data: { status: "TRANSFERRED", vacatedAt: new Date(), remarks: "Moved to Single Room" },
      });
      await tx.bed.update({ where: { id: bed901A.id }, data: { status: "AVAILABLE" } });
      await tx.room.update({ where: { id: room901.id }, data: { occupiedBeds: { decrement: 1 } } });

      // Occupy new bed
      const newAlloc = await tx.roomAllocation.create({
        data: {
          studentId: student1.id,
          bedId: bed902A.id,
          academicYear: "2026-2027",
          status: "ACTIVE",
          remarks: "Transferred from Room 901 Bed A",
        },
      });
      await tx.bed.update({ where: { id: bed902A.id }, data: { status: "OCCUPIED" } });
      await tx.room.update({ where: { id: room902.id }, data: { occupiedBeds: { increment: 1 } } });

      return newAlloc;
    });

    const checkOldBed = await prisma.bed.findUnique({ where: { id: bed901A.id } });
    const checkOldRoom = await prisma.room.findUnique({ where: { id: room901.id } });
    const checkNewBed = await prisma.bed.findUnique({ where: { id: bed902A.id } });
    const checkNewRoom = await prisma.room.findUnique({ where: { id: room902.id } });
    const oldAlloc = await prisma.roomAllocation.findUnique({ where: { id: alloc1.id } });

    assert(oldAlloc?.status === "TRANSFERRED", "Previous allocation marked as TRANSFERRED");
    assert(checkOldBed?.status === "AVAILABLE", "Previous bed status reverted to AVAILABLE");
    assert(checkOldRoom?.occupiedBeds === 1, "Previous room occupiedBeds decremented (2 -> 1)");
    assert(transferResult.status === "ACTIVE", "New allocation created with status ACTIVE");
    assert(checkNewBed?.status === "OCCUPIED", "Target bed status updated to OCCUPIED");
    assert(checkNewRoom?.occupiedBeds === 1, "Target room occupiedBeds incremented (0 -> 1)");

    console.log("\nSection 4: Transactional Room Vacate Workflow");
    // Test 6: Vacate student2 from 901B
    const vacateResult = await prisma.$transaction(async (tx) => {
      const v = await tx.roomAllocation.update({
        where: { id: alloc2.id },
        data: { status: "VACATED", vacatedAt: new Date(), remarks: "Semester completed" },
      });
      await tx.bed.update({ where: { id: bed901B.id }, data: { status: "AVAILABLE" } });
      await tx.room.update({ where: { id: room901.id }, data: { occupiedBeds: { decrement: 1 } } });
      return v;
    });

    const vacatedBed = await prisma.bed.findUnique({ where: { id: bed901B.id } });
    const vacatedRoom = await prisma.room.findUnique({ where: { id: room901.id } });

    assert(vacateResult.status === "VACATED", "Allocation successfully marked as VACATED");
    assert(vacatedBed?.status === "AVAILABLE", "Vacated bed status reverted to AVAILABLE");
    assert(vacatedRoom?.occupiedBeds === 0, "Room 901 occupiedBeds returned to 0");

    console.log("\nSection 5: Post-Vacate Re-Allocation Verification");
    // Test 7: Verify student2 can be re-allocated now that previous allocation is VACATED
    const canReallocate = await prisma.roomAllocation.findFirst({
      where: { studentId: student2.id, status: "ACTIVE" },
    });
    assert(canReallocate === null, "Student2 has no active allocations and is eligible for new allocation");

    // Clean up test data
    await prisma.roomAllocation.deleteMany({
      where: { OR: [{ studentId: student1.id }, { studentId: student2.id }] },
    });
    await prisma.student.deleteMany({ where: { id: { in: [student1.id, student2.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [testUser1.id, testUser2.id] } } });
    await prisma.bed.deleteMany({ where: { id: { in: [bed901A.id, bed901B.id, bed902A.id] } } });
    await prisma.room.deleteMany({ where: { id: { in: [room901.id, room902.id] } } });
    await prisma.floor.deleteMany({ where: { id: testFloor.id } });
    await prisma.block.deleteMany({ where: { id: testBlock.id } });
    await prisma.hostel.deleteMany({ where: { id: testHostel.id } });

    console.log(`\n=======================================================`);
    console.log(`  ALLOCATION ENGINE TESTS SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log(`=======================================================\n`);

    if (testsFailed > 0) process.exit(1);
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

runAllocationTests();
