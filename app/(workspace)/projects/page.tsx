import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateProjectForm } from "@/features/project-management/ui/create-project-form";
import { getSessionFromCookies } from "@/shared/lib/auth/session";
import { prisma } from "@/shared/lib/prisma";

export default async function ProjectsPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        {
          ownerId: session.userId,
        },
        {
          members: {
            some: {
              userId: session.userId,
            },
          },
        },
      ],
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const canCreate = session.role === "MANAGER";

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Проекты</h1>
        <p className="text-sm text-muted-foreground">
          Jira-style доски для команд и delivery-циклов
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {canCreate && <CreateProjectForm />}

        {projects.map((project) => (
          <Card key={project.id} className="bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="line-clamp-1">{project.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {project.description || "Описание не добавлено"}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Участников: {project._count.members + 1}
            </CardContent>
            <CardFooter>
              <Link href={`/projects/${project.id}`}>
                <Button>Открыть доску</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      {projects.length === 0 && !canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Проектов пока нет</CardTitle>
            <CardDescription>
              Ожидайте приглашение от менеджера.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </section>
  );
}
