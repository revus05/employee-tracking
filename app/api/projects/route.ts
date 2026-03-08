import type { NextRequest } from "next/server";
import { createProjectSchema } from "@/entities/project/model/schemas";
import { requireApiSession } from "@/shared/lib/auth/guards";
import { jsonError, jsonOk } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) {
    return auth.error;
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: auth.session.userId },
        {
          members: {
            some: {
              userId: auth.session.userId,
            },
          },
        },
      ],
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  return jsonOk({
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt.toISOString(),
      membersCount: project._count.members + 1,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) {
    return auth.error;
  }

  if (auth.session.role !== "MANAGER") {
    return jsonError("Only managers can create projects", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid request payload", 400, parsed.error.flatten());
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      ownerId: auth.session.userId,
      members: {
        create: {
          userId: auth.session.userId,
        },
      },
      columns: {
        createMany: {
          data: [
            { name: "Backlog", order: 0, color: "slate", isCompleted: false },
            {
              name: "In Progress",
              order: 1,
              color: "amber",
              isCompleted: false,
            },
            { name: "Done", order: 2, color: "emerald", isCompleted: true },
          ],
        },
      },
    },
  });

  return jsonOk(
    {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
      },
    },
    201,
  );
}
