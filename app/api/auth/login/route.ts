import { NextResponse } from "next/server";
import { loginSchema } from "@/entities/user/model/schemas";
import { verifyPassword } from "@/shared/lib/auth/password";
import { setSessionCookie, signSessionToken } from "@/shared/lib/auth/session";
import { jsonError } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid request payload", 400, parsed.error.flatten());
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return jsonError("Неверный email или пароль", 401);
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return jsonError("Неверный email или пароль", 401);
  }

  const token = await signSessionToken({
    userId: user.id,
    role: user.role,
    email: user.email,
    username: user.username,
  });

  await setSessionCookie(token);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    },
  });
}
