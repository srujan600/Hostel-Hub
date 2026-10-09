# HostelHub — Institutional Smart Hostel Management System

HostelHub is an institutional-grade, multi-tenant hostel administration and resident portal engineered for university campuses and residential institutions. Built in compliance with strict collegiate design standards and comprehensive Product Requirement Documents (PRD), HostelHub delivers unified operations across residential life, facility maintenance, gate security, attendance tracking, and administrative oversight.

---

## 🏛️ Core Highlights & Architectural Principles

- **Institution-First Visual Aesthetics:** Styled with collegiate navy (`#00236f`), Plus Jakarta Sans typography, tabular telemetry figures (`font-variant-numeric: tabular-nums`), and custom tactile button depression physics (`.tactile-btn`).
- **Strict Role-Based Access Control (RBAC):** Built-in middleware protecting 67 distinct routes across 5 operational personas: **Student / Resident**, **Hostel Warden**, **Hostel Administrator**, **Security Gate Officer**, and **Super Admin**.
- **Transactional & Atomic Allocation Engine:** Concurrency-safe room assignments, inter-room transfers, and vacating workflows with atomic MongoDB state transitions and zero race conditions.
- **End-to-End Operational Lifecycle:** Complete workflows for ticket resolution (Complaints), digital gate out-passes (Leave Requests), visitor pass management, roll call attendance with absentee telemetry, and mess feedback aggregation.
- **Auditing & Enterprise Reporting:** Streaming CSV exports, immutable audit logging with actor/IP tracking, cross-facility occupancy analytics, and print-ready warden executive briefings.
- **Security-Hardened Core:** IDOR protection on all student resources, horizontal/vertical privilege escalation blocks, confidential staff note scrubbing, NoSQL regex sanitization, and IP-based authentication rate limiting.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router with Server & Client Components) |
| **Language** | TypeScript 5 (Strict Mode, 100% Type-Checked) |
| **UI & Styling** | React 19, Tailwind CSS, Lucide React, Tactile Physics |
| **Database & ODM** | **MongoDB**, **Mongoose 9** (`^9.11.1`) with 22 structured collections |
| **Authentication** | Stateless JWT tokens (HTTP-only secure cookies) + `bcryptjs` password hashing |
| **Audit & Telemetry** | Structured Winston logging + MongoDB `AuditLog` collection + In-Memory sliding-window rate limiters |

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

## 📊 Database Architecture (22 Mongoose Models)

HostelHub uses MongoDB via Mongoose 9 with primary String keys matching CUID identifiers, strict compound indexes, and automatic virtual `id` serialization:

```
[Hostel] ──< [Block] ──< [Floor] ──< [Room] ──< [Bed]
                                                   ▲
[User] ──< [Student] ─────────────────────────────┼──< [RoomAllocation]
  │         │                                     │
  │         ├──< [Complaint] ──< [ComplaintComment]
  │         ├──< [LeaveRequest]
  │         ├──< [Attendance]
  │         ├──< [Visitor] ──< [VisitorPass]
  │         └──< [Feedback]
  │
  ├──< [Staff] (Wardens, Admins, Security)
  ├──< [Notice]
  ├──< [AuditLog]
  └──< [Notification]
```

