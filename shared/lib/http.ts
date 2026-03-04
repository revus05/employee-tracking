import { NextResponse } from "next/server";

export type ApiErrorPayload = {
  error: string;
  details?: unknown;
};

export function jsonError(error: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiErrorPayload>({ error, details }, { status });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
