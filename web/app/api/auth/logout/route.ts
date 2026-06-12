import { NextResponse } from "next/server";
import { clearSession } from "@/src/server/auth";

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
