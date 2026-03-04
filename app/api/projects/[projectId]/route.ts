import type { NextRequest } from "next/server";
import { requireApiSession } from "@/shared/lib/auth/guards";
import { mapBoardColumns } from "@/shared/lib/board-mapper";
import { jsonError, jsonOk } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";
import { getProjectAccess } from "@/shared/lib/project-access";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireApiSession(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { projectId } = await context.params;

  const access = await getProjectAccess(projectId, auth.session.userId);
  if (!access) {
    return jsonError("Project not found", 404);
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      columns: {
        include: {
          tasks: {
            include: {
              assignee: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },
        },
      },
      owner: {
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!project) {
    return jsonError("Project not found", 404);
  }

  return jsonOk({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      columns: mapBoardColumns(project.columns),
      members: [
        project.owner,
        ...project.members
          .filter((membership) => membership.user.id !== project.owner.id)
          .map((membership) => membership.user),
      ],
    },
  });
}
