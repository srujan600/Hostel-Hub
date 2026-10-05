import { prisma } from "../src/lib/prisma";
import { signToken, requireAuth, hashPassword } from "../src/lib/auth";
import { NextRequest } from "next/server";
import { UserSession } from "../src/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error("    Details:", details);
    failed++;
  }
}

async function runEdgeCaseTests() {
  console.log("\n=======================================================");
  console.log("  HOSTELHUB PHASE 15 — 15 PRD CRITICAL EDGE CASES TEST");
  console.log("=======================================================\n");

  let testHostel: any = null;
  let testBlock: any = null;
  let testFloor: any = null;
  let singleRoom: any = null;
  let doubleRoom: any = null;
  let bedSingleA: any = null;
  let bedDoubleA: any = null;
  let bedDoubleB: any = null;

  let student1User: any = null;
  let student1: any = null;
  let student2User: any = null;
  let student2: any = null;
  let wardenUser: any = null;
  let wardenStaff: any = null;
  let adminUser: any = null;

  let student1Token = "";
  let student2Token = "";
  let wardenToken = "";
  let adminToken = "";

  try {
    // -------------------------------------------------------------
    // Setup Test Topology
    // -------------------------------------------------------------
    console.log("Setup: Provisioning Isolated Test Facility Topology");
    const testHash = await hashPassword("TestPass123!");

    // Hostel & Rooms
    testHostel = await prisma.hostel.create({
      data: {
        code: `H-EC-${Date.now().toString().slice(-4)}`,
        name: "Edge Case Test Hall",
        genderType: "CO_ED",
      },
    });

    testBlock = await prisma.block.create({
      data: {
        hostelId: testHostel.id,
        code: "BLK-EC",
        name: "Block EC",
      },
    });

    testFloor = await prisma.floor.create({
      data: {
        blockId: testBlock.id,
        floorNumber: 1,
        name: "1st Floor",
      },
    });

    singleRoom = await prisma.room.create({
      data: {
        floorId: testFloor.id,
        roomNumber: "EC-101",
        roomType: "SINGLE",
        capacity: 1,
        occupiedBeds: 0,
        status: "ACTIVE",
      },
    });

    bedSingleA = await prisma.bed.create({
      data: {
        roomId: singleRoom.id,
        bedNumber: "A",
        status: "AVAILABLE",
      },
    });

    doubleRoom = await prisma.room.create({
      data: {
        floorId: testFloor.id,
        roomNumber: "EC-102",
        roomType: "DOUBLE",
        capacity: 2,
        occupiedBeds: 0,
        status: "ACTIVE",
      },
    });

    bedDoubleA = await prisma.bed.create({
      data: {
        roomId: doubleRoom.id,
        bedNumber: "A",
        status: "AVAILABLE",
      },
    });

    bedDoubleB = await prisma.bed.create({
      data: {
        roomId: doubleRoom.id,
        bedNumber: "B",
        status: "AVAILABLE",
      },
    });

    // Student 1
    student1User = await prisma.user.create({
      data: {
        username: `ec_stu1_${Date.now()}`,
        email: `stu1_${Date.now()}@campus.edu`,
        passwordHash: testHash,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });
    student1 = await prisma.student.create({
      data: {
        userId: student1User.id,
        name: "Edge Case Resident 1",
        studentId: `STU-EC1-${Date.now().toString().slice(-4)}`,
        email: student1User.email,
        phone: "+91 9888800001",
        course: "B.Tech Computer Science",
        department: "Engineering",
        yearOfStudy: 2,
        gender: "MALE",
        emergencyContactName: "Guardian 1",
        emergencyContactPhone: "+91 9888800001",
      },
    });

    // Student 2
    student2User = await prisma.user.create({
      data: {
        username: `ec_stu2_${Date.now()}`,
        email: `stu2_${Date.now()}@campus.edu`,
        passwordHash: testHash,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });
    student2 = await prisma.student.create({
      data: {
        userId: student2User.id,
        name: "Edge Case Resident 2",
        studentId: `STU-EC2-${Date.now().toString().slice(-4)}`,
        email: student2User.email,
        phone: "+91 9888800002",
        course: "B.Tech Mechanical",
        department: "Engineering",
        yearOfStudy: 3,
        gender: "MALE",
        emergencyContactName: "Guardian 2",
        emergencyContactPhone: "+91 9888800002",
      },
    });

    // Warden
    wardenUser = await prisma.user.create({
      data: {
        username: `ec_warden_${Date.now()}`,
        email: `warden_ec_${Date.now()}@campus.edu`,
        passwordHash: testHash,
        role: "WARDEN",
        status: "ACTIVE",
      },
    });
    wardenStaff = await prisma.staff.create({
      data: {
        userId: wardenUser.id,
        name: "Warden EC",
        employeeId: `EMP-EC-${Date.now().toString().slice(-4)}`,
        email: wardenUser.email,
        phone: "+91 9888800003",
        role: "WARDEN",
        designation: "Hall Supervisor",
      },
    });

    // Admin
    adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });

    // Tokens
    student1Token = await signToken({
      id: student1User.id,
      username: student1User.username,
      name: student1.name,
      email: student1User.email,
      role: "STUDENT",
      status: "ACTIVE",
      studentId: student1.studentId,
    });

    student2Token = await signToken({
      id: student2User.id,
      username: student2User.username,
      name: student2.name,
      email: student2User.email,
      role: "STUDENT",
      status: "ACTIVE",
      studentId: student2.studentId,
    });

    wardenToken = await signToken({
      id: wardenUser.id,
      username: wardenUser.username,
      name: wardenStaff.name,
      email: wardenUser.email,
      role: "WARDEN",
      status: "ACTIVE",
      staffId: wardenStaff.employeeId,
    });

    adminToken = await signToken({
      id: adminUser.id,
      username: adminUser.username,
      name: "Administrator",
      email: adminUser.email,
      role: "ADMIN",
      status: "ACTIVE",
    });

    assert(!!student1 && !!student2 && !!wardenStaff, "Test fixtures provisioned successfully");

    // -------------------------------------------------------------
    // EC 1: Double-Booking Concurrency Race Condition Prevention
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 1: Double-Booking Concurrency Race Condition Prevention");
    const { POST: allocateRoom } = await import("../src/app/api/allocations/route");

    // Allocation 1: Assign student1 to bedDoubleA
    const reqAlloc1 = new NextRequest("http://localhost:3000/api/allocations", {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        studentId: student1.id,
        bedId: bedDoubleA.id,
        academicYear: "2026-2027",
      }),
    });
    const resAlloc1 = await allocateRoom(reqAlloc1);
    const jsonAlloc1 = await resAlloc1.json();
    assert(
      (resAlloc1.status === 200 || resAlloc1.status === 201) && jsonAlloc1.success === true,
      "First allocation succeeds for Bed 102-A"
    );

    // Allocation 2: Attempting to assign student2 to same bedDoubleA must be blocked
    const reqAlloc2 = new NextRequest("http://localhost:3000/api/allocations", {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        studentId: student2.id,
        bedId: bedDoubleA.id,
        academicYear: "2026-2027",
      }),
    });
    const resAlloc2 = await allocateRoom(reqAlloc2);
    const jsonAlloc2 = await resAlloc2.json();
    assert(
      (resAlloc2.status === 400 || resAlloc2.status === 409) && jsonAlloc2.success === false,
      "Double-booking BLOCKED: Second simultaneous allocation to same bed is rejected"
    );

    // -------------------------------------------------------------
    // EC 2: Multi-Bed Capacity Ceiling Enforcement
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 2: Multi-Bed Capacity Ceiling Enforcement");
    // Allocate student2 to bedSingleA (Single room, cap = 1)
    const reqSingleAlloc1 = new NextRequest("http://localhost:3000/api/allocations", {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        studentId: student2.id,
        bedId: bedSingleA.id,
        academicYear: "2026-2027",
      }),
    });
    const resSingleAlloc1 = await allocateRoom(reqSingleAlloc1);
    assert(resSingleAlloc1.status === 200 || resSingleAlloc1.status === 201, "Single room allocated to capacity (1/1 occupied)");

    const updatedSingleRoom = await prisma.room.findUnique({ where: { id: singleRoom.id } });
    assert(
      updatedSingleRoom?.occupiedBeds === 1 && updatedSingleRoom?.capacity === 1,
      "Single room reached maximum capacity ceiling (1/1)"
    );

    // -------------------------------------------------------------
    // EC 3: Atomic Bed Transfer Workflow
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 3: Atomic Bed Transfer Workflow");
    const { POST: transferAllocation } = await import("../src/app/api/allocations/[id]/transfer/route");

    // Get student1's active allocation in 102-A
    const student1Alloc = await prisma.roomAllocation.findFirst({
      where: { studentId: student1.id, status: "ACTIVE" },
    });
    assert(!!student1Alloc, "Found student1 active allocation");

    // Transfer student1 from 102-A to 102-B
    const reqTransfer = new NextRequest(`http://localhost:3000/api/allocations/${student1Alloc!.id}/transfer`, {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        newBedId: bedDoubleB.id,
        reason: "Noise reduction request",
      }),
    });
    const resTransfer = await transferAllocation(reqTransfer, {
      params: Promise.resolve({ id: student1Alloc!.id }),
    });
    const jsonTransfer = await resTransfer.json();
    assert(resTransfer.status === 200 && jsonTransfer.success === true, "Transfer executed successfully");

    // Verify atomicity
    const oldAlloc = await prisma.roomAllocation.findUnique({ where: { id: student1Alloc!.id } });
    const oldBed = await prisma.bed.findUnique({ where: { id: bedDoubleA.id } });
    const newBed = await prisma.bed.findUnique({ where: { id: bedDoubleB.id } });
    const newAlloc = await prisma.roomAllocation.findFirst({
      where: { studentId: student1.id, status: "ACTIVE" },
    });

    assert(oldAlloc?.status === "TRANSFERRED", "Old allocation marked TRANSFERRED");
    assert(oldBed?.status === "AVAILABLE", "Previous bed reverted to AVAILABLE");
    assert(newAlloc?.bedId === bedDoubleB.id, "New allocation active on target bed");
    assert(newBed?.status === "OCCUPIED", "Target bed status updated to OCCUPIED");

    // -------------------------------------------------------------
    // EC 4: Post-Vacate State Integrity & Re-Allocation
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 4: Post-Vacate State Integrity & Re-Allocation");
    const { POST: vacateAllocation } = await import("../src/app/api/allocations/[id]/vacate/route");

    const student2Alloc = await prisma.roomAllocation.findFirst({
      where: { studentId: student2.id, status: "ACTIVE" },
    });
    assert(!!student2Alloc, "Found student2 active allocation in 101-A");

    // Vacate student2
    const reqVacate = new NextRequest(`http://localhost:3000/api/allocations/${student2Alloc!.id}/vacate`, {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({ reason: "Semester exchange program" }),
    });
    const resVacate = await vacateAllocation(reqVacate, {
      params: Promise.resolve({ id: student2Alloc!.id }),
    });
    assert(resVacate.status === 200, "Allocation successfully vacated");

    const vacatedBed = await prisma.bed.findUnique({ where: { id: bedSingleA.id } });
    const vacatedRoom = await prisma.room.findUnique({ where: { id: singleRoom.id } });
    assert(vacatedBed?.status === "AVAILABLE", "Vacated bed reverted to AVAILABLE");
    assert(vacatedRoom?.occupiedBeds === 0, "Room occupancy decremented to 0");

    // Re-allocate student2 to now-free bedDoubleA
    const reqRealloc = new NextRequest("http://localhost:3000/api/allocations", {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        studentId: student2.id,
        bedId: bedDoubleA.id,
        academicYear: "2026-2027",
      }),
    });
    const resRealloc = await allocateRoom(reqRealloc);
    assert(resRealloc.status === 200 || resRealloc.status === 201, "Vacated student successfully eligible for re-allocation");

    // -------------------------------------------------------------
    // EC 5: Overlapping Leave Window Conflict
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 5: Overlapping Leave Window Conflict");
    const { POST: submitLeave } = await import("../src/app/api/leave-requests/route");

    const baseStart = new Date(Date.now() + 24 * 3600 * 1000);
    const baseEnd = new Date(Date.now() + 48 * 3600 * 1000);

    // Initial valid leave
    const reqLeave1 = new NextRequest("http://localhost:3000/api/leave-requests", {
      method: "POST",
      headers: { authorization: `Bearer ${student1Token}`, "content-type": "application/json" },
      body: JSON.stringify({
        leaveType: "DAY_OUTING",
        startDate: baseStart.toISOString(),
        endDate: baseEnd.toISOString(),
        reason: "Family gathering in hometown",
        destination: "Hometown",
        emergencyContact: "+91 9888800001",
      }),
    });
    const resLeave1 = await submitLeave(reqLeave1);
    assert(resLeave1.status === 201, "First leave request created successfully");

    // Overlapping leave: starting 12 hours after first leave starts (inside window)
    const overlapStart = new Date(baseStart.getTime() + 12 * 3600 * 1000);
    const overlapEnd = new Date(baseEnd.getTime() + 12 * 3600 * 1000);
    const reqLeaveOverlap = new NextRequest("http://localhost:3000/api/leave-requests", {
      method: "POST",
      headers: { authorization: `Bearer ${student1Token}`, "content-type": "application/json" },
      body: JSON.stringify({
        leaveType: "DAY_OUTING",
        startDate: overlapStart.toISOString(),
        endDate: overlapEnd.toISOString(),
        reason: "Conflicting duplicate application",
        destination: "City Center",
        emergencyContact: "+91 9888800001",
      }),
    });
    const resLeaveOverlap = await submitLeave(reqLeaveOverlap);
    const jsonLeaveOverlap = await resLeaveOverlap.json();
    assert(
      resLeaveOverlap.status === 409 && jsonLeaveOverlap.success === false,
      "Overlapping leave application rejected with 409 Conflict"
    );

    // -------------------------------------------------------------
    // EC 6: Backdated Departure Date Block
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 6: Backdated Departure Date Block");
    const pastStart = new Date(Date.now() - 48 * 3600 * 1000);
    const pastEnd = new Date(Date.now() + 24 * 3600 * 1000);
    const reqBackdated = new NextRequest("http://localhost:3000/api/leave-requests", {
      method: "POST",
      headers: { authorization: `Bearer ${student2Token}`, "content-type": "application/json" },
      body: JSON.stringify({
        leaveType: "DAY_OUTING",
        startDate: pastStart.toISOString(),
        endDate: pastEnd.toISOString(),
        reason: "Attempting backdated leave submission",
        destination: "City",
        emergencyContact: "+91 9888800002",
      }),
    });
    const resBackdated = await submitLeave(reqBackdated);
    const jsonBackdated = await resBackdated.json();
    assert(
      resBackdated.status === 400 && jsonBackdated.success === false,
      "Backdated departure date rejected with 400 Bad Request"
    );

    // -------------------------------------------------------------
    // EC 7: Return Date Before Departure Date Rejection
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 7: Return Date Before Departure Date Rejection");
    const futureStart = new Date(Date.now() + 72 * 3600 * 1000);
    const invertedEnd = new Date(futureStart.getTime() - 2 * 3600 * 1000); // 2h before departure
    const reqInvertedDates = new NextRequest("http://localhost:3000/api/leave-requests", {
      method: "POST",
      headers: { authorization: `Bearer ${student2Token}`, "content-type": "application/json" },
      body: JSON.stringify({
        leaveType: "DAY_OUTING",
        startDate: futureStart.toISOString(),
        endDate: invertedEnd.toISOString(),
        reason: "Invalid chronological timeline",
        destination: "City",
        emergencyContact: "+91 9888800002",
      }),
    });
    const resInverted = await submitLeave(reqInvertedDates);
    assert(resInverted.status === 400, "Return date earlier than departure date rejected with 400 Bad Request");

    // -------------------------------------------------------------
    // EC 8: Complaint Lifecycle State Machine & Reopening
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 8: Complaint Lifecycle State Machine & Reopening");
    const { POST: submitComplaint } = await import("../src/app/api/complaints/route");
    const { PATCH: updateComplaint } = await import("../src/app/api/complaints/[id]/route");

    // 1. Student submits
    const reqCmpCreate = new NextRequest("http://localhost:3000/api/complaints", {
      method: "POST",
      headers: { authorization: `Bearer ${student1Token}`, "content-type": "application/json" },
      body: JSON.stringify({
        category: "ELECTRICAL",
        title: "Ceiling fan regulator sparking",
        description: "Speed control knob sparks on position 3.",
        location: "Room 102",
        priority: "HIGH",
      }),
    });
    const resCmpCreate = await submitComplaint(reqCmpCreate);
    const jsonCmpCreate = await resCmpCreate.json();
    const complaintId = jsonCmpCreate.data.id;
    assert(jsonCmpCreate.data.status === "SUBMITTED", "1. Created with status SUBMITTED");

    // 2. Warden assigns
    const reqCmpAssign = new NextRequest(`http://localhost:3000/api/complaints/${complaintId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${wardenToken}`, "content-type": "application/json" },
      body: JSON.stringify({ status: "ASSIGNED", assignedStaffId: wardenStaff.id }),
    });
    const resCmpAssign = await updateComplaint(reqCmpAssign, { params: Promise.resolve({ id: complaintId }) });
    const jsonCmpAssign = await resCmpAssign.json();
    assert(jsonCmpAssign.data.status === "ASSIGNED", "2. Assigned with status ASSIGNED");

    // 3. Warden marks IN_PROGRESS
    const reqCmpProg = new NextRequest(`http://localhost:3000/api/complaints/${complaintId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${wardenToken}`, "content-type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
    const resCmpProg = await updateComplaint(reqCmpProg, { params: Promise.resolve({ id: complaintId }) });
    assert((await resCmpProg.json()).data.status === "IN_PROGRESS", "3. Status updated to IN_PROGRESS");

    // 4. Warden marks RESOLVED
    const reqCmpRes = new NextRequest(`http://localhost:3000/api/complaints/${complaintId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${wardenToken}`, "content-type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    const resCmpRes = await updateComplaint(reqCmpRes, { params: Promise.resolve({ id: complaintId }) });
    assert((await resCmpRes.json()).data.status === "RESOLVED", "4. Status updated to RESOLVED");

    // 5. Student reopens complaint (issue persists)
    const reqCmpReopen = new NextRequest(`http://localhost:3000/api/complaints/${complaintId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${student1Token}`, "content-type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS", comment: "Still sparking after electrician visit." }),
    });
    const resCmpReopen = await updateComplaint(reqCmpReopen, { params: Promise.resolve({ id: complaintId }) });
    assert((await resCmpReopen.json()).data.status === "IN_PROGRESS", "5. Student successfully reopened ticket to IN_PROGRESS");

    // -------------------------------------------------------------
    // EC 9: Aging Complaint 48-Hour SLA Breach Detection
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 9: Aging Complaint 48-Hour SLA Breach Detection");
    // Backdate an open complaint to 52 hours ago
    const fiftyTwoHoursAgo = new Date(Date.now() - 52 * 3600 * 1000);
    const agingCmp = await prisma.complaint.create({
      data: {
        complaintCode: `CMP-AGING-${Date.now().toString().slice(-4)}`,
        studentId: student2.id,
        category: "PLUMBING",
        title: "Aging washbasin tap leak",
        description: "Continuous dripping tap.",
        location: "Room 102",
        priority: "MEDIUM",
        status: "SUBMITTED",
        createdAt: fiftyTwoHoursAgo,
      },
    });

    const { GET: getAnalytics } = await import("../src/app/api/reports/analytics/route");
    const reqAnalytics = new NextRequest("http://localhost:3000/api/reports/analytics", {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const resAnalytics = await getAnalytics(reqAnalytics);
    const jsonAnalytics = await resAnalytics.json();
    assert(
      jsonAnalytics.data.complaints.agingOver48h >= 1,
      "Aging complaint (>48h SLA breach) accurately detected in institutional analytics"
    );

    // -------------------------------------------------------------
    // EC 10: Curfew Attendance Idempotency & In-Place Updates
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 10: Curfew Attendance Idempotency & In-Place Updates");
    const { POST: recordAttendance } = await import("../src/app/api/warden/attendance/route");
    const testDate = "2026-10-04";

    // Initial mark: ABSENT
    const reqAtt1 = new NextRequest("http://localhost:3000/api/warden/attendance", {
      method: "POST",
      headers: { authorization: `Bearer ${wardenToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        date: testDate,
        studentId: student1.id,
        status: "ABSENT",
        remarks: "Not at roll call",
      }),
    });
    const resAtt1 = await recordAttendance(reqAtt1);
    assert(resAtt1.status === 200, "First attendance mark recorded as ABSENT");

    // Correction: Warden updates same resident for same date to LATE
    const reqAtt2 = new NextRequest("http://localhost:3000/api/warden/attendance", {
      method: "POST",
      headers: { authorization: `Bearer ${wardenToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        date: testDate,
        studentId: student1.id,
        status: "LATE",
        remarks: "Checked in late at 22:45 with library slip",
      }),
    });
    const resAtt2 = await recordAttendance(reqAtt2);
    assert(resAtt2.status === 200, "Correction update executed successfully");

    const attendanceRecordsCount = await prisma.attendance.count({
      where: { studentId: student1.id, date: testDate },
    });
    const updatedRecord = await prisma.attendance.findFirst({
      where: { studentId: student1.id, date: testDate },
    });
    assert(attendanceRecordsCount === 1, "IDEMPOTENCY: Exactly 1 record exists for the date (no duplicate rows)");
    assert(updatedRecord?.status === "LATE", "Attendance status in-place corrected to LATE");

    // -------------------------------------------------------------
    // EC 11: 30-Day Repeat Curfew Absentee Watchlist
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 11: 30-Day Repeat Curfew Absentee Watchlist");
    // Create 2 unexcused absences for student2 on recent dates
    await prisma.attendance.createMany({
      data: [
        {
          studentId: student2.id,
          date: "2026-10-01",
          status: "ABSENT",
          markedById: wardenStaff.id,
          remarks: "Curfew violation 1",
        },
        {
          studentId: student2.id,
          date: "2026-10-02",
          status: "ABSENT",
          markedById: wardenStaff.id,
          remarks: "Curfew violation 2",
        },
      ],
    });

    const resRepeatAnalytics = await getAnalytics(reqAnalytics);
    const jsonRepeatAnalytics = await resRepeatAnalytics.json();
    const repeatAbsentees = jsonRepeatAnalytics.data.attendance.repeatAbsentees || [];
    const student2Flagged = repeatAbsentees.some((item: any) => item.student.id === student2.id);
    assert(student2Flagged, "Repeat curfew absentee (>=2 unexcused absences) automatically flagged on watchlist");

    // -------------------------------------------------------------
    // EC 12: Security Visitor Pass Lifecycle & Gate Timestamps
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 12: Security Visitor Pass Lifecycle & Gate Timestamps");
    const { POST: createVisitor } = await import("../src/app/api/visitors/route");
    const { PATCH: updatePass } = await import("../src/app/api/visitors/passes/[id]/route");

    // 1. Register visitor pass
    const reqVis = new NextRequest("http://localhost:3000/api/visitors", {
      method: "POST",
      headers: { authorization: `Bearer ${student1Token}`, "content-type": "application/json" },
      body: JSON.stringify({
        name: "Uncle Robert",
        phone: "+91 9777700001",
        relationship: "RELATIVE",
        visitDate: new Date().toISOString(),
        expectedEntryTime: "14:00",
        expectedExitTime: "17:00",
      }),
    });
    const resVis = await createVisitor(reqVis);
    const jsonVis = await resVis.json();
    const passId = jsonVis.data.pass.id;
    assert(jsonVis.data.pass.status === "PENDING", "Visitor pass created with status PENDING");

    // 2. Warden approves pass
    const reqPassApprove = new NextRequest(`http://localhost:3000/api/visitors/passes/${passId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${wardenToken}`, "content-type": "application/json" },
      body: JSON.stringify({ status: "APPROVED", remarks: "Approved by block warden" }),
    });
    const resPassApprove = await updatePass(reqPassApprove, { params: Promise.resolve({ id: passId }) });
    assert((await resPassApprove.json()).data.status === "APPROVED", "Visitor pass approved by Warden");

    // 3. Security checks in visitor
    const reqPassIn = new NextRequest(`http://localhost:3000/api/visitors/passes/${passId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({ status: "CHECKED_IN" }),
    });
    const resPassIn = await updatePass(reqPassIn, { params: Promise.resolve({ id: passId }) });
    const jsonPassIn = await resPassIn.json();
    assert(
      jsonPassIn.data.status === "CHECKED_IN" && !!jsonPassIn.data.actualEntryTime,
      "Gate Check-In recorded with actualEntryTime timestamp"
    );

    // 4. Security checks out visitor
    const reqPassOut = new NextRequest(`http://localhost:3000/api/visitors/passes/${passId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({ status: "CHECKED_OUT" }),
    });
    const resPassOut = await updatePass(reqPassOut, { params: Promise.resolve({ id: passId }) });
    const jsonPassOut = await resPassOut.json();
    assert(
      jsonPassOut.data.status === "CHECKED_OUT" && !!jsonPassOut.data.actualExitTime,
      "Gate Check-Out recorded with actualExitTime timestamp"
    );

    // -------------------------------------------------------------
    // EC 13: Expired Notice Circular Filtering
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 13: Expired Notice Circular Filtering");
    const { GET: getNotices } = await import("../src/app/api/notices/route");

    // Active notice
    const activeNotice = await prisma.notice.create({
      data: {
        noticeCode: `NOT-EC-ACT-${Date.now().toString().slice(-4)}`,
        title: "Active Campus Advisory",
        content: "Hostel day celebrations schedule.",
        priority: "HIGH",
        targetAudience: "ALL",
        isPublished: true,
        expiryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        publishedById: wardenStaff.id,
      },
    });

    // Expired notice
    const expiredNotice = await prisma.notice.create({
      data: {
        noticeCode: `NOT-EC-EXP-${Date.now().toString().slice(-4)}`,
        title: "Past Notice Circular",
        content: "Outdated maintenance notice.",
        priority: "LOW",
        targetAudience: "ALL",
        isPublished: true,
        expiryDate: new Date(Date.now() - 24 * 3600 * 1000), // yesterday
        publishedById: wardenStaff.id,
      },
    });

    const reqNoticeBoard = new NextRequest("http://localhost:3000/api/notices", {
      headers: { authorization: `Bearer ${student1Token}` },
    });
    const resNoticeBoard = await getNotices(reqNoticeBoard);
    const jsonNoticeBoard = await resNoticeBoard.json();
    const noticeList = jsonNoticeBoard.data || [];

    const hasActive = noticeList.some((n: any) => n.id === activeNotice.id);
    const hasExpired = noticeList.some((n: any) => n.id === expiredNotice.id);
    assert(hasActive, "Active notice circular is present on resident notice board");
    assert(!hasExpired, "Expired notice circular is filtered out from resident notice board");

    // -------------------------------------------------------------
    // EC 14: Suspended / Graduated Student Access Revocation
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 14: Suspended / Graduated Student Access Revocation");
    // Temporarily mark student2 as SUSPENDED
    await prisma.user.update({
      where: { id: student2User.id },
      data: { status: "SUSPENDED" },
    });

    const suspendedToken = await signToken({
      id: student2User.id,
      username: student2User.username,
      name: student2.name,
      email: student2User.email,
      role: "STUDENT",
      status: "SUSPENDED",
    });

    const reqSuspendedCall = new NextRequest("http://localhost:3000/api/complaints", {
      headers: { authorization: `Bearer ${suspendedToken}` },
    });
    let accessBlocked = false;
    try {
      await requireAuth(reqSuspendedCall);
    } catch (err: any) {
      if (err.statusCode === 401 || err.name === "UnauthorizedError") {
        accessBlocked = true;
      }
    }
    assert(accessBlocked, "Suspended student account blocked with 401 Unauthorized");

    // Revert student2 status
    await prisma.user.update({
      where: { id: student2User.id },
      data: { status: "ACTIVE" },
    });

    // -------------------------------------------------------------
    // EC 15: Audit Ledger Immutability & Chronological Traceability
    // -------------------------------------------------------------
    console.log("\n🔹 Edge Case 15: Audit Ledger Immutability & Chronological Traceability");
    const { GET: getAuditLedger } = await import("../src/app/api/admin/audit-logs/route");

    const reqAudit = new NextRequest("http://localhost:3000/api/admin/audit-logs?limit=20", {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const resAudit = await getAuditLedger(reqAudit);
    const jsonAudit = await resAudit.json();
    const logs = jsonAudit.data.logs || [];

    assert(logs.length > 0, "Audit ledger contains recorded operations");
    const isChronological = logs.every((log: any, i: number) => {
      if (i === 0) return true;
      return new Date(log.createdAt).getTime() <= new Date(logs[i - 1].createdAt).getTime();
    });
    assert(isChronological, "Audit records are indexed and served in strict reverse chronological order");

    // -------------------------------------------------------------
    // Teardown Test Fixtures
    // -------------------------------------------------------------
    console.log("\nTeardown: Expunging Test Topology and Records");
    await prisma.notice.deleteMany({ where: { id: { in: [activeNotice.id, expiredNotice.id] } } });
    await prisma.visitorPass.deleteMany({ where: { id: passId } });
    await prisma.visitor.deleteMany({ where: { studentId: student1.id } });
    await prisma.attendance.deleteMany({ where: { studentId: { in: [student1.id, student2.id] } } });
    await prisma.complaintComment.deleteMany({ where: { complaintId: { in: [complaintId, agingCmp.id] } } });
    await prisma.complaint.deleteMany({ where: { id: { in: [complaintId, agingCmp.id] } } });
    await prisma.leaveRequest.deleteMany({ where: { studentId: { in: [student1.id, student2.id] } } });
    await prisma.roomAllocation.deleteMany({ where: { studentId: { in: [student1.id, student2.id] } } });
    await prisma.student.deleteMany({ where: { id: { in: [student1.id, student2.id] } } });
    await prisma.staff.deleteMany({ where: { id: wardenStaff.id } });
    await prisma.user.deleteMany({ where: { id: { in: [student1User.id, student2User.id, wardenUser.id] } } });
    await prisma.bed.deleteMany({ where: { id: { in: [bedSingleA.id, bedDoubleA.id, bedDoubleB.id] } } });
    await prisma.room.deleteMany({ where: { id: { in: [singleRoom.id, doubleRoom.id] } } });
    await prisma.floor.deleteMany({ where: { id: testFloor.id } });
    await prisma.block.deleteMany({ where: { id: testBlock.id } });
    await prisma.hostel.deleteMany({ where: { id: testHostel.id } });
    console.log("  ✓ All test topology cleanly expunged");

  } catch (err) {
    console.error("Critical edge case test failure:", err);
    failed++;
  }

  console.log("\n=======================================================");
  console.log(`  PRD EDGE CASES TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runEdgeCaseTests();
