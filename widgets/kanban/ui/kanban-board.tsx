"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVerticalIcon,
  PlusIcon,
  Settings2Icon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createColumnSchema } from "@/entities/column/model/schemas";
import type { BoardColumn } from "@/entities/column/model/types";
import type { BoardTask } from "@/entities/task/model/types";
import {
  COLUMN_COLOR_HEX,
  COLUMN_COLORS,
  type ColumnColor,
  getColumnColorClasses,
} from "@/features/column-management/model/column-colors";
import { useColumnsStore } from "@/features/column-management/model/use-columns-store";
import { InviteUserForm } from "@/features/project-management/ui/invite-user-form";
import {
  TaskCard,
  TaskCardPreview,
} from "@/features/task-management/ui/task-card";
import { TaskDialog } from "@/features/task-management/ui/task-dialog";
import { cn } from "@/lib/utils";
import { apiClient, getErrorMessage } from "@/shared/api/client";

type Member = {
  id: string;
  username: string;
  email: string;
  role: "MANAGER" | "DEVELOPER";
};

type KanbanBoardProps = {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  initialColumns: BoardColumn[];
  members: Member[];
  currentUser: {
    id: string;
    role: "MANAGER" | "DEVELOPER";
  };
  isOwner: boolean;
};

type TaskPosition = {
  columnId: string;
  index: number;
};

function findTaskPosition(
  columns: BoardColumn[],
  taskId: string,
): TaskPosition | null {
  for (const column of columns) {
    const index = column.tasks.findIndex((task) => task.id === taskId);
    if (index >= 0) {
      return { columnId: column.id, index };
    }
  }

  return null;
}

function findTask(columns: BoardColumn[], taskId: string): BoardTask | null {
  for (const column of columns) {
    const task = column.tasks.find((item) => item.id === taskId);
    if (task) {
      return task;
    }
  }

  return null;
}

function ColumnDropArea({
  columnId,
  children,
}: {
  columnId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-drop-${columnId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-20 flex-1 flex-col rounded-lg border border-transparent transition-colors",
        isOver && "border-primary/40 bg-primary/5",
      )}
    >
      {children}
    </div>
  );
}

type ColumnEditPopoverProps = {
  column: BoardColumn;
  onSave: (input: {
    columnId: string;
    name: string;
    color: ColumnColor;
    isCompleted: boolean;
  }) => Promise<void>;
  onDeleteRequest: (column: BoardColumn) => void;
};

