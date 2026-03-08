import type { NextRequest } from "next/server";
import { createColumnSchema } from "@/entities/column/model/schemas";
import { requireApiSession } from "@/shared/lib/auth/guards";
import { jsonError, jsonOk } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";
import {
  canManageProject,
  getProjectAccess,
} from "@/shared/lib/project-access";

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

  if (
    !canManageProject(auth.session.role, access.ownerId, auth.session.userId)
  ) {
    return jsonError("Only manager-owner can manage columns", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = createColumnSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid request payload", 400, parsed.error.flatten());
  }

  const maxOrder = await prisma.column.aggregate({
    where: { projectId },
    _max: { order: true },
  });

  const column = await prisma.column.create({
    data: {
      projectId,
      name: parsed.data.name,
      color: parsed.data.color ?? "slate",
      isCompleted: parsed.data.isCompleted ?? false,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  return jsonOk(
    {
      column: {
        id: column.id,
        name: column.name,
        color: column.color,
        isCompleted: column.isCompleted,
        order: column.order,
        tasks: [],
      },
    },
    201,
  );
}
