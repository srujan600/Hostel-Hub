import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { hashPassword } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BadRequestError, UnauthorizedError, NotFoundError } from "@/lib/errors";
import { AuditService } from "@/services/audit-service";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "hostelhub-super-secure-production-jwt-secret-key-32-chars-min"
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = resetPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid reset password input", parseResult.error.flatten());
    }

    const { token, newPassword } = parseResult.data;

    let payload: any;
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      payload = verified.payload;
    } catch (err) {
      throw new UnauthorizedError("Password reset token is invalid or has expired");
    }

    if (payload.purpose !== "PASSWORD_RESET" || !payload.userId) {
      throw new UnauthorizedError("Invalid token purpose");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new NotFoundError("User account not found");
    }

    const newHashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHashedPassword },
    });

    await AuditService.record({
      actorId: user.id,
      actorRole: user.role,
      actorName: user.username,
      action: "PASSWORD_RESET_COMPLETED",
      targetType: "User",
      targetId: user.id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return successResponse({
      message: "Password has been successfully updated. You may now log in with your new credentials.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
