import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/shared/lib/auth/session";
import { ManagerDashboard } from "@/widgets/analytics/ui/manager-dashboard";

export default async function DashboardPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "MANAGER") {
    redirect("/projects");
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Manager Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Метрики по стадиям задач, дедлайнам и производительности
        </p>
      </div>
      <ManagerDashboard />
    </section>
  );
}
