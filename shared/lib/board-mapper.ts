import type { Column, Task } from "@prisma/client";
import type { BoardColumn } from "@/entities/column/model/types";

export type BoardTaskWithAssignee = Task & {
  assignee: {
    id: string;
    username: string;
    email: string;
  } | null;
};

export type BoardColumnWithTasks = Column & {
  tasks: BoardTaskWithAssignee[];
};

export function mapBoardColumns(
  columns: BoardColumnWithTasks[],
): BoardColumn[] {
  return columns
    .sort((a, b) => a.order - b.order)
    .map((column) => ({
      id: column.id,
      name: column.name,
      color: column.color,
      isCompleted: column.isCompleted,
      order: column.order,
      tasks: column.tasks
        .sort((a, b) => a.order - b.order)
        .map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          deadline: task.deadline ? task.deadline.toISOString() : null,
          assigneeId: task.assigneeId,
          assigneeName: task.assignee?.username ?? null,
          assigneeEmail: task.assignee?.email ?? null,
          columnId: task.columnId,
          order: task.order,
        })),
    }));
}
