import type { Role } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/shared/lib/auth/session";
import { jsonError } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";

export async function requireApiSession(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return { error: jsonError("Unauthorized", 401) };
  }

  return { session };
}

export function requireRole(role: Role, currentRole: Role) {
  if (role !== currentRole) {
    return jsonError("Forbidden", 403);
  }

  return null;
}

export async function requireProjectMembership(
  projectId: string,
  userId: string,
) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      ownerId: true,
    },
  });

  if (!project) {
    return null;
  }

  return project;
}
