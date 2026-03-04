import { notFound, redirect } from "next/navigation";
import { getSessionFromCookies } from "@/shared/lib/auth/session";
import { mapBoardColumns } from "@/shared/lib/board-mapper";
import { prisma } from "@/shared/lib/prisma";
import { getProjectAccess } from "@/shared/lib/project-access";
import { KanbanBoard } from "@/widgets/kanban/ui/kanban-board";

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  const { projectId } = await params;
  const access = await getProjectAccess(projectId, session.userId);

  if (!access) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      columns: {
        include: {
          tasks: {
            include: {
              assignee: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
      owner: {
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const members = [
    project.owner,
    ...project.members
      .filter((member) => member.user.id !== project.owner.id)
      .map((member) => member.user),
  ];

  return (
    <KanbanBoard
      projectId={project.id}
      projectName={project.name}
      projectDescription={project.description}
      initialColumns={mapBoardColumns(project.columns)}
      members={members}
      currentUser={{
        id: session.userId,
        role: session.role,
      }}
      isOwner={project.ownerId === session.userId}
    />
  );
}