function ColumnEditPopover({
  column,
  onSave,
  onDeleteRequest,
}: ColumnEditPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(column.name);
  const [color, setColor] = React.useState<ColumnColor>(
    (column.color as ColumnColor) ?? "slate",
  );
  const [isCompleted, setIsCompleted] = React.useState(column.isCompleted);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(column.name);
      setColor((column.color as ColumnColor) ?? "slate");
      setIsCompleted(column.isCompleted);
      setError(null);
    }
  }, [column.color, column.isCompleted, column.name, open]);

  async function handleSave() {
    const parsed = createColumnSchema.safeParse({
      name,
      color,
      isCompleted,
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Проверьте данные";
      setError(message);
      toast.error(message);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        columnId: column.id,
        name: parsed.data.name,
        color: parsed.data.color as ColumnColor,
        isCompleted: parsed.data.isCompleted ?? false,
      });
      setOpen(false);
    } catch (err) {
      const message = getErrorMessage(err, "Не удалось обновить колонку");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label="Edit column"
        >
          <Settings2Icon className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3">
        <div className="text-sm font-medium">Настройки колонки</div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Название</p>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например: QA"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Цвет</p>
          <div className="grid grid-cols-6 gap-2">
            {COLUMN_COLORS.map((item) => (
              <button
                key={`${column.id}-${item}`}
                type="button"
                onClick={() => setColor(item)}
                className={cn(
                  "size-6 rounded-full ring-2 ring-transparent transition",
                  color === item && "ring-primary",
                )}
                style={{ backgroundColor: COLUMN_COLOR_HEX[item] }}
                title={item}
              />
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={(event) => setIsCompleted(event.target.checked)}
            className="size-4"
          />
          Колонка выполненных задач
        </label>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="flex-1"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Сохраняем..." : "Сохранить"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1 text-destructive"
            onClick={() => {
              setOpen(false);
              onDeleteRequest(column);
            }}
          >
            <Trash2Icon className="size-3.5" />
            Удалить
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProjectMembersCard({ members }: { members: Member[] }) {
  return (
    <div className="rounded-xl border bg-card/70 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <UsersIcon className="size-4 text-muted-foreground" />
        Команда проекта
      </div>
      <div className="mt-2 space-y-2 text-sm">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between rounded-md border bg-background/80 px-2 py-1.5"
          >
            <div>
              <div className="font-medium">{member.username}</div>
              <div className="text-xs text-muted-foreground">
                {member.email}
              </div>
            </div>
            <Badge variant="outline">
              {member.role === "MANAGER" ? "Manager" : "Dev"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

type SortableColumnProps = {
  column: BoardColumn;
  canManageColumns: boolean;
  onOpenCreateTask: (columnId: string) => void;
  onOpenEditTask: (task: BoardTask) => void;
  onSaveColumn: (input: {
    columnId: string;
    name: string;
    color: ColumnColor;
    isCompleted: boolean;
  }) => Promise<void>;
  onDeleteColumn: (column: BoardColumn) => void;
};

function SortableColumn({
  column,
  canManageColumns,
  onOpenCreateTask,
  onOpenEditTask,
  onSaveColumn,
  onDeleteColumn,
}: SortableColumnProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${column.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex h-[calc(100vh-18rem)] min-h-115 w-80 flex-col rounded-xl border bg-card/70",
        isDragging && "opacity-70 shadow-lg",
      )}
    >
      <header className="border-b p-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "truncate rounded-md px-2 py-1 text-sm ring-1",
              getColumnColorClasses(column.color),
            )}
          >
            {column.name}
          </div>
          <Badge variant="secondary">{column.tasks.length}</Badge>

          <div className="ml-auto flex items-center gap-1">
            {canManageColumns && (
              <ColumnEditPopover
                column={column}
                onSave={onSaveColumn}
                onDeleteRequest={onDeleteColumn}
              />
            )}

            {canManageColumns && (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                aria-label="Move column"
              >
                <GripVerticalIcon className="size-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <SortableContext
        items={column.tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <ColumnDropArea columnId={column.id}>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
            {column.tasks.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Перетащите задачу сюда
              </div>
            )}

            {column.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                hideDeadline={column.isCompleted}
                onEdit={onOpenEditTask}
              />
            ))}
          </div>
        </ColumnDropArea>
      </SortableContext>

      <div className="border-t p-3">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() => onOpenCreateTask(column.id)}
        >
          <PlusIcon className="size-4" />
          Добавить задачу
        </Button>
      </div>
    </section>
  );
}

export function KanbanBoard({
  projectId,
  projectName,
  projectDescription,
  initialColumns,
  members,
  currentUser,
  isOwner,
}: KanbanBoardProps) {
  const router = useRouter();
  const columns = useColumnsStore((state) => state.columns);
  const setColumns = useColumnsStore((state) => state.setColumns);
  const upsertColumn = useColumnsStore((state) => state.upsertColumn);
  const removeColumn = useColumnsStore((state) => state.removeColumn);
  const moveColumn = useColumnsStore((state) => state.moveColumn);
  const upsertTask = useColumnsStore((state) => state.upsertTask);
  const removeTask = useColumnsStore((state) => state.removeTask);
  const moveTask = useColumnsStore((state) => state.moveTask);

  const [newColumnName, setNewColumnName] = React.useState("");
  const [newColumnColor, setNewColumnColor] =
    React.useState<ColumnColor>("slate");
  const [taskDialogOpen, setTaskDialogOpen] = React.useState(false);
  const [activeColumnId, setActiveColumnId] = React.useState(
    initialColumns[0]?.id || "",
  );
  const [editingTask, setEditingTask] = React.useState<BoardTask | null>(null);
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
  const [deletingColumn, setDeletingColumn] =
    React.useState<BoardColumn | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setColumns(initialColumns);
    if (!activeColumnId && initialColumns[0]) {
      setActiveColumnId(initialColumns[0].id);
    }
  }, [activeColumnId, initialColumns, setColumns]);

  const canManageColumns = currentUser.role === "MANAGER" && isOwner;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const activeTask = activeTaskId ? findTask(columns, activeTaskId) : null;
  const activeTaskColumn = activeTask
    ? columns.find((column) => column.id === activeTask.columnId)
    : null;

  async function handleCreateColumn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = createColumnSchema.safeParse({
      name: newColumnName,
      color: newColumnColor,
    });

    if (!validation.success) {
      const message =
        validation.error.issues[0]?.message || "Проверьте название колонки";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      const response = await apiClient<{ column: BoardColumn }>(
        `/api/projects/${projectId}/columns`,
        {
          method: "POST",
          body: JSON.stringify(validation.data),
        },
      );

      upsertColumn(response.column);
      setNewColumnName("");
      setError(null);
    } catch (err) {
      const message = getErrorMessage(err, "Не удалось создать колонку");
      setError(message);
      toast.error(message);
    }
  }

  async function handleSaveColumn(input: {
    columnId: string;
    name: string;
    color: ColumnColor;
    isCompleted: boolean;
  }) {
    const column = columns.find((item) => item.id === input.columnId);
    if (!column) {
      return;
    }

    const response = await apiClient<{
      column: {
        id: string;
        name: string;
        color: string;
        isCompleted: boolean;
        order: number;
      };
    }>(`/api/projects/${projectId}/columns/${input.columnId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: input.name,
        color: input.color,
        isCompleted: input.isCompleted,
      }),
    });

    upsertColumn({ ...column, ...response.column });
    setError(null);
  }

  async function handleDeleteColumnConfirmed() {
    if (!deletingColumn) {
      return;
    }

    setDeletePending(true);

    try {
      await apiClient(
        `/api/projects/${projectId}/columns/${deletingColumn.id}`,
        {
          method: "DELETE",
        },
      );

      removeColumn(deletingColumn.id);
      setDeletingColumn(null);
      router.refresh();
      setError(null);
    } catch (err) {
      const message = getErrorMessage(err, "Не удалось удалить колонку");
      setError(message);
      toast.error(message);
    } finally {
      setDeletePending(false);
    }
  }

  function openCreateTask(columnId: string) {
    setEditingTask(null);
    setActiveColumnId(columnId);
    setTaskDialogOpen(true);
  }

  function openEditTask(task: BoardTask) {
    setEditingTask(task);
    setActiveColumnId(task.columnId);
    setTaskDialogOpen(true);
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (id.startsWith("column-")) {
      return;
    }
    setActiveTaskId(id);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    setActiveTaskId(null);

    if (!overId) {
      return;
    }

    if (activeId.startsWith("column-")) {
      if (!overId.startsWith("column-") || activeId === overId) {
        return;
      }

      const fromColumnId = activeId.replace("column-", "");
      const toColumnId = overId.replace("column-", "");

      moveColumn({ fromColumnId, toColumnId });

      try {
        await apiClient(`/api/projects/${projectId}/columns/reorder`, {
          method: "POST",
          body: JSON.stringify({
            fromColumnId,
            toColumnId,
          }),
        });
        setError(null);
      } catch (err) {
        const message = getErrorMessage(
          err,
          "Не удалось сохранить порядок колонок",
        );
        router.refresh();
        setError(message);
        toast.error(message);
      }

      return;
    }

    const source = findTaskPosition(columns, activeId);
    if (!source) {
      return;
    }

    let targetColumnId: string;
    let targetIndex: number;

    if (overId.startsWith("column-drop-")) {
      targetColumnId = overId.replace("column-drop-", "");
      const targetColumn = columns.find(
        (column) => column.id === targetColumnId,
      );
      targetIndex = targetColumn?.tasks.length ?? 0;
    } else if (overId.startsWith("column-")) {
      targetColumnId = overId.replace("column-", "");
      const targetColumn = columns.find(
        (column) => column.id === targetColumnId,
      );
      targetIndex = targetColumn?.tasks.length ?? 0;
    } else {
      const target = findTaskPosition(columns, overId);
      if (!target) {
        return;
      }
      targetColumnId = target.columnId;
      targetIndex = target.index;
    }

    if (source.columnId === targetColumnId && source.index === targetIndex) {
      return;
    }

    moveTask({
      taskId: activeId,
      fromColumnId: source.columnId,
      toColumnId: targetColumnId,
      toIndex: targetIndex,
    });

    try {
      await apiClient(`/api/projects/${projectId}/tasks/reorder`, {
        method: "POST",
        body: JSON.stringify({
          taskId: activeId,
          fromColumnId: source.columnId,
          toColumnId: targetColumnId,
          toIndex: targetIndex,
        }),
      });
      setError(null);
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Не удалось сохранить новый порядок задач",
      );
      router.refresh();
      setError(message);
      toast.error(message);
    }
  }

  return (
    <section className="space-y-4">
      <div
        className={cn(
          "grid gap-4",
          canManageColumns
            ? "xl:grid-cols-[1fr_auto]"
            : "xl:grid-cols-[1fr_320px]",
        )}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {projectName}
            </h1>
            {projectDescription && (
              <p className="text-sm text-muted-foreground">
                {projectDescription}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{columns.length} columns</Badge>
            <Badge variant="outline">
              {columns.reduce((acc, column) => acc + column.tasks.length, 0)}{" "}
              tasks
            </Badge>
          </div>
        </div>

        {canManageColumns ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <UsersIcon className="size-4" />
                Пригласить в проект
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-88">
              <InviteUserForm projectId={projectId} inPopover />
            </PopoverContent>
          </Popover>
        ) : (
          <ProjectMembersCard members={members} />
        )}
      </div>

      {canManageColumns && (
        <form
          onSubmit={handleCreateColumn}
          className="flex flex-wrap items-center gap-2 rounded-xl border bg-card/60 p-3"
        >
          <Input
            value={newColumnName}
            onChange={(event) => setNewColumnName(event.target.value)}
            placeholder="Новая колонка"
            className="max-w-xs"
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: COLUMN_COLOR_HEX[newColumnColor] }}
                />
                Цвет
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60">
              <div className="grid grid-cols-6 gap-2">
                {COLUMN_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColumnColor(color)}
                    className={cn(
                      "size-7 rounded-full ring-2 ring-transparent transition",
                      color === newColumnColor && "ring-primary",
                    )}
                    style={{ backgroundColor: COLUMN_COLOR_HEX[color] }}
                    title={color}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button type="submit" className="gap-2">
            <PlusIcon className="size-4" />
            Добавить колонку
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragCancel={() => setActiveTaskId(null)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={columns.map((column) => `column-${column.id}`)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="grid auto-cols-[320px] grid-flow-col gap-4 overflow-x-auto pb-2">
            {columns.map((column) => (
              <SortableColumn
                key={column.id}
                column={column}
                canManageColumns={canManageColumns}
                onOpenCreateTask={openCreateTask}
                onOpenEditTask={openEditTask}
                onSaveColumn={handleSaveColumn}
                onDeleteColumn={setDeletingColumn}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <TaskCardPreview
              task={activeTask}
              hideDeadline={Boolean(activeTaskColumn?.isCompleted)}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDialog
        projectId={projectId}
        members={members.map((member) => ({
          id: member.id,
          username: member.username,
          email: member.email,
        }))}
        columns={columns.map((column) => ({
          id: column.id,
          name: column.name,
          isCompleted: column.isCompleted,
        }))}
        defaultColumnId={activeColumnId}
        open={taskDialogOpen}
        task={editingTask}
        onOpenChange={setTaskDialogOpen}
        onSaved={(task) => upsertTask(task)}
        onDeleted={(taskId) => removeTask(taskId)}
      />

      <AlertDialog
        open={Boolean(deletingColumn)}
        onOpenChange={(open) => !open && setDeletingColumn(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить колонку?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingColumn
                ? `Колонка '${deletingColumn.name}' будет удалена. Задачи автоматически перенесутся в первую доступную колонку.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteColumnConfirmed}
              disabled={deletePending}
            >
              {deletePending ? "Удаляем..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
