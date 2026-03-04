import type { NextRequest } from "next/server";
import { reorderTaskSchema } from "@/entities/task/model/schemas";
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
  const parsed = reorderTaskSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid request payload", 400, parsed.error.flatten());
  }

  const { taskId, fromColumnId, toColumnId, toIndex } = parsed.data;

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      projectId,
    },
    select: {
      id: true,
      columnId: true,
    },
  });

  if (!task) {
    return jsonError("Task not found", 404);
  }

  if (task.columnId !== fromColumnId) {
    return jsonError("Task column mismatch", 409);
  }

  await prisma.$transaction(async (tx) => {
    if (fromColumnId === toColumnId) {
      const columnTasks = await tx.task.findMany({
        where: {
          projectId,
          columnId: fromColumnId,
        },
        orderBy: {
          order: "asc",
        },
      });

      const movingTask = columnTasks.find((item) => item.id === taskId);
      if (!movingTask) {
        return;
      }

      const rest = columnTasks.filter((item) => item.id !== taskId);
      const safeIndex = Math.max(0, Math.min(toIndex, rest.length));
      rest.splice(safeIndex, 0, movingTask);

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

      return;
    }

    const sourceTasks = await tx.task.findMany({
      where: {
        projectId,
        columnId: fromColumnId,
      },
      orderBy: {
        order: "asc",
      },
    });

    const targetTasks = await tx.task.findMany({
      where: {
        projectId,
        columnId: toColumnId,
      },
      orderBy: {
        order: "asc",
      },
    });

    const movingTask = sourceTasks.find((item) => item.id === taskId);
    if (!movingTask) {
      return;
    }

    const nextSource = sourceTasks.filter((item) => item.id !== taskId);
    const safeIndex = Math.max(0, Math.min(toIndex, targetTasks.length));
    targetTasks.splice(safeIndex, 0, movingTask);

    for (const [index, item] of nextSource.entries()) {
      await tx.task.update({
        where: {
          id: item.id,
        },
        data: {
          order: index,
        },
      });
    }

    for (const [index, item] of targetTasks.entries()) {
      await tx.task.update({
        where: {
          id: item.id,
        },
        data: {
          columnId: toColumnId,
          order: index,
        },
      });
    }
  });

  return jsonOk({ success: true });
}
