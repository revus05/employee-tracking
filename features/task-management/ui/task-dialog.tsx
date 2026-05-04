"use client";

import { SendHorizontalIcon, Trash2Icon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createTaskSchema,
  updateTaskSchema,
} from "@/entities/task/model/schemas";
import type { BoardTask, TaskComment } from "@/entities/task/model/types";
import { apiClient, getErrorMessage } from "@/shared/api/client";

type TaskDialogProps = {
  projectId: string;
  members: Array<{
    id: string;
    username: string;
    email: string;
  }>;
  columns: Array<{
    id: string;
    name: string;
    isCompleted: boolean;
  }>;
  defaultColumnId: string;
  open: boolean;
  task: BoardTask | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (task: BoardTask) => void;
  onDeleted: (taskId: string) => void;
};

function toDateTimeLocal(iso: string | null) {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  const tzOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString();
}

export function TaskDialog({
  projectId,
  members,
  columns,
  defaultColumnId,
  open,
  task,
  onOpenChange,
  onSaved,
  onDeleted,
}: TaskDialogProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState<string>("");
  const [deadline, setDeadline] = React.useState("");
  const [columnId, setColumnId] = React.useState(defaultColumnId);
  const [comments, setComments] = React.useState<TaskComment[]>([]);
  const [newComment, setNewComment] = React.useState("");
  const [pendingComments, setPendingComments] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const selectedColumn = React.useMemo(
    () => columns.find((column) => column.id === columnId),
    [columnId, columns],
  );
  const shouldShowDeadline = !selectedColumn?.isCompleted;

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setAssigneeId(task?.assigneeId ?? "");
    setDeadline(toDateTimeLocal(task?.deadline ?? null));
    setColumnId(task?.columnId ?? defaultColumnId);
    setComments([]);
    setNewComment("");
    setPendingComments([]);
    setError(null);

    if (task) {
      apiClient<{ comments: TaskComment[] }>(
        `/api/projects/${projectId}/tasks/${task.id}/comments`,
      )
        .then((res) => setComments(res.comments))
        .catch(() => {});
    }
  }, [defaultColumnId, open, projectId, task]);

  React.useEffect(() => {
    if (!shouldShowDeadline && deadline) {
      setDeadline("");
    }
  }, [deadline, shouldShowDeadline]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      title,
      description,
      assigneeId,
      deadline: shouldShowDeadline ? toIso(deadline) : "",
      columnId,
    };

    const validation = task
      ? updateTaskSchema.safeParse(payload)
      : createTaskSchema.safeParse(payload);

    if (!validation.success) {
      const message = validation.error.issues[0]?.message || "Проверьте форму";
      setError(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = task
        ? `/api/projects/${projectId}/tasks/${task.id}`
        : `/api/projects/${projectId}/tasks`;
      const method = task ? "PATCH" : "POST";

      const response = await apiClient<{ task: BoardTask }>(endpoint, {
        method,
        body: JSON.stringify(validation.data),
      });

      const savedTaskId = response.task.id;

      // Send pending comments for new tasks
      if (!task && pendingComments.length > 0) {
        for (const content of pendingComments) {
          await apiClient(
            `/api/projects/${projectId}/tasks/${savedTaskId}/comments`,
            {
              method: "POST",
              body: JSON.stringify({ content }),
            },
          ).catch(() => {});
        }
      }

      onSaved(response.task);
      onOpenChange(false);
    } catch (err) {
      const message = getErrorMessage(err, "Не удалось сохранить задачу");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!task) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: "DELETE",
      });

      onDeleted(task.id);
      onOpenChange(false);
    } catch (err) {
      const message = getErrorMessage(err, "Не удалось удалить задачу");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendComment() {
    const content = newComment.trim();
    if (!content) return;

    if (task) {
      try {
        const res = await apiClient<{ comment: TaskComment }>(
          `/api/projects/${projectId}/tasks/${task.id}/comments`,
          {
            method: "POST",
            body: JSON.stringify({ content }),
          },
        );
        setComments((prev) => [...prev, res.comment]);
        setNewComment("");
      } catch (err) {
        toast.error(getErrorMessage(err, "Не удалось отправить комментарий"));
      }
    } else {
      setPendingComments((prev) => [...prev, content]);
      setNewComment("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? "Редактировать задачу" : "Создать задачу"}
          </DialogTitle>
          <DialogDescription>
            Исполнитель, дедлайн и описание редактируются в одном окне.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="text-sm font-medium">
              Название
            </label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Исправить ошибки в документах"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="task-description" className="text-sm font-medium">
              Описание
            </label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Критерии готовности, контекст, ссылки"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Колонка</p>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите колонку" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Исполнитель</p>
              <Select
                value={assigneeId || "none"}
                onValueChange={(value) =>
                  setAssigneeId(value === "none" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Без исполнителя" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без исполнителя</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {shouldShowDeadline && (
            <div className="space-y-1.5">
              <label htmlFor="task-deadline" className="text-sm font-medium">
                Дедлайн
              </label>
              <Input
                id="task-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Комментарии</p>
            {comments.length > 0 && (
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
                {comments.map((c) => (
                  <div key={c.id} className="space-y-0.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.authorName}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
            {!task && pendingComments.length > 0 && (
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
                {pendingComments.map((content, i) => (
                  <div key={i} className="text-sm text-muted-foreground">
                    {content}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Написать комментарий..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleSendComment}
                disabled={!newComment.trim()}
              >
                <SendHorizontalIcon className="size-4" />
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            {task && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                className="mr-auto gap-2"
                disabled={loading}
              >
                <Trash2Icon className="size-4" />
                Удалить
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Сохраняем..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
