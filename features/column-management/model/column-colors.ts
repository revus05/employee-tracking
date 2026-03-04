export const COLUMN_COLORS = [
  "slate",
  "zinc",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "fuchsia",
  "rose",
] as const;

export type ColumnColor = (typeof COLUMN_COLORS)[number];

export const COLUMN_COLOR_HEX: Record<ColumnColor, string> = {
  slate: "#64748b",
  zinc: "#71717a",
  stone: "#78716c",
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  lime: "#84cc16",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  fuchsia: "#d946ef",
  rose: "#f43f5e",
};

export function getColumnColorClasses(color: string) {
  const map: Record<string, string> = {
    slate:
      "bg-slate-500/15 text-slate-700 dark:text-slate-200 ring-slate-500/25",
    zinc: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-200 ring-zinc-500/25",
    stone:
      "bg-stone-500/15 text-stone-700 dark:text-stone-200 ring-stone-500/25",
    red: "bg-red-500/15 text-red-700 dark:text-red-200 ring-red-500/25",
    orange:
      "bg-orange-500/15 text-orange-700 dark:text-orange-200 ring-orange-500/25",
    amber:
      "bg-amber-500/15 text-amber-700 dark:text-amber-200 ring-amber-500/25",
    yellow:
      "bg-yellow-500/15 text-yellow-700 dark:text-yellow-200 ring-yellow-500/25",
    lime: "bg-lime-500/15 text-lime-700 dark:text-lime-200 ring-lime-500/25",
    green:
      "bg-green-500/15 text-green-700 dark:text-green-200 ring-green-500/25",
    emerald:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 ring-emerald-500/25",
    teal: "bg-teal-500/15 text-teal-700 dark:text-teal-200 ring-teal-500/25",
    cyan: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-200 ring-cyan-500/25",
    sky: "bg-sky-500/15 text-sky-700 dark:text-sky-200 ring-sky-500/25",
    blue: "bg-blue-500/15 text-blue-700 dark:text-blue-200 ring-blue-500/25",
    indigo:
      "bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 ring-indigo-500/25",
    violet:
      "bg-violet-500/15 text-violet-700 dark:text-violet-200 ring-violet-500/25",
    fuchsia:
      "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-200 ring-fuchsia-500/25",
    rose: "bg-rose-500/15 text-rose-700 dark:text-rose-200 ring-rose-500/25",
  };

  return map[color] ?? map.slate;
}
