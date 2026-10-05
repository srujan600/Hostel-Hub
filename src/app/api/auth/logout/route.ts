import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth";
import { AuditService } from "@/services/audit-service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (session) {
      await AuditService.record({
        actorId: session.id,
        actorRole: session.role,
        actorName: session.name,
        action: "USER_LOGOUT",
        targetType: "User",
        targetId: session.id,
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
      });
    }

    const response = successResponse({ message: "Successfully logged out" });

    // Clear session cookies
    response.cookies.set("hostelhub_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    response.cookies.set("hostelhub_role", "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
