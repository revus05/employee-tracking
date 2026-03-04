import type { NextRequest } from "next/server";
import { requireApiSession } from "@/shared/lib/auth/guards";
import { jsonError, jsonOk } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ invitationId: string }> },
) {
  const auth = await requireApiSession(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { invitationId } = await context.params;

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      inviteeId: auth.session.userId,
      status: "PENDING",
    },
    select: {
      id: true,
    },
  });

  if (!invitation) {
    return jsonError("Invitation not found", 404);
  }

  await prisma.invitation.update({
    where: {
      id: invitation.id,
    },
    data: {
      status: "DECLINED",
      respondedAt: new Date(),
    },
  });

  return jsonOk({ success: true });
}
