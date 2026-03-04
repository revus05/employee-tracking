import type { NextRequest } from "next/server";
import { reorderColumnsSchema } from "@/entities/column/model/schemas";
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
  const parsed = reorderColumnsSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid request payload", 400, parsed.error.flatten());
  }

  const { fromColumnId, toColumnId } = parsed.data;

  const columns = await prisma.column.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    select: { id: true },
  });

  const fromIndex = columns.findIndex((item) => item.id === fromColumnId);
  const toIndex = columns.findIndex((item) => item.id === toColumnId);

  if (fromIndex < 0 || toIndex < 0) {
    return jsonError("Column not found", 404);
  }

  if (fromIndex === toIndex) {
    return jsonOk({ success: true });
  }

  const next = [...columns];
  const [moved] = next.splice(fromIndex, 1);

  if (!moved) {
    return jsonOk({ success: true });
  }

  next.splice(toIndex, 0, moved);

  await prisma.$transaction(async (tx) => {
    // Two-phase reorder to avoid violating unique(projectId, order)
    // while rows are being updated.
    for (const [index, column] of next.entries()) {
      await tx.column.update({
        where: { id: column.id },
        data: { order: 1000 + index },
      });
    }

    for (const [index, column] of next.entries()) {
      await tx.column.update({
        where: { id: column.id },
        data: { order: index },
      });
    }
  });

  return jsonOk({ success: true });
}
