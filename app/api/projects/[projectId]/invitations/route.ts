import type { NextRequest } from "next/server";
import { createInvitationSchema } from "@/entities/project/model/schemas";
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
    return jsonError("Only manager-owner can invite members", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = createInvitationSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid request payload", 400, parsed.error.flatten());
  }

  if (parsed.data.inviteeId === auth.session.userId) {
    return jsonError("You are already in this project", 400);
  }

  const invitee = await prisma.user.findUnique({
    where: {
      id: parsed.data.inviteeId,
    },
    select: {
      id: true,
    },
  });

  if (!invitee) {
    return jsonError("User not found", 404);
  }

  const existingMembership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: parsed.data.inviteeId,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingMembership) {
    return jsonError("User is already in project", 409);
  }

  const existingInvitation = await prisma.invitation.findUnique({
    where: {
      projectId_inviteeId: {
        projectId,
        inviteeId: parsed.data.inviteeId,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (existingInvitation?.status === "PENDING") {
    return jsonError("Invitation already sent", 409);
  }

  const invitation = await prisma.invitation.upsert({
    where: {
      projectId_inviteeId: {
        projectId,
        inviteeId: parsed.data.inviteeId,
      },
    },
    create: {
      projectId,
      inviterId: auth.session.userId,
      inviteeId: parsed.data.inviteeId,
      status: "PENDING",
      respondedAt: null,
    },
    update: {
      inviterId: auth.session.userId,
      status: "PENDING",
      respondedAt: null,
    },
  });

  return jsonOk({ invitation }, 201);
}
