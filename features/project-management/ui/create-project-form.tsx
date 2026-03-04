"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { createProjectSchema } from "@/entities/project/model/schemas";
import { apiClient, getErrorMessage } from "@/shared/api/client";

type CreateProjectFormProps = {
  onCreated?: (projectId: string) => void;
};

export function CreateProjectForm({ onCreated }: CreateProjectFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = createProjectSchema.safeParse({ name, description });
    if (!validation.success) {
      const message = validation.error.issues[0]?.message || "Проверьте форму";
      setError(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient<{ project: { id: string } }>(
        "/api/projects",
        {
          method: "POST",
          body: JSON.stringify(validation.data),
        },
      );

      setName("");
      setDescription("");
      setOpen(false);
      router.refresh();
      onCreated?.(response.project.id);
    } catch (err) {
      const message = getErrorMessage(err, "Не удалось создать проект");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex h-full min-h-44 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-card/30 px-4 py-6 text-center transition hover:border-primary/40 hover:bg-card/60"
        >
          <div className="flex size-9 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground transition group-hover:text-primary">
            <PlusIcon className="size-4" />
          </div>
          <div className="font-medium">Добавить проект</div>
          <p className="text-xs text-muted-foreground">
            Создайте новую доску для команды
          </p>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[min(32rem,calc(100vw-2rem))] space-y-3"
      >
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Новый проект</h3>
          <p className="text-xs text-muted-foreground">
            Название и короткое описание как в Jira-проектах
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Название</p>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например: Payment Platform"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Описание</p>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Что делает проект и какой scope"
              className="min-h-20"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <PlusIcon className="size-4" />
              {loading ? "Создание..." : "Создать проект"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
