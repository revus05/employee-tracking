import type { NextRequest } from "next/server";
import { requireApiSession } from "@/shared/lib/auth/guards";
import { jsonError, jsonOk } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";
import { getProjectAccess } from "@/shared/lib/project-access";

export async function GET(
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

  const comments = await prisma.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: { username: true },
      },
    },
  });

  return jsonOk({
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      authorName: c.author.username,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(
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
  if (!body || typeof body.content !== "string" || !body.content.trim()) {
    return jsonError("Content is required", 400);
  }

  const comment = await prisma.comment.create({
    data: {
      taskId,
      authorId: auth.session.userId,
      content: body.content.trim(),
    },
    include: {
      author: {
        select: { username: true },
      },
    },
  });

  return jsonOk(
    {
      comment: {
        id: comment.id,
        content: comment.content,
        authorName: comment.author.username,
        createdAt: comment.createdAt.toISOString(),
      },
    },
    201,
  );
}
