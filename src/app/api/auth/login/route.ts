import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User, Student, Staff } from "@/models";
import { verifyPassword, signToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { errorResponse, successResponse } from "@/lib/api-response";
import { BadRequestError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { Role, UserSession } from "@/types";
import { AuditService } from "@/services/audit-service";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const body = await req.json();

    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid login request", parseResult.error.flatten());
    }

    const { username, password } = parseResult.data;

    // Rate limiting key
    const rateLimitKey = `login:${ip}:${username.toLowerCase()}`;
    const rateCheck = checkRateLimit(rateLimitKey, { limit: 5, windowMs: 15 * 60 * 1000 });
    if (!rateCheck.allowed) {
      throw new ForbiddenError(
        `Too many failed login attempts. Account temporarily throttled. Please try again in ${rateCheck.resetInSec} seconds.`
      );
    }

    await connectToDatabase();

    // Lookup user in database
    const user = await User.findOne({ username: username.toLowerCase().trim() });

    if (!user) {
      throw new UnauthorizedError("Invalid username or password");
    }

    // Verify Password
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedError("Invalid username or password");
    }

    // Check account status
    if (user.status !== "ACTIVE") {
      throw new ForbiddenError(
        `Your account status is '${user.status}'. Please contact hostel administration for assistance.`
      );
    }

    // Successful login: reset rate limiter
    resetRateLimit(rateLimitKey);

    // Resolve name & profile identifiers
    let displayName = user.username;
    let studentId: string | undefined;
    let staffId: string | undefined;
    let hostelId: string | undefined;

    if (user.role === "STUDENT") {
      const studentProfile = await Student.findOne({ userId: user._id });
      if (studentProfile) {
        displayName = studentProfile.name;
        studentId = studentProfile.studentId;
      }
    } else {
      const staffProfile = await Staff.findOne({ userId: user._id });
      if (staffProfile) {
        displayName = staffProfile.name;
        staffId = staffProfile.employeeId;
        hostelId = staffProfile.assignedHostelId || undefined;
      }
    }

    const sessionPayload: UserSession = {
      id: user._id,
      username: user.username,
      name: displayName,
      email: user.email,
      role: user.role as Role,
      status: user.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
      studentId,
      staffId,
      hostelId,
    };

    // Sign JWT token
    const token = await signToken(sessionPayload);

    // Resolve destination URL
    let redirectUrl = "/student/dashboard";
    switch (user.role) {
      case "STUDENT":
        redirectUrl = "/student/dashboard";
        break;
      case "WARDEN":
        redirectUrl = "/warden/dashboard";
        break;
      case "ADMIN":
      case "SUPER_ADMIN":
        redirectUrl = "/admin/dashboard";
        break;
      case "SECURITY":
        redirectUrl = "/security/dashboard";
        break;
    }

    // Audit log
    await AuditService.record({
      actorId: user._id,
      actorRole: user.role,
      actorName: displayName,
      action: "USER_LOGIN",
      targetType: "User",
      targetId: user._id,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    const response = successResponse({
      token,
      user: sessionPayload,
      redirectUrl,
    });

    // Set secure HTTP-only cookie
    response.cookies.set("hostelhub_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    // Also set non-httpOnly role hint for client-side routing sync
    response.cookies.set("hostelhub_role", user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
