import { LoginForm } from "@/features/auth/ui/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm redirectTo={params.next} />;
}
