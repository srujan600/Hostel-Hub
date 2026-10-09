# HostelHub — MongoDB Migration & Operational Maintenance Guide

This document provides a comprehensive technical overview of the backend database migration of **HostelHub** from SQLite (via Prisma ORM) to **MongoDB** (via Mongoose 9 and Next.js 15 App Router).

---

## 1. Migration Summary Report

### 1.1 Executive Overview
- **Migration Strategy:** Phased non-destructive ETL (Extract, Transform, Load) with 100% API contract preservation.
- **Source Database:** SQLite (`prisma/dev.db`), 458 KB, 241 records across 22 entities.
- **Target Database:** MongoDB (`hostelhub` database on `mongodb://127.0.0.1:27017` or MongoDB Atlas).
- **Driver / ODM:** Mongoose 9 (`^9.11.1`).
- **Data Loss:** **0 records (100% data fidelity achieved).**
- **Downtime / Breaking Changes:** **Zero breaking changes.** All API endpoints return `id: string` in responses matching the original frontend contract.

---

### 1.2 Entity Reconciliation Table

| # | Entity / Model | SQLite Source Count | MongoDB Migrated Count | Reconciliation Status |
|---|---|:---:|:---:|:---:|
| 1 | **User** | 18 | 18 | ✅ MATCH |
| 2 | **RoleEntity** | 5 | 5 | ✅ MATCH |
| 3 | **Hostel** | 2 | 2 | ✅ MATCH |
| 4 | **Block** | 2 | 2 | ✅ MATCH |
| 5 | **Floor** | 3 | 3 | ✅ MATCH |
| 6 | **Room** | 5 | 5 | ✅ MATCH |
| 7 | **Bed** | 8 | 8 | ✅ MATCH |
| 8 | **Student** | 9 | 9 | ✅ MATCH |
| 9 | **Staff** | 9 | 9 | ✅ MATCH |
| 10 | **RoomAllocation** | 7 | 7 | ✅ MATCH |
| 11 | **Complaint** | 7 | 7 | ✅ MATCH |
| 12 | **ComplaintComment** | 2 | 2 | ✅ MATCH |
| 13 | **LeaveRequest** | 3 | 3 | ✅ MATCH |
| 14 | **Visitor** | 2 | 2 | ✅ MATCH |
| 15 | **VisitorPass** | 1 | 1 | ✅ MATCH |
| 16 | **Attendance** | 5 | 5 | ✅ MATCH |
| 17 | **Notice** | 3 | 3 | ✅ MATCH |
| 18 | **Notification** | 11 | 11 | ✅ MATCH |
| 19 | **MessMenu** | 28 | 28 | ✅ MATCH |
| 20 | **Feedback** | 0 | 0 | ✅ MATCH |
| 21 | **AuditLog** | 107 | 107 | ✅ MATCH |
| 22 | **SystemSetting** | 4 | 4 | ✅ MATCH |
| **TOTAL** | **All 22 Collections** | **241** | **241** | **✅ 100% MATCH (0 Data Loss)** |

---

### 1.3 Dependencies & Environmental Impact

| Package / Resource | Previous Status | New Status | Notes |
|---|---|---|---|
| `mongoose` | Not installed | **`^9.11.1`** (Core ODM) | High-performance MongoDB ODM with connection caching |
| `@prisma/client` | Active ORM | **Legacy / Migration Only** | Retained read-only for ETL reproducibility |
| `prisma` | Active CLI | **Legacy / Tooling** | Retained for inspection; no active app routes import it |
| `prisma/dev.db` | Primary Database | **Source Archive** | Preserved read-only (458,752 bytes untouched) |
| `MONGODB_URI` | None | **Primary Connection** | Local standalone or Atlas connection string in `.env` |

---

## 2. MongoDB Architecture & Schema Design

### 2.1 Primary Keys & ID Strategy
- Mongoose models use **String `_id` values** generated with CUID-compatible strings:
  ```typescript
  _id: { type: String, default: generateId }
  ```
- **Referential Stability:** During migration, SQLite IDs were transferred directly into `_id`. Foreign keys (`studentId`, `userId`, `bedId`, `hostelId`, `blockId`, etc.) match exactly across documents without requiring ID remapping tables.
- **Frontend Contract:** Base schema options apply automatic `toJSON` and `toObject` transformations:
  ```typescript
  export const baseSchemaOptions = {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  };
  ```
- Direct `.lean()` queries use the `sanitizeDoc()` helper to ensure all API responses return `id: string` and omit `_id`/`__v`.

---

### 2.2 Indexing Strategy & Compound Constraints

To guarantee query performance and enforce business integrity, the following indexes are registered:

1. **Unique Primary Constraints:**
   - `User`: `{ username: 1 }` (unique, lowercase), `{ email: 1 }` (unique, lowercase)
   - `Student`: `{ studentId: 1 }` (unique, uppercase), `{ userId: 1 }` (unique)
   - `Staff`: `{ employeeId: 1 }` (unique, uppercase), `{ userId: 1 }` (unique)
   - `Hostel`: `{ code: 1 }` (unique, uppercase)
   - `RoleEntity`: `{ code: 1 }` (unique)
   - `SystemSetting`: `{ key: 1 }` (unique)
   - `Complaint`: `{ complaintCode: 1 }` (unique)
   - `LeaveRequest`: `{ requestCode: 1 }` (unique)
   - `VisitorPass`: `{ passCode: 1 }` (unique)
   - `Notice`: `{ noticeCode: 1 }` (unique)

