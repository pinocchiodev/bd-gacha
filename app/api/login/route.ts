import { NextResponse } from "next/server";
import { checkCredentials, setSession } from "@/lib/auth";
import { isAccessUnlocked } from "@/lib/countdown";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isAccessUnlocked()) {
    return NextResponse.json({ ok: false, locked: true }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const role = checkCredentials(String(body.username ?? ""), String(body.password ?? ""));
  if (!role) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await setSession(role);
  return NextResponse.json({ ok: true, role });
}
