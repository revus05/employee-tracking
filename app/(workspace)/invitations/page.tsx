import { InvitationsList } from "@/features/project-management/ui/invitations-list";

export default function InvitationsPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Приглашения</h1>
        <p className="text-sm text-muted-foreground">
          Список активных инвайтов в проекты
        </p>
      </div>
      <InvitationsList />
    </section>
  );
}
