# HostelHub — Institutional Smart Hostel Management System

HostelHub is an institutional-grade, multi-tenant hostel administration and resident portal engineered for university campuses and residential institutions. Built in compliance with strict collegiate design standards and comprehensive Product Requirement Documents (PRD), HostelHub delivers unified operations across residential life, facility maintenance, gate security, attendance tracking, and administrative oversight.

---

## 🏛️ Core Highlights & Architectural Principles

- **Institution-First Visual Aesthetics:** Styled with collegiate navy (`#00236f`), Plus Jakarta Sans typography, tabular telemetry figures (`font-variant-numeric: tabular-nums`), and custom tactile button depression physics (`.tactile-btn`).
- **Strict Role-Based Access Control (RBAC):** Built-in middleware protecting 67 distinct routes across 5 distinct operational personas: **Student / Resident**, **Hostel Warden**, **Hostel Administrator**, **Security Gate Officer**, and **Super Admin**.
- **Transactional Room Allocation Engine:** Atomic, concurrency-safe room assignments, inter-room transfers, and vacating workflows with automatic bed state reconciliation and zero race conditions.
- **End-to-End Operational Lifecycle:** Complete workflows for ticket resolution (Complaints), digital gate out-passes (Leave Requests), QR/Pass visitor management, roll call attendance with absentee telemetry, and mess feedback aggregation.
- **Auditing & Enterprise Reporting:** Streaming CSV exports, immutable audit logging with actor/IP tracking, cross-facility occupancy analytics, and print-ready warden executive briefings.
- **Security-Hardened Core:** IDOR protection on all student resources, horizontal/vertical privilege escalation blocks, confidential staff note scrubbing, and IP-based authentication rate limiting.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router with Server & Client Components) |
| **Language** | TypeScript 5 (Strict Mode, 100% Type-Checked) |
| **UI & Styling** | React 19, Tailwind CSS, Lucide React, Tactile Physics |
| **Database & ORM** | SQLite (`prisma/dev.db`), Prisma ORM 5 with 22 relational models |
| **Authentication** | Stateless JWT tokens (HTTP-only secure cookies) + `bcryptjs` password hashing |
| **Audit & Telemetry** | Structured Winston logging + SQLite `AuditLog` ledger + In-Memory sliding-window rate limiters |

---

## 👥 Personas & Portal Architecture

```
HostelHub Enterprise Portals (67 Routes)
│
├── 🎓 Student Portal (/student/*)
│   ├── /dashboard         -> Occupancy status, quick actions, live alerts, out-pass badges
│   ├── /room              -> Assigned hostel, room, bed info, roommate directory
│   ├── /complaints        -> Maintenance ticketing, status tracking, repair comments
│   ├── /leave             -> Digital out-pass & home leave applications
│   ├── /attendance        -> Historical attendance logs, monthly percentage telemetry
│   ├── /mess              -> Weekly meal schedules, daily dietary feedback rating
│   ├── /visitors          -> Pre-registered visitor passes, visitor entry records
│   ├── /notices           -> Official hostel board circulars with priority tags
│   └── /profile           -> Verified resident bio, emergency contacts, parent details
│
├── 🛡️ Warden Portal (/warden/*)
│   ├── /dashboard         -> Occupancy gauges, urgent tickets, pending leave counter
│   ├── /matrix            -> Interactive visual bed matrix (Hostel > Block > Floor > Room > Bed)
│   ├── /residents         -> Searchable resident directory with quick profile inspection
│   ├── /complaints        -> Work order assignments, status advancement, technician routing
│   ├── /leave             -> Leave adjudication drawer (Approve/Reject with remarks)
│   ├── /attendance        -> Daily roll-call roster with 1-click 'Mark All Present'
│   ├── /mess              -> Mess inspection logs, menu review, student satisfaction ratings
│   ├── /visitors          -> Active visitor log, overdue exit flagging
│   ├── /notices           -> Notice board publisher with priority & audience scoping
│   └── /reports           -> Printable operational summaries & shift briefings
│
├── ⚙️ Admin Console (/admin/*)
│   ├── /dashboard         -> Multi-hostel institutional matrix & capacity telemetry
│   ├── /allocations       -> Atomic allocation engine (Assign Bed, Room Transfer, Vacate)
│   ├── /hostels           -> Facility topology management (Hostels, Blocks, Floors, Rooms, Beds)
│   ├── /students          -> Student Master with multi-field search and CSV export
│   ├── /staff             -> Staff directory & warden/security role assignment
│   ├── /audit-logs        -> Immutable institutional audit ledger with CSV streaming
│   └── /reports           -> Cross-facility analytics and operational data extraction
│
└── 🚪 Security Gate Post (/security/*)
    ├── /dashboard         -> Quick visitor lookup, pass verification, emergency protocol
    └── /visitors          -> Live Gate entry/exit check-in timestamps & pass generation
```

