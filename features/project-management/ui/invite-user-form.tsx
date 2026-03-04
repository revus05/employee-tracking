"use client";

import { SearchIcon, SendHorizontalIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient, getErrorMessage } from "@/shared/api/client";

type SearchUser = {
  id: string;
  email: string;
  username: string;
  role: "MANAGER" | "DEVELOPER";
};

type InviteUserFormProps = {
  projectId: string;
  inPopover?: boolean;
};

export function InviteUserForm({
  projectId,
  inPopover = false,
}: InviteUserFormProps) {
  const [query, setQuery] = React.useState("");
  const [users, setUsers] = React.useState<SearchUser[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const searchErrorToastShownRef = React.useRef(false);

  React.useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.trim().length < 2) {
        setUsers([]);
        setSelectedId("");
        searchErrorToastShownRef.current = false;
        return;
      }

      try {
        const response = await apiClient<{ users: SearchUser[] }>(
          `/api/users/search?query=${encodeURIComponent(query)}&projectId=${projectId}`,
        );
        setUsers(response.users);
        setError(null);
        searchErrorToastShownRef.current = false;
        if (!response.users.some((user) => user.id === selectedId)) {
          setSelectedId("");
        }
      } catch (err) {
        setUsers([]);
        const message = getErrorMessage(err, "Не удалось выполнить поиск");
        setError(message);
        if (!searchErrorToastShownRef.current) {
          toast.error(message);
          searchErrorToastShownRef.current = true;
        }
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [projectId, query, selectedId]);

  async function onInvite() {
    if (!selectedId) {
      const message = "Выберите пользователя из списка";
      setError(message);
      toast.error(message);
      return;
    }

    setSending(true);
    setError(null);
    setMessage(null);

    try {
      await apiClient(`/api/projects/${projectId}/invitations`, {
        method: "POST",
        body: JSON.stringify({ inviteeId: selectedId }),
      });

      setMessage("Инвайт отправлен");
      setQuery("");
      setUsers([]);
      setSelectedId("");
    } catch (err) {
      const message = getErrorMessage(err, "Не удалось отправить инвайт");
      setError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className={
        inPopover ? "space-y-2" : "space-y-2 rounded-xl border bg-card/70 p-4"
      }
    >
      <div className="text-sm font-medium">Пригласить в проект</div>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по email или username"
          className="pl-8"
        />
      </div>

      <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-1">
        {users.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </div>
        ) : (
          users.map((user) => (
            <button
              key={user.id}
              type="button"
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                selectedId === user.id ? "bg-primary/10" : "hover:bg-muted"
              }`}
              onClick={() => setSelectedId(user.id)}
            >
              <div>
                <div className="font-medium">{user.username}</div>
                <div className="text-xs text-muted-foreground">
                  {user.email}
                </div>
              </div>
              <Badge variant="outline">
                {user.role === "MANAGER" ? "Manager" : "Dev"}
              </Badge>
            </button>
          ))
        )}
      </div>

      <Button
        type="button"
        className="w-full gap-2"
        onClick={onInvite}
        disabled={sending || !selectedId}
      >
        <SendHorizontalIcon className="size-4" />
        {sending ? "Отправляем..." : "Отправить инвайт"}
      </Button>

      {message && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {message}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
