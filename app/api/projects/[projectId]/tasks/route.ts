import type { NextRequest } from "next/server";
import { createTaskSchema } from "@/entities/task/model/schemas";
import { requireApiSession } from "@/shared/lib/auth/guards";
import { jsonError, jsonOk } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";
import { getProjectAccess } from "@/shared/lib/project-access";

export async function POST(
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

  const body = await request.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid request payload", 400, parsed.error.flatten());
  }

  const column = await prisma.column.findFirst({
    where: {
      id: parsed.data.columnId,
      projectId,
    },
  });

  if (!column) {
    return jsonError("Column not found", 404);
  }

  const assigneeId = parsed.data.assigneeId || null;

  if (assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: {
        id: assigneeId,
        OR: [
          {
            memberships: {
              some: {
                projectId,
              },
            },
          },
          {
            ownedProjects: {
              some: {
                id: projectId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!assignee) {
      return jsonError("Assignee is not part of this project", 400);
    }
  }

  const maxOrder = await prisma.task.aggregate({
    where: {
      projectId,
      columnId: column.id,
    },
    _max: {
      order: true,
    },
  });

  const deadline = parsed.data.deadline ? new Date(parsed.data.deadline) : null;

  const task = await prisma.task.create({
    data: {
      projectId,
      columnId: column.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      assigneeId,
      deadline,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: {
      assignee: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  return jsonOk(
    {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        deadline: task.deadline ? task.deadline.toISOString() : null,
        assigneeId: task.assigneeId,
        assigneeName: task.assignee?.username ?? null,
        assigneeEmail: task.assignee?.email ?? null,
        columnId: task.columnId,
        order: task.order,
      },
    },
    201,
  );
}
