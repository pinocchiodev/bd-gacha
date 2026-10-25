import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { isAccessUnlocked } from "@/lib/countdown";
import { getState, hasPersistentStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAccessUnlocked()) {
    return NextResponse.json({ ok: false, locked: true }, { status: 403 });
  }
  const role = await getRole();
  if (!role) return NextResponse.json({ ok: false }, { status: 401 });
  const state = await getState();
  return NextResponse.json({ ok: true, role, state, persistent: hasPersistentStore });
}