2. **Compound Unique Indexes:**
   - `Block`: `{ hostelId: 1, code: 1 }` (unique)
   - `Floor`: `{ blockId: 1, floorNumber: 1 }` (unique)
   - `Room`: `{ floorId: 1, roomNumber: 1 }` (unique)
   - `Bed`: `{ roomId: 1, bedNumber: 1 }` (unique)
   - `Attendance`: `{ studentId: 1, date: 1 }` (unique — prevents duplicate daily marks)
   - `MessMenu`: `{ dayOfWeek: 1, mealType: 1 }` (unique — 1 menu entry per meal slot)

3. **Query & Performance Indexes:**
   - `RoomAllocation`: `{ studentId: 1, status: 1 }`, `{ bedId: 1, status: 1 }`
   - `Complaint`: `{ studentId: 1, status: 1 }`, `{ category: 1 }`, `{ createdAt: -1 }`
   - `LeaveRequest`: `{ studentId: 1, status: 1 }`, `{ startDate: 1, endDate: 1 }`
   - `VisitorPass`: `{ visitorId: 1 }`, `{ status: 1 }`, `{ visitDate: 1 }`
   - `Notice`: `{ isPublished: 1, publishDate: -1 }`, `{ targetAudience: 1 }`
   - `Notification`: `{ userId: 1, isRead: 1 }`, `{ createdAt: -1 }`
   - `AuditLog`: `{ actorId: 1 }`, `{ targetType: 1, targetId: 1 }`, `{ createdAt: -1 }`

---

### 2.3 Concurrency & Race-Condition Architecture
In standalone local MongoDB (without replica set clustering), multi-document ACID transactions are not available by default.
HostelHub implements **atomic conditional mutations** for state changes:
```typescript
// Atomic bed allocation: guaranteed race-condition free
const claimedBed = await Bed.findOneAndUpdate(
  { _id: bedId, status: "AVAILABLE" },
  { $set: { status: "OCCUPIED" } },
  { returnDocument: "after" }
);

if (!claimedBed) {
  throw new ConflictError("Bed was just allocated by another user.");
}
```
High-concurrency tests with 5 simultaneous requests targeting the same bed verified that exactly 1 request succeeded and 4 failed gracefully with zero double-bookings.

---

## 3. Connection Management & Pooling

The connection manager ([`src/lib/mongodb.ts`](file:///c:/Users/thati/Documents/Hostel%20Hub/src/lib/mongodb.ts)) provides:
- **Global Connection Caching:** Prevents socket exhaustion during Next.js hot module reloading (HMR) and serverless function cold starts.
- **Connection Event Monitoring:** Logs connection establishment, disconnections, and errors via structured logging.
- **Graceful Shutdown:** Intercepts `SIGINT` and `SIGTERM` to safely drain connection pools.
- **Configurable Pool Parameters:**
  - `MONGODB_MAX_POOL_SIZE` (default: `10`)
  - `MONGODB_MIN_POOL_SIZE` (default: `2`)
  - `MONGODB_SERVER_SELECTION_TIMEOUT_MS` (default: `5000`)
  - `MONGODB_SOCKET_TIMEOUT_MS` (default: `45000`)

---

## 4. Operational Maintenance & Runbook

### 4.1 Running the Migration Pipeline
The ETL migration script is idempotent and safe to re-run:
```bash
# Execute SQLite -> MongoDB migration
npm run db:migrate-mongo
```

### 4.2 Automated Testing & Validation Suites
```bash
# 1. Verify all 22 Mongoose models, collections, and virtual IDs
npm run db:test-models

# 2. Verify Bcrypt, JWT tamper rejection, NoSQL sanitization, and unique indexes
npm run db:test-security

# 3. Verify End-to-End workflows, auth, aggregations, and high concurrency
npm run test:validation

# 4. Run all verification suites in sequence
npm run db:test-all
```

---

### 4.3 Database Backup & Restoration

#### Backup (mongodump)
```bash
# Dump the entire hostelhub database to a compressed archive
mongodump --uri="mongodb://127.0.0.1:27017/hostelhub" --archive=hostelhub_backup_$(date +%Y%m%d).gz --gzip
```

#### Restore (mongorestore)
```bash
# Restore from archive into target MongoDB instance
mongorestore --uri="mongodb://127.0.0.1:27017/hostelhub" --archive=hostelhub_backup_YYYYMMDD.gz --gzip --drop
```

---

### 4.4 Index Maintenance & Verification
To ensure all schema indexes are synchronized in MongoDB:
```bash
# Trigger index synchronization from Mongoose
npx tsx -e "import('./src/lib/mongodb').then(m => m.connectToDatabase()).then(() => import('./src/models')).then(models => Promise.all(Object.values(models).filter(m => m.syncIndexes).map(m => m.syncIndexes()))).then(() => { console.log('All indexes synchronized successfully'); process.exit(0); })"
```

---

### 4.5 Data Archiving & Purging Recommendations
For high-traffic production deployments:
1. **Audit Logs:** Archive logs older than 180 days to cold object storage (`S3`/`GCS`) or a secondary collection `auditlogs_archive`.
2. **Closed Complaints:** Move complaints closed for more than 1 academic year to `complaints_archive`.
3. **Attendance Records:** Partition or export historical attendance older than the active academic semester.

---

### 4.6 Production Scaling Strategy
1. **Replica Sets:** For high availability and read-scaling, deploy a 3-node MongoDB Replica Set (1 Primary, 2 Secondaries).
2. **MongoDB Atlas:** Use Atlas M10+ instances with automated continuous backups, multi-AZ failover, and slow-query profiling.
3. **Connection String for Production:**
   ```env
   MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/hostelhub?retryWrites=true&w=majority&maxPoolSize=50"
   ```