### Key Models & Their Functions:
1. **`User` / `Student` / `Staff`**: Authentication credentials, role hierarchy (`STUDENT`, `WARDEN`, `ADMIN`, `SECURITY`, `SUPER_ADMIN`), and personal metadata.
2. **`Hostel` / `Block` / `Floor` / `Room` / `Bed`**: Five-tier physical campus housing topology.
3. **`RoomAllocation`**: Concurrency-safe record capturing academic year, assignment timestamps, and status (`ACTIVE`, `TRANSFERRED`, `VACATED`).
4. **`Complaint` & `ComplaintComment`**: 5-stage ticketing pipeline (`SUBMITTED` -> `ASSIGNED` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED`) with private staff comments.
5. **`LeaveRequest`**: Out-pass approvals with date validation, duplicate detection, and warden adjudication.
6. **`Attendance`**: Daily roll-call ledger with compound unique index `[studentId, date]` preventing duplicate marks.
7. **`Visitor` & `VisitorPass`**: Pre-registered guest profiles and gate entry/exit telemetry with actual check-in/out timestamps.
8. **`MessMenu` & `Feedback`**: Weekly meal schedules across Breakfast/Lunch/Snacks/Dinner with student ratings and feedback.
9. **`Notice`**: Circular distribution with expiration dates, priority flags (`HIGH`, `URGENT`, `NORMAL`), and target audience scoping.
10. **`AuditLog`**: Tamper-proof institutional activity log capturing actor ID, role, action, target entity, IP address, and user-agent.

For complete migration details, consult [MONGODB_MIGRATION.md](file:///c:/Users/thati/Documents/Hostel%20Hub/MONGODB_MIGRATION.md).

---

## ⚡ Concurrency-Safe Atomic Bed Allocation Engine

Room allocations use atomic conditional mutations (`findOneAndUpdate`) with `returnDocument: 'after'` to guarantee mathematical consistency and prevent double-booking:

```typescript
// Atomic Bed Reservation (Race-condition free)
const claimedBed = await Bed.findOneAndUpdate(
  { _id: bedId, status: "AVAILABLE" },
  { $set: { status: "OCCUPIED" } },
  { returnDocument: "after" }
);

if (!claimedBed) {
  throw new ConflictError("Bed was just allocated by another user.");
}

// Increment room occupied counter
await Room.updateOne({ _id: room._id }, { $inc: { occupiedBeds: 1 } });

// Record active allocation
const allocation = await RoomAllocation.create({
  studentId,
  bedId,
  academicYear,
  allocatedAt: new Date(),
  status: "ACTIVE",
  remarks,
});
```

---

## 🛡️ Security & Hardening Controls

- **IDOR Prevention:** Students querying complaints, leaves, room info, or attendance cannot pass arbitrary `studentId` or foreign entity IDs; access is strictly scoped to the authenticated session (`session.id` / `session.studentId`).
- **NoSQL Regex Sanitization:** All search and filter parameters pass through `escapeRegex()` to neutralize regex syntax injection and ReDoS vulnerabilities.
- **Data Scrubbing:** Internal staff notes and technician contact logs are automatically scrubbed from student-facing API payloads.
- **Account Suspension Enforcement:** Deactivated or suspended accounts (`status !== 'ACTIVE'`) are immediately rejected at middleware and auth validation checkpoints.
- **IP Rate Limiting:** Login endpoints (`/api/auth/login`) and password resets enforce a 5-attempt sliding window with automatic HTTP 429 throttling.

---

## 🧪 Comprehensive Automated Test Suites

HostelHub includes comprehensive automated test suites covering models, security, validation, and high-concurrency:

```bash
# 1. Verify all 22 Mongoose models, collections, and virtual IDs
npm run db:test-models

# 2. Verify Bcrypt, JWT tamper defense, NoSQL sanitization, and unique constraints
npm run db:test-security

# 3. Verify End-to-End workflows, auth, aggregations, and high concurrency (33 tests)
npm run test:validation

# 4. Run all verification suites in sequence
npm run db:test-all
```

---

## 🔑 Demonstration Credentials

The database is initialized with test accounts across all institutional roles:

| Role | Username | Password | Assigned Scope |
|---|---|---|---|
| **Student** | `student.alex` | `student123` | Room 101-A, Nelson Mandela Hall |
| **Warden** | `warden.vance` | `warden123` | Nelson Mandela Boys Hostel (Block A/B) |
| **Administrator** | `admin` | `admin123` | Entire Institutional Campus |
| **Security Officer** | `security.raj` | `security123` | Main Campus Gate Post 1 |

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Node.js**: v18.18.0 or later
- **npm**: v9.0.0 or later
- **MongoDB**: Local standalone instance (`mongodb://127.0.0.1:27017`) or MongoDB Atlas URI

### 2. Installation
```bash
git clone <repository-url> "Hostel Hub"
cd "Hostel Hub"
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and verify your connection string:
```bash
cp .env.example .env
```
Ensure `MONGODB_URI` points to your MongoDB instance:
```env
MONGODB_URI="mongodb://127.0.0.1:27017/hostelhub"
```

### 4. Database Migration & Seeding
To populate MongoDB from the existing seed data:
```bash
npm run db:migrate-mongo
```

### 5. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access HostelHub. The application will automatically redirect unauthenticated traffic to `/login`.

### 6. Production Compilation
```bash
# Verify TypeScript typing (Strict mode)
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
├── scripts/
│   ├── migrate-sqlite-to-mongo.ts # Idempotent SQLite to MongoDB ETL pipeline
│   ├── test-models.ts             # 22 Mongoose models & virtual ID verification
│   ├── test-security-constraints.ts # Bcrypt, JWT, unique indexes, atomic tests
│   └── test-phase8-validation.ts  # End-to-end workflows, auth, concurrency suite
├── src/
│   ├── app/                       # Next.js App Router (67 routes)
│   │   ├── admin/                 # Administrator consoles (7 sub-routes)
│   │   ├── api/                   # RESTful API endpoints (46 route handlers)
│   │   ├── login/                 # Collegiate login portal
│   │   ├── security/              # Security gate posts (2 sub-routes)
│   │   ├── student/               # Resident student portal (9 sub-routes)
│   │   ├── warden/                # Hostel warden operations (9 sub-routes)
│   │   ├── layout.tsx             # Root layout with ToastProvider
│   │   └── page.tsx               # Root intelligent role dispatcher
│   ├── components/                # UI components & layout shells
│   ├── lib/
│   │   ├── mongodb.ts             # Cached Mongoose connection singleton & pool
│   │   ├── auth.ts                # Bcrypt, JOSE JWT signing, and session helpers
│   │   └── api-response.ts        # Uniform JSON response serializers
│   ├── models/                    # 22 Mongoose Schemas and Models
│   │   ├── _utils.ts              # CUID generator, baseSchemaOptions, sanitizeDoc
│   │   └── index.ts               # Barrel export for all models
│   ├── services/                  # Audit and Notification engines
│   └── middleware.ts              # Global JWT RBAC Route Guardian
├── MONGODB_MIGRATION.md           # Migration report & operational maintenance runbook
├── tsconfig.json                  # Strict TypeScript configuration
└── package.json                   # Dependencies & npm scripts
```

---

## 📜 License & Compliance

HostelHub is designed for higher education and institutional facility management. Built in compliance with collegiate data protection principles, audit trail immutability standards, and responsive web accessibility guidelines.
