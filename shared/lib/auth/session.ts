import type { Role } from "@prisma/client";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "taskboard_session";

export type SessionPayload = {
  userId: string;
  role: Role;
  email: string;
  username: string;
};

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN_SECONDS = process.env.JWT_EXPIRES_IN_SECONDS as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing");
}
if (!JWT_EXPIRES_IN_SECONDS) {
  throw new Error("JWT_EXPIRES_IN_SECONDS is missing");
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRES_IN_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);

    if (
      typeof payload.userId !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.username !== "string"
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      role: payload.role as Role,
      email: payload.email,
      username: payload.username,
    };
  } catch {
    return null;
  }
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: +JWT_EXPIRES_IN_SECONDS || 0,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}
