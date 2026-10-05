import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";
import { logger } from "@/lib/logger";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "hostelhub-super-secure-production-jwt-secret-key-32-chars-min"
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = forgotPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid input", parseResult.error.flatten());
    }

    const { usernameOrEmail } = parseResult.data;
    const term = usernameOrEmail.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: term }, { email: term }],
      },
    });

    // To prevent user enumeration, always return success message even if user doesn't exist
    if (!user) {
      logger.info(`[FORGOT_PASSWORD] Reset requested for non-existent user: ${term}`);
      return successResponse({
        message: "If an account matching that username or email exists, a password reset link has been dispatched.",
      });
    }

    // Generate short-lived reset token (15 minutes)
    const resetToken = await new SignJWT({
      userId: user.id,
      purpose: "PASSWORD_RESET",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(JWT_SECRET);

    await AuditService.record({
      actorId: user.id,
      actorRole: user.role,
      actorName: user.username,
      action: "PASSWORD_RESET_REQUESTED",
      targetType: "User",
      targetId: user.id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse({
      message: "If an account matching that username or email exists, a password reset link has been dispatched.",
      // In development mode, provide token for test automation
      devResetToken: process.env.NODE_ENV !== "production" ? resetToken : undefined,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
