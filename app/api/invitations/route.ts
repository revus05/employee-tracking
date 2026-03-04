import type { NextRequest } from "next/server";
import { requireApiSession } from "@/shared/lib/auth/guards";
import { jsonOk } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) {
    return auth.error;
  }

  const invitations = await prisma.invitation.findMany({
    where: {
      inviteeId: auth.session.userId,
      status: "PENDING",
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      inviter: {
        select: {
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return jsonOk({
    invitations: invitations.map((invitation) => ({
      id: invitation.id,
      projectId: invitation.project.id,
      projectName: invitation.project.name,
      inviterName: invitation.inviter.username,
      createdAt: invitation.createdAt.toISOString(),
    })),
  });
}
