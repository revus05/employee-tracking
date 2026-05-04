import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionFromCookies } from "@/shared/lib/auth/session";
import { prisma } from "@/shared/lib/prisma";
import { getRoleLabel } from "@/shared/lib/role-labels";

export default async function ProfilePage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      username: true,
      email: true,
      role: true,
      createdAt: true,
      ownedProjects: {
        select: { id: true, name: true, description: true },
      },
      memberships: {
        include: {
          project: {
            select: { id: true, name: true, description: true },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const memberProjects = user.memberships.map((m) => m.project);
  const allProjects = [
    ...user.ownedProjects.map((p) => ({ ...p, isOwner: true })),
    ...memberProjects.map((p) => ({ ...p, isOwner: false })),
  ];

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Профиль</h1>
        <p className="text-sm text-muted-foreground">
          Информация о вашем аккаунте
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{user.username}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Роль:</span>
            <Badge variant="secondary">{getRoleLabel(user.role)}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Дата регистрации:</span>
            <span>{user.createdAt.toLocaleDateString("ru-RU")}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Проекты</CardTitle>
          <CardDescription>
            Все проекты, в которых вы участвуете
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {allProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет проектов</p>
          ) : (
            allProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-md border bg-background/80 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">{project.name}</div>
                  {project.description && (
                    <div className="text-xs text-muted-foreground">
                      {project.description}
                    </div>
                  )}
                </div>
                <Badge variant="outline">
                  {project.isOwner ? "Владелец" : "Участник"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
