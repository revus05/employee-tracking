import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Авторизация | Taskboard Pro",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(125deg,oklch(0.97_0.03_255)_0%,oklch(0.98_0.01_120)_42%,oklch(0.96_0.04_45)_100%)] p-4 dark:bg-[linear-gradient(125deg,oklch(0.23_0.03_260)_0%,oklch(0.2_0.02_160)_42%,oklch(0.24_0.04_40)_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,oklch(0.7_0.19_260/0.22),transparent_30%),radial-gradient(circle_at_85%_70%,oklch(0.76_0.19_35/0.16),transparent_35%)]" />
      <div className="relative w-full max-w-md">{children}</div>
    </main>
  );
}
