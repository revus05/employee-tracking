import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/shared/lib/auth/session";

function getNextUrl(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next");

  if (next?.startsWith("/")) {
    return new URL(next, request.url);
  }

  return new URL("/login", request.url);
}

export async function GET(request: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(getNextUrl(request));
}

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
