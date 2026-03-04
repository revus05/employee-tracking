import { NextResponse } from "next/server";
import { registerSchema } from "@/entities/user/model/schemas";
import { hashPassword } from "@/shared/lib/auth/password";
import { setSessionCookie, signSessionToken } from "@/shared/lib/auth/session";
import { jsonError } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid request payload", 400, parsed.error.flatten());
  }

  const { email, username, password, role } = parsed.data;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    select: {
      id: true,
      email: true,
      username: true,
    },
  });

  if (existingUser) {
    return jsonError("Email или username уже заняты", 409);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      role,
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
    },
  });

  const token = await signSessionToken({
    userId: user.id,
    role: user.role,
    email: user.email,
    username: user.username,
  });

  await setSessionCookie(token);

  return NextResponse.json({ user }, { status: 201 });
}
