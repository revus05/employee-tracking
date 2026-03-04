import type { Role } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";

export async function getProjectAccess(projectId: string, userId: string) {
  return prisma.project.findFirst({
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
}

export function canManageProject(
  userRole: Role,
  ownerId: string,
  userId: string,
) {
  return userRole === "MANAGER" && ownerId === userId;
}
