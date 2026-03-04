import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

type AppIconProps = LucideProps & {
  icon: LucideIcon;
};

export function AppIcon({ icon: Icon, className, ...props }: AppIconProps) {
  return (
    <Icon
      className={cn("size-4 text-muted-foreground", className)}
      strokeWidth={1.9}
      {...props}
    />
  );
}
