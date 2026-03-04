import { Skeleton } from "@/components/ui/skeleton";

export default function InvitationsLoading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