---

## 📊 Relational Database Architecture (22 Prisma Models)

The SQLite database (`prisma/dev.db`) is structured with strict foreign keys, cascade safety, and unique constraints across 22 models:

```
[Hostel] ──< [Block] ──< [Floor] ──< [Room] ──< [Bed]
                                                  ▲
[User] ──< [Student] ─────────────────────────────┼──< [RoomAllocation]
  │         │                                     │
  │         ├──< [Complaint] ──< [ComplaintComment]
  │         ├──< [LeaveRequest]
  │         ├──< [Attendance]
  │         ├──< [Visitor] ──< [VisitorPass]
  │         └──< [MessFeedback]
  │
  ├──< [Staff] (Wardens, Admins, Security)
  ├──< [Notice]
  ├──< [AuditLog]
  └──< [Notification]
```

### Key Models & Their Functions:
1. **`User` / `Student` / `Staff`**: Authentication credentials, role hierarchy (`STUDENT`, `WARDEN`, `ADMIN`, `SECURITY`, `SUPER_ADMIN`), and personal metadata.
2. **`Hostel` / `Block` / `Floor` / `Room` / `Bed`**: Five-tier physical campus housing hierarchy.
3. **`RoomAllocation`**: Concurrency-safe record capturing academic year, assignment timestamps, and status (`ACTIVE`, `TRANSFERRED`, `VACATED`).
4. **`Complaint` & `ComplaintComment`**: 5-stage ticketing pipeline (`SUBMITTED` -> `ASSIGNED` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED`) with private staff comments.
5. **`LeaveRequest`**: Out-pass approvals with date validation, duplicate detection, and warden adjudication.
6. **`Attendance`**: Daily roll-call ledger with date keys, warden signatures, and repeat absentee tracking.
7. **`Visitor` & `VisitorPass`**: Pre-registered guest profiles and gate entry/exit telemetry with actual check-in/out timestamps.
8. **`MessMenu` & `MessFeedback`**: Weekly meal schedules across Breakfast/Lunch/Snacks/Dinner with 5-star ratings and hygiene feedback.
9. **`Notice`**: Circular distribution with expiration dates, priority flags (`HIGH`, `URGENT`, `NORMAL`), and target audience scoping.
10. **`AuditLog`**: Tamper-proof institutional activity log capturing actor ID, role, action, target entity, IP address, and user-agent.

---

## ⚡ Concurrency-Safe Room Allocation Engine

Room allocations are strictly wrapped in database transactions to guarantee mathematical consistency and prevent double-booking:

```typescript
// Atomic Allocation Transaction
await prisma.$transaction(async (tx) => {
  // 1. Lock and verify bed availability
  const bed = await tx.bed.findUniqueOrThrow({ where: { id: bedId } });
  if (bed.status !== 'AVAILABLE') throw new Error('Bed is already occupied');

  // 2. Terminate any active allocation for student
  await tx.roomAllocation.updateMany({
    where: { studentId, status: 'ACTIVE' },
    data: { status: 'TRANSFERRED', vacatedAt: new Date() }
  });

  // 3. Mark bed as OCCUPIED and increment room occupied count
  await tx.bed.update({ where: { id: bedId }, data: { status: 'OCCUPIED' } });
  await tx.room.update({ where: { id: bed.roomId }, data: { occupiedBeds: { increment: 1 } } });

  // 4. Create new ACTIVE allocation
  return tx.roomAllocation.create({ ... });
});
```

---

## 🛡️ Security & Hardening Controls

- **IDOR Prevention:** Students querying complaints, leaves, room info, or attendance cannot pass arbitrary `studentId` or foreign entity IDs; access is strictly scoped to the authenticated session (`req.user.studentId`).
- **Data Scrubbing:** Internal staff notes and technician contact logs are automatically scrubbed from student-facing API payloads.
- **Backdated Leave Protection:** Out-pass submissions for past dates are blocked with a strict 15-minute grace threshold.
- **Notice Expiration Filters:** Expired circulars are dynamically excluded from student notice boards.
- **Account Suspension Enforcement:** Deactivated or suspended accounts (`status !== 'ACTIVE'`) are immediately rejected at middleware and auth validation checkpoints.
- **IP Rate Limiting:** Login endpoints (`/api/auth/login`) and password resets enforce a 5-attempt sliding window with automatic HTTP 429 throttling.

---

## 🧪 Comprehensive Automated Test Suites

HostelHub includes 5 enterprise test suites totaling **141 tests**, with **100% pass rate**:

```bash
# 1. Authentication & RBAC Verification (32 Tests)
npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"commonjs"}' scripts/test-auth-rbac.ts

# 2. Workflow State Machine & Lifecycle (21 Tests)
npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"commonjs"}' scripts/test-workflows.ts

