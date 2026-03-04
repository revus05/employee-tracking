import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/shared/lib/auth/session";
import { jsonError } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
    },
  });

  if (!user) {
    return jsonError("User not found", 404);
  }

  return NextResponse.json({ user });
}
