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

  const projectId = request.nextUrl.searchParams.get("projectId") || undefined;

  const ownerOrMemberFilter =
    auth.session.role === "MANAGER"
      ? { ownerId: auth.session.userId }
      : {
          members: {
            some: { userId: auth.session.userId },
          },
        };

  const whereClause = projectId
    ? { id: projectId, ...ownerOrMemberFilter }
    : ownerOrMemberFilter;

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

  const membersMap = new Map<
    string,
    { id: string; username: string; email: string; role: string }
  >();
  for (const project of projects) {
    const owner = project.owner;
    if (!membersMap.has(owner.id)) {
      membersMap.set(owner.id, {
        id: owner.id,
        username: owner.username,
        email: owner.email,
        role: owner.role,
      });
    }
    for (const member of project.members) {
      if (!membersMap.has(member.user.id)) {
        membersMap.set(member.user.id, {
          id: member.user.id,
          username: member.user.username,
          email: member.user.email,
          role: member.user.role,
        });
      }
    }
  }
  const membersList = [...membersMap.values()];

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
    members: membersList,
  });
}