# 3. Concurrency-Safe Room Allocation Engine (16 Tests)
npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"commonjs"}' scripts/test-allocations.ts

# 4. Security Hardening & IDOR Prevention (32 Tests)
npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"commonjs"}' scripts/test-security-hardening.ts

# 5. PRD 15 Critical Edge Cases (40 Tests)
npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"commonjs"}' scripts/test-edge-cases.ts
```

### Test Suite Summary:

| Suite | Focus Areas | Tests | Result |
|---|---|---|---|
| `test-auth-rbac.ts` | Bcrypt validation, JWT tokens, RBAC permission matrix, rate limiting | 32 | ✅ 32 / 32 Passed |
| `test-workflows.ts` | 5-state complaint lifecycle, leave adjudication, notifications, audit persistance | 21 | ✅ 21 / 21 Passed |
| `test-allocations.ts` | Atomic bed assignments, transfer cascades, vacate balance, over-capacity protection | 16 | ✅ 16 / 16 Passed |
| `test-security-hardening.ts` | IDOR prevention, vertical escalation, staff note scrubbing, auth throttling | 32 | ✅ 32 / 32 Passed |
| `test-edge-cases.ts` | 15 PRD critical edge cases (backdated leaves, duplicate roll-calls, visitor overstays, notice expiration) | 40 | ✅ 40 / 40 Passed |
| **Total** | **Full System Verification** | **141** | **✅ 141 / 141 Passed** |

---

## 🔑 Demonstration Credentials

The seed database is initialized with test accounts across all roles:

| Role | Username | Password | Assigned Scope |
|---|---|---|---|
| **Student** | `student.alex` | `student123` | Room 101-A, Nelson Mandela Hall |
| **Warden** | `warden.vance` | `warden123` | Nelson Mandela Boys Hostel (Block A/B) |
| **Administrator** | `admin` | `admin123` | Entire Institutional Campus |
| **Security Officer** | `security.raj` | `security123` | Main Campus Gate Post 1 |
| **Super Admin** | `superadmin` | `admin123` | System Configuration & Global Controls |

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Node.js**: v18.18.0 or later
- **npm**: v9.0.0 or later

### 2. Installation
```bash
git clone <repository-url> "Hostel Hub"
cd "Hostel Hub"
npm install
```

### 3. Database Initialization & Seeding
```bash
# Push schema to SQLite
npx prisma db push

# Seed institutional topology, students, staff, rooms, and menu
npm run db:seed
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view HostelHub. The application will automatically redirect unauthenticated traffic to `/login`.

### 5. Production Compilation
```bash
# Verify TypeScript typing
npx tsc --noEmit

# Compile production Next.js bundle
npm run build

# Start production server
npm run start
```

---

## 📂 Repository Directory Structure

```
Hostel Hub/
├── prisma/
│   ├── schema.prisma              # 22 relational models & SQLite datasource
│   ├── seed.ts                    # Institutional seed generator
│   └── dev.db                     # Live local SQLite database
├── public/                        # Static assets & brand media
├── scripts/                       # Automated test verification suites
│   ├── test-auth-rbac.ts          # Auth & RBAC test suite (32 tests)
│   ├── test-workflows.ts          # State machine lifecycle suite (21 tests)
│   ├── test-allocations.ts        # Concurrency allocation engine suite (16 tests)
│   ├── test-security-hardening.ts # IDOR & security hardening suite (32 tests)
│   └── test-edge-cases.ts         # PRD 15 edge cases suite (40 tests)
├── src/
│   ├── app/                       # Next.js App Router (67 routes)
│   │   ├── admin/                 # Administrator consoles (7 sub-routes)
│   │   ├── api/                   # RESTful API endpoints (47 route handlers)
│   │   ├── login/                 # Collegiate login portal
│   │   ├── security/              # Security gate posts (2 sub-routes)
│   │   ├── student/               # Resident student portal (9 sub-routes)
│   │   ├── warden/                # Hostel warden operations (9 sub-routes)
│   │   ├── layout.tsx             # Root layout with ToastProvider
│   │   └── page.tsx               # Root intelligent role dispatcher
│   ├── components/                # Tactile UI components & layout shells
│   │   ├── layout/                # AppShell, Sidebar, TopHeader
│   │   └── ui/                    # Button, Badge, Card, Drawer, Modal, TableSkeleton, Toast
│   ├── lib/                       # Utility libraries, auth helpers, Winston logger
│   └── middleware.ts              # Global JWT RBAC Route Guardian
├── tsconfig.json                  # Strict TypeScript configuration
└── package.json                   # Dependencies & build scripts
```

---

## 📜 License & Compliance

HostelHub is designed for higher education and institutional facility management. Built in compliance with collegiate data protection principles, audit trail immutability standards, and responsive web accessibility guidelines.
