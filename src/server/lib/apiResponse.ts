// src/server/lib/apiResponse.ts
import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "PAYLOAD_TOO_LARGE"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, { status: 200, ...init });
}

export function created<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, { status: 201, ...init });
}

export function fail(
  status: number,
  message: string,
  code: ApiErrorCode = "BAD_REQUEST",
  details?: unknown
) {
  return NextResponse.json(
    {
      success: false,
      error: { message, code, ...(details ? { details } : {}) },
    },
    { status }
  );
}
