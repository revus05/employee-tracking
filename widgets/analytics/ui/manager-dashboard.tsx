"use client";

import {
  AlertTriangleIcon,
  FlameIcon,
  LayoutPanelTopIcon,
  UsersIcon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient, getErrorMessage } from "@/shared/api/client";

type DashboardData = {
  totals: {
    projects: number;
    tasks: number;
    overdue: number;
    burning: number;
  };
  tasksByColumn: Array<{
    columnId: string;
    columnName: string;
    count: number;
  }>;
  assigneeDistribution: Array<{
    assigneeId: string;
    name: string;
    count: number;
  }>;
  leaderboard: Array<{
    assigneeId: string;
    name: string;
    count: number;
  }>;
};

export function ManagerDashboard() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let canceled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient<DashboardData>(
          "/api/dashboard/manager",
        );
        if (!canceled) {
          setData(response);
        }
      } catch (err) {
        if (!canceled) {
          const message = getErrorMessage(
            err,
            "Не удалось загрузить аналитику",
          );
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      canceled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-destructive">{error || "Нет данных"}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <LayoutPanelTopIcon className="size-4" />
              Статус задач
            </CardDescription>
            <CardTitle>{data.totals.tasks}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Всего задач в управляемых проектах
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <AlertTriangleIcon className="size-4" />
              Просрочено
            </CardDescription>
            <CardTitle>{data.totals.overdue}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={data.totals.overdue > 0 ? "destructive" : "secondary"}
            >
              Контроль SLA
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <FlameIcon className="size-4" />
              Горящие
            </CardDescription>
            <CardTitle>{data.totals.burning}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Дедлайн менее чем через 24 часа
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <UsersIcon className="size-4" />
              Исполнители
            </CardDescription>
            <CardTitle>{data.assigneeDistribution.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Участвуют в работе над задачами
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Распределение по колонкам</CardTitle>
            <CardDescription>Сколько задач на каждой стадии</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.tasksByColumn.map((item) => (
              <div
                key={item.columnId}
                className="flex items-center justify-between rounded-md border bg-background/80 px-3 py-2 text-sm"
              >
                <span>{item.columnName}</span>
                <Badge variant="outline">{item.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Лидерборд</CardTitle>
            <CardDescription>
              Топ исполнителей по закрытым задачам
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.leaderboard.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Пока нет завершенных задач
              </div>
            ) : (
              data.leaderboard.map((item, index) => (
                <div
                  key={item.assigneeId}
                  className="flex items-center justify-between rounded-md border bg-background/80 px-3 py-2 text-sm"
                >
                  <span>
                    {index + 1}. {item.name}
                  </span>
                  <Badge>{item.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
