import type { NextRequest } from "next/server";
import { updateColumnSchema } from "@/entities/column/model/schemas";
import { requireApiSession } from "@/shared/lib/auth/guards";
import { jsonError, jsonOk } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";
import {
  canManageProject,
  getProjectAccess,
} from "@/shared/lib/project-access";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; columnId: string }> },
) {
  const auth = await requireApiSession(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { projectId, columnId } = await context.params;
  const access = await getProjectAccess(projectId, auth.session.userId);

  if (!access) {
    return jsonError("Project not found", 404);
  }

  if (
    !canManageProject(auth.session.role, access.ownerId, auth.session.userId)
  ) {
    return jsonError("Only manager-owner can manage columns", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateColumnSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid request payload", 400, parsed.error.flatten());
  }

  const column = await prisma.column.findFirst({
    where: {
      id: columnId,
      projectId,
    },
  });

  if (!column) {
    return jsonError("Column not found", 404);
  }

  const updated = await prisma.column.update({
    where: {
      id: columnId,
    },
    data: {
      name: parsed.data.name ?? column.name,
      color: parsed.data.color ?? column.color,
      isCompleted: parsed.data.isCompleted ?? column.isCompleted,
    },
  });

  return jsonOk({
    column: {
      id: updated.id,
      name: updated.name,
      color: updated.color,
      isCompleted: updated.isCompleted,
      order: updated.order,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; columnId: string }> },
) {
  const auth = await requireApiSession(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { projectId, columnId } = await context.params;
  const access = await getProjectAccess(projectId, auth.session.userId);

  if (!access) {
    return jsonError("Project not found", 404);
  }

  if (
    !canManageProject(auth.session.role, access.ownerId, auth.session.userId)
  ) {
    return jsonError("Only manager-owner can manage columns", 403);
  }

  const column = await prisma.column.findFirst({
    where: {
      id: columnId,
      projectId,
    },
    include: {
      tasks: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!column) {
    return jsonError("Column not found", 404);
  }

  const fallbackColumn = await prisma.column.findFirst({
    where: {
      projectId,
      id: {
        not: columnId,
      },
    },
    orderBy: {
      order: "asc",
    },
  });

  if (!fallbackColumn && column.tasks.length > 0) {
    return jsonError("Cannot delete the only column containing tasks", 400);
  }

  await prisma.$transaction(async (tx) => {
    if (fallbackColumn && column.tasks.length > 0) {
      const fallbackTasksCount = await tx.task.count({
        where: {
          columnId: fallbackColumn.id,
        },
      });

      for (const [index, task] of column.tasks.entries()) {
        await tx.task.update({
          where: {
            id: task.id,
          },
          data: {
            columnId: fallbackColumn.id,
            order: fallbackTasksCount + index,
          },
        });
      }
    }

    await tx.column.delete({
      where: {
        id: columnId,
      },
    });

    const remaining = await tx.column.findMany({
      where: {
        projectId,
      },
      orderBy: {
        order: "asc",
      },
      select: {
        id: true,
      },
    });

    for (const [index, item] of remaining.entries()) {
      await tx.column.update({
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
