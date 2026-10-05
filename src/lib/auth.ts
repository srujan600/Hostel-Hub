import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { UserSession } from "@/types";
import { UnauthorizedError } from "./errors";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "hostelhub-super-secure-production-jwt-secret-key-32-chars-min"
);

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

export async function signToken(payload: UserSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<UserSession> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserSession;
  } catch (err) {
    throw new UnauthorizedError("Session expired or invalid authentication token");
  }
}

export async function getSessionFromRequest(req: NextRequest): Promise<UserSession | null> {
  // 1. Try Bearer token in Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return verifyToken(token);
  }

  // 2. Try cookie
  const cookie = req.cookies.get("hostelhub_token");
  if (cookie?.value) {
    return verifyToken(cookie.value);
  }

  return null;
}

export async function requireAuth(req: NextRequest): Promise<UserSession> {
  const session = await getSessionFromRequest(req);
  if (!session) {
    throw new UnauthorizedError("Authentication is required to access this resource");
  }
  if (session.status !== "ACTIVE") {
    throw new UnauthorizedError(`Account is ${session.status.toLowerCase()}. Please contact administration.`);
  }
  return session;
}
