import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";
import { connectToDatabase, isDatabaseConnected } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  let dbStatus = "disconnected";
  try {
    await connectToDatabase();
    dbStatus = isDatabaseConnected() ? "connected" : "connecting";
  } catch (err: any) {
    dbStatus = `error: ${err.message}`;
  }

  return successResponse({
    status: dbStatus === "connected" ? "healthy" : "degraded",
    database: {
      engine: "MongoDB",
      status: dbStatus,
    },
    service: "HostelHub Core Operations API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
