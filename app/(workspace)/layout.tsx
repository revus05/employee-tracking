import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/shared/lib/auth/session";
import { prisma } from "@/shared/lib/prisma";
import { AppShell } from "@/widgets/app-shell/ui/app-shell";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      username: true,
      role: true,
    },
  });

  if (!user) {
    redirect("/api/auth/logout?next=/login");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
