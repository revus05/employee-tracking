import type { NextRequest } from "next/server";
import { requireApiSession } from "@/shared/lib/auth/guards";
import { jsonError, jsonOk } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) {
    return auth.error;
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query")?.trim() || "";
  const projectId = searchParams.get("projectId")?.trim() || "";

  if (query.length < 2) {
    return jsonOk({ users: [] });
  }

  let excludedIds: string[] = [auth.session.userId];

  if (projectId) {
    const [members, invitations, project] = await Promise.all([
      prisma.projectMember.findMany({
        where: { projectId },
        select: { userId: true },
      }),
      prisma.invitation.findMany({
        where: {
          projectId,
          status: "PENDING",
        },
        select: {
          inviteeId: true,
        },
      }),
      prisma.project.findUnique({
        where: {
          id: projectId,
        },
        select: {
          ownerId: true,
        },
      }),
    ]);

    if (!project) {
      return jsonError("Project not found", 404);
    }

    excludedIds = [
      ...new Set([
        auth.session.userId,
        project.ownerId,
        ...members.map((item) => item.userId),
        ...invitations.map((item) => item.inviteeId),
      ]),
    ];
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        notIn: excludedIds,
      },
      OR: [{ email: { contains: query } }, { username: { contains: query } }],
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
    },
    take: 8,
    orderBy: {
      username: "asc",
    },
  });

  return jsonOk({ users });
}
