"use client";

import { CheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { InvitationView } from "@/entities/invitation/model/types";
import { apiClient, getErrorMessage } from "@/shared/api/client";

export function InvitationsList() {
  const [items, setItems] = React.useState<InvitationView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const loadInvitations = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient<{ invitations: InvitationView[] }>(
        "/api/invitations",
      );
      setItems(response.invitations);
    } catch (err) {
      const message = getErrorMessage(err, "Не удалось загрузить инвайты");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  async function handleAction(
    invitationId: string,
    action: "accept" | "decline",
  ) {
    setProcessingId(invitationId);
    setError(null);

    try {
      await apiClient(`/api/invitations/${invitationId}/${action}`, {
        method: "POST",
      });
      setItems((prev) => prev.filter((item) => item.id !== invitationId));
    } catch (err) {
      const message = getErrorMessage(err, "Не удалось обработать инвайт");
      setError(message);
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Нет активных приглашений</CardTitle>
            <CardDescription>
              Когда менеджер пригласит вас в проект, он появится здесь.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="text-base">{item.projectName}</CardTitle>
              <CardDescription>Пригласил: {item.inviterName}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Button
                className="gap-1"
                onClick={() => handleAction(item.id, "accept")}
                disabled={processingId === item.id}
              >
                <CheckIcon className="size-4" />
                Принять
              </Button>
              <Button
                variant="outline"
                className="gap-1"
                onClick={() => handleAction(item.id, "decline")}
                disabled={processingId === item.id}
              >
                <XIcon className="size-4" />
                Отклонить
              </Button>
              <Link
                href={`/projects/${item.projectId}`}
                className="ml-auto text-sm text-primary underline-offset-4 hover:underline"
              >
                Открыть проект
              </Link>
            </CardContent>
          </Card>
        ))
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
