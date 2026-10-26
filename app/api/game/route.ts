import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getRole } from "@/lib/auth";
import { EMPTY_STATE, getState, setState, withLock, type GameState } from "@/lib/store";
import { drawCommand, rollQuota } from "@/lib/gacha";
import { COMMANDS, SECRET } from "@/lib/config";
import { totalQuota } from "@/lib/quota";
import { safeEqual } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function err(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(req: Request) {
  const role = await getRole();
  if (!role) return err("unauthorized", 401);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  // หน่วงนิดนึง: กันเดารหัสลับรัวๆ และเพิ่มความลุ้น
  if (action === "secret") await new Promise((r) => setTimeout(r, 700));

  const result = await withLock(async () => {
    const s: GameState = await getState();
    const now = new Date().toISOString();

    switch (action) {
      case "letter-seen": {
        s.letterSeen = true;
        await setState(s);
        return NextResponse.json({ ok: true, state: s });
      }

      case "roll": {
        if (s.quota !== null) return err("สุ่มรอบแรกไปแล้ว");
        const tier = rollQuota();
        s.quota = tier.value;
        s.quotaRarity = tier.rarity;
        s.quotaRolledAt = now;
        await setState(s);
        return NextResponse.json({ ok: true, state: s, tier });
      }

      case "draw": {
        if (s.quota === null) return err("ต้องสุ่มรอบแรกก่อน");
        if (s.coupons.length >= totalQuota(s)) return err("โควต้าหมดแล้ว");
        const cmd = drawCommand();
        const coupon = {
          id: randomUUID(),
          commandId: cmd.id,
          rarity: cmd.rarity,
          drawnAt: now,
          done: false,
        };
        s.coupons.push(coupon);
        await setState(s);
        return NextResponse.json({ ok: true, state: s, coupon });
      }

      case "complete":
      case "undo": {
        const c = s.coupons.find((x) => x.id === body.id);
        if (!c) return err("ไม่พบคูปอง", 404);
        c.done = action === "complete";
        c.doneAt = c.done ? now : undefined;
        await setState(s);
        return NextResponse.json({ ok: true, state: s });
      }

      case "note": {
        const c = s.coupons.find((x) => x.id === body.id);
        if (!c) return err("ไม่พบคูปอง", 404);
        const cmd = COMMANDS.find((x) => x.id === c.commandId);
        if (!cmd?.wildcard) return err("คูปองนี้เขียนคำขอไม่ได้");
        c.note = String(body.note ?? "").slice(0, 200);
        await setState(s);
        return NextResponse.json({ ok: true, state: s });
      }

      case "secret": {
        const expected = (process.env.ANNIVERSARY_CODE || "").replace(/[\s/.\-]/g, "");
        if (!expected) return err("ยังไม่ได้ตั้งรหัสลับ", 404);
        if (s.quota === null) return err("ต้องสุ่มรอบแรกก่อน");
        if (s.secretFoundAt) return err("เจอ Easter Egg ไปแล้ว");
        const code = String(body.code ?? "").replace(/[\s/.\-]/g, "");
        if (!code || !safeEqual(code, expected)) {
          return NextResponse.json({ ok: false, wrong: true });
        }
        s.bonusQuota = (s.bonusQuota ?? 0) + SECRET.bonus;
        s.secretFoundAt = now;
        await setState(s);
        return NextResponse.json({ ok: true, state: s });
      }

      case "reset": {
        if (role !== "admin") return err("forbidden", 403);
        const fresh = { ...EMPTY_STATE, coupons: [] };
        await setState(fresh);
        return NextResponse.json({ ok: true, state: fresh });
      }

      default:
        return err("unknown action");
    }
  });

  if (result === "LOCKED") return err("กำลังประมวลผล ลองใหม่อีกครั้ง", 429);
  return result;
}
