import { NextResponse } from "next/server";
import type { ApiErrorCode } from "@/src/shared/types";

export function apiError(code: ApiErrorCode, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "未知错误";
}
