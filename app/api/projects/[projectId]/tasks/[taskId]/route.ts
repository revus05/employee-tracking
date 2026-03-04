import type { NextRequest } from "next/server";
import { updateTaskSchema } from "@/entities/task/model/schemas";
import { requireApiSession } from "@/shared/lib/auth/guards";
import { jsonError, jsonOk } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";
import { getProjectAccess } from "@/shared/lib/project-access";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; taskId: string }> },
) {
  const auth = await requireApiSession(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { projectId, taskId } = await context.params;
  const access = await getProjectAccess(projectId, auth.session.userId);

  if (!access) {
    return jsonError("Project not found", 404);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid request payload", 400, parsed.error.flatten());
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      projectId,
    },
  });

  if (!task) {
    return jsonError("Task not found", 404);
  }

  let nextColumnId = parsed.data.columnId ?? task.columnId;

  if (parsed.data.columnId) {
    const targetColumn = await prisma.column.findFirst({
      where: {
        id: parsed.data.columnId,
        projectId,
      },
      select: {
        id: true,
      },
    });

    if (!targetColumn) {
      return jsonError("Target column not found", 404);
    }

    nextColumnId = targetColumn.id;
  }

  const assigneeIdInput = parsed.data.assigneeId;
  const nextAssigneeId =
    assigneeIdInput === undefined ? task.assigneeId : assigneeIdInput || null;

  if (nextAssigneeId) {
    const assignee = await prisma.user.findFirst({
      where: {
        id: nextAssigneeId,
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

  const movedAcrossColumns = nextColumnId !== task.columnId;

  const updatedTask = await prisma.$transaction(async (tx) => {
    let nextOrder = task.order;

    if (movedAcrossColumns) {
      const maxOrder = await tx.task.aggregate({
        where: {
          projectId,
          columnId: nextColumnId,
        },
        _max: {
          order: true,
        },
      });
      nextOrder = (maxOrder._max.order ?? -1) + 1;
    }

    const updated = await tx.task.update({
      where: {
        id: taskId,
      },
      data: {
        title: parsed.data.title ?? task.title,
        description:
          parsed.data.description === undefined
            ? task.description
            : parsed.data.description || null,
        assigneeId: nextAssigneeId,
        deadline:
          parsed.data.deadline === undefined
            ? task.deadline
            : parsed.data.deadline
              ? new Date(parsed.data.deadline)
              : null,
        columnId: nextColumnId,
        order: nextOrder,
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

    if (movedAcrossColumns) {
      const sourceTasks = await tx.task.findMany({
        where: {
          projectId,
          columnId: task.columnId,
        },
        orderBy: {
          order: "asc",
        },
        select: {
          id: true,
        },
      });

      for (const [index, sourceTask] of sourceTasks.entries()) {
        await tx.task.update({
          where: {
            id: sourceTask.id,
          },
          data: {
            order: index,
          },
        });
      }
    }

    return updated;
  });

  return jsonOk({
    task: {
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description,
      deadline: updatedTask.deadline
        ? updatedTask.deadline.toISOString()
        : null,
      assigneeId: updatedTask.assigneeId,
      assigneeName: updatedTask.assignee?.username ?? null,
      assigneeEmail: updatedTask.assignee?.email ?? null,
      columnId: updatedTask.columnId,
      order: updatedTask.order,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; taskId: string }> },
) {
  const auth = await requireApiSession(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { projectId, taskId } = await context.params;
  const access = await getProjectAccess(projectId, auth.session.userId);

  if (!access) {
    return jsonError("Project not found", 404);
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      projectId,
    },
  });

  if (!task) {
    return jsonError("Task not found", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.delete({
      where: {
        id: taskId,
      },
    });

    const rest = await tx.task.findMany({
      where: {
        projectId,
        columnId: task.columnId,
      },
      orderBy: {
        order: "asc",
      },
      select: {
        id: true,
      },
    });

    for (const [index, item] of rest.entries()) {
      await tx.task.update({
        where: {
          id: item.id,
        },
        data: {
          order: index,
        },
      });
    }
  });

  return jsonOk({ success: true });
}
