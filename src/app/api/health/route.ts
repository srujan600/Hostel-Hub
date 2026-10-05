import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  return successResponse({
    status: "healthy",
    service: "HostelHub Core Operations API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
