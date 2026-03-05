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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(125deg,oklch(0.975_0.01_154)_0%,oklch(0.988_0.004_150)_42%,oklch(0.968_0.012_145)_100%)] p-4 dark:bg-[linear-gradient(125deg,oklch(0.205_0.02_154)_0%,oklch(0.175_0.015_150)_42%,oklch(0.22_0.022_145)_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,oklch(0.43_0.08_154/0.17),transparent_32%),radial-gradient(circle_at_85%_70%,oklch(0.58_0.05_148/0.12),transparent_38%)] dark:bg-[radial-gradient(circle_at_15%_15%,oklch(0.64_0.06_154/0.12),transparent_34%),radial-gradient(circle_at_85%_70%,oklch(0.52_0.05_146/0.1),transparent_40%)]" />
      <div className="relative w-full max-w-md">{children}</div>
    </main>
  );
}
