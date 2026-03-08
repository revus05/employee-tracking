"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isAfter } from "date-fns";
import {
  AlertCircleIcon,
  CalendarIcon,
  GripVerticalIcon,
  UserIcon,
} from "lucide-react";
import type { BoardTask } from "@/entities/task/model/types";
import { cn } from "@/lib/utils";

type BaseTaskCardProps = {
  task: BoardTask;
  hideDeadline?: boolean;
};

type TaskCardProps = BaseTaskCardProps & {
  onEdit: (task: BoardTask) => void;
};

function TaskCardBody({
  task,
  hideDeadline = false,
  dragging,
}: BaseTaskCardProps & { dragging?: boolean }) {
  const isOverdue = task.deadline
    ? isAfter(new Date(), new Date(task.deadline))
    : false;

  return (
    <>
      <div className="flex items-start gap-2">
        <GripVerticalIcon
          className={cn(
            "mt-0.5 size-3.5 shrink-0 text-muted-foreground/70",
            dragging && "text-primary",
          )}
        />
        <div className="text-sm font-medium leading-tight">{task.title}</div>
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {task.description}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {task.assigneeName && (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5">
            <UserIcon className="size-3" />
            {task.assigneeName}
          </span>
        )}

        {!hideDeadline && task.deadline && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5",
              isOverdue && "bg-destructive/10 text-destructive",
            )}
          >
            {isOverdue ? (
              <AlertCircleIcon className="size-3" />
            ) : (
              <CalendarIcon className="size-3" />
            )}
            {new Date(task.deadline).toLocaleString()}
          </span>
        )}
      </div>
    </>
  );
}

export function TaskCard({ task, hideDeadline, onEdit }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      className={cn(
        "w-full touch-none cursor-grab rounded-lg border bg-background p-3 text-left shadow-xs transition hover:border-primary/40 hover:shadow-sm active:cursor-grabbing",
        isDragging && "opacity-15",
      )}
      onClick={() => {
        if (!isDragging) {
          onEdit(task);
        }
      }}
      {...attributes}
      {...listeners}
    >
      <TaskCardBody
        task={task}
        hideDeadline={hideDeadline}
        dragging={isDragging}
      />
    </button>
  );
}

export function TaskCardPreview({ task, hideDeadline }: BaseTaskCardProps) {
  return (
    <div className="w-80 max-w-[calc(100vw-3rem)] -rotate-2 cursor-grabbing rounded-lg border bg-background p-3 text-left shadow-lg ring-1 ring-primary/25">
      <TaskCardBody task={task} hideDeadline={hideDeadline} dragging />
    </div>
  );
}
