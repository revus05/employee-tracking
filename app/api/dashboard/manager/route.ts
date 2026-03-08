import { addHours, isAfter, isBefore } from "date-fns";
import type { NextRequest } from "next/server";
import { requireApiSession } from "@/shared/lib/auth/guards";
import { jsonError, jsonOk } from "@/shared/lib/http";
import { prisma } from "@/shared/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) {
    return auth.error;
  }

  if (auth.session.role !== "MANAGER") {
    return jsonError("Forbidden", 403);
  }

  const projectId = request.nextUrl.searchParams.get("projectId") || undefined;

  const whereClause = projectId
    ? {
        id: projectId,
        ownerId: auth.session.userId,
      }
    : {
        ownerId: auth.session.userId,
      };

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      columns: {
        select: {
          id: true,
          name: true,
          isCompleted: true,
        },
      },
      tasks: {
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
    },
  });

  if (projectId && projects.length === 0) {
    return jsonError("Project not found", 404);
  }

  const tasks = projects.flatMap((project) => project.tasks);
  const columns = projects.flatMap((project) => project.columns);
  const columnsMap = new Map(
    columns.map((column) => [
      column.id,
      { name: column.name, isCompleted: column.isCompleted },
    ]),
  );

  const now = new Date();
  const next24h = addHours(now, 24);

  const tasksByColumn = columns.map((column) => ({
    columnId: column.id,
    columnName: column.name,
    count: tasks.filter((task) => task.columnId === column.id).length,
  }));

  const overdue = tasks.filter((task) => {
    if (!task.deadline) {
      return false;
    }

    const column = columnsMap.get(task.columnId);
    return isBefore(task.deadline, now) && !column?.isCompleted;
  });

  const burning = tasks.filter((task) => {
    if (!task.deadline) {
      return false;
    }

    const column = columnsMap.get(task.columnId);
    return (
      isAfter(task.deadline, now) &&
      isBefore(task.deadline, next24h) &&
      !column?.isCompleted
    );
  });

  const assigneeDistributionMap = new Map<
    string,
    { assigneeId: string; name: string; count: number }
  >();
  const leaderboardMap = new Map<
    string,
    { assigneeId: string; name: string; count: number }
  >();

  for (const task of tasks) {
    if (task.assignee) {
      const existing = assigneeDistributionMap.get(task.assignee.id) ?? {
        assigneeId: task.assignee.id,
        name: task.assignee.username,
        count: 0,
      };
      existing.count += 1;
      assigneeDistributionMap.set(task.assignee.id, existing);

      const column = columnsMap.get(task.columnId);
      if (column?.isCompleted) {
        const leader = leaderboardMap.get(task.assignee.id) ?? {
          assigneeId: task.assignee.id,
          name: task.assignee.username,
          count: 0,
        };
        leader.count += 1;
        leaderboardMap.set(task.assignee.id, leader);
      }
    }
  }

  const assigneeDistribution = [...assigneeDistributionMap.values()].sort(
    (a, b) => b.count - a.count,
  );
  const leaderboard = [...leaderboardMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return jsonOk({
    totals: {
      projects: projects.length,
      tasks: tasks.length,
      overdue: overdue.length,
      burning: burning.length,
    },
    tasksByColumn,
    assigneeDistribution,
    leaderboard,
  });
}
