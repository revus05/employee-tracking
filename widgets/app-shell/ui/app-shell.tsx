"use client";

import {
  FolderKanbanIcon,
  LayoutPanelTopIcon,
  LogOutIcon,
  MailboxIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

type AppShellProps = {
  user: {
    username: string;
    role: "MANAGER" | "DEVELOPER";
  };
  children: React.ReactNode;
};

const navigation = [
  {
    href: "/projects",
    label: "Проекты",
    icon: FolderKanbanIcon,
    managerOnly: false,
  },
  {
    href: "/invitations",
    label: "Инвайты",
    icon: MailboxIcon,
    managerOnly: false,
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutPanelTopIcon,
    managerOnly: true,
  },
] as const;

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const safePathname = pathname ?? "";
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(85%_120%_at_50%_-10%,oklch(0.95_0.02_255/0.35),transparent)] dark:bg-[radial-gradient(85%_120%_at_50%_-10%,oklch(0.45_0.04_260/0.25),transparent)]">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-400 items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FolderKanbanIcon className="size-4" />
              </div>
              <div className="font-semibold tracking-tight">Taskboard Pro</div>
            </div>
            <Badge variant="secondary">
              {user.role === "MANAGER" ? "Manager" : "Developer"}
            </Badge>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {navigation
              .filter((item) =>
                item.managerOnly ? user.role === "MANAGER" : true,
              )
              .map((item) => {
                const Icon = item.icon;
                const active = safePathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={active ? "default" : "ghost"}
                      className={cn("gap-2", active && "shadow-sm")}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOutIcon className="size-4" />
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-400 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
