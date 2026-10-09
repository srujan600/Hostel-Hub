import dotenv from "dotenv";
dotenv.config();

import { connectToDatabase, disconnectDatabase } from "../src/lib/mongodb";
import {
  User,
  RoleEntity,
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
  Visitor,
  VisitorPass,
  Attendance,
  Notice,
  Notification,
  MessMenu,
  Feedback,
  AuditLog,
  SystemSetting,
} from "../src/models";

async function main() {
  console.log("Connecting to MongoDB...");
  await connectToDatabase();
  console.log("Connected successfully!");

  const models = [
    User,
    RoleEntity,
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
    Visitor,
    VisitorPass,
    Attendance,
    Notice,
    Notification,
    MessMenu,
    Feedback,
    AuditLog,
    SystemSetting,
  ];

  console.log(`Verifying all ${models.length} models...`);
  for (const model of models) {
    if (!model.modelName) {
      throw new Error(`Model missing modelName: ${model}`);
    }
    console.log(`  ✅ Registered: ${model.modelName} (Collection: ${model.collection.name})`);
  }

  // Test virtual ID serialization
  const testUser = new User({
    username: "test_verification_user",
    email: "test_verification@hostelhub.local",
    passwordHash: "hashed_dummy_val",
    role: "STUDENT",
  });

  const json = testUser.toJSON();
  if (!json.id || json._id) {
    throw new Error(`JSON serialization failed: id is not set or _id is present: ${JSON.stringify(json)}`);
  }
  console.log(`  ✅ Virtual 'id' transformation verified: ${json.id}`);

  await disconnectDatabase();
  console.log("All 22 models verified successfully against MongoDB!");
}

main().catch((err) => {
  console.error("Model verification failed:", err);
  process.exit(1);
});
