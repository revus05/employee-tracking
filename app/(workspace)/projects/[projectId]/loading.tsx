import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectBoardLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid auto-cols-[320px] grid-flow-col gap-4 overflow-x-auto pb-2">
        <Skeleton className="h-[560px] w-80" />
        <Skeleton className="h-[560px] w-80" />
        <Skeleton className="h-[560px] w-80" />
      </div>
    </div>
  );
}
