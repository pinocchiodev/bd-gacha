"use client";
import { useState } from "react";
import { COMMANDS } from "@/lib/config";
import type { Coupon, GameState } from "@/lib/store";
import DrawModal from "./DrawModal";
import { sfx } from "./sound";

type Tab = "pending" | "done" | "all";

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function act(body: Record<string, unknown>) {
  const r = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export default function Hub({
  state,
  role,
  persistent,
  onState,
  onOpenLetter,
  onLogout,
}: {
  state: GameState;
  role: "zend" | "admin";
  persistent: boolean;
  onState: (s: GameState) => void;
  onOpenLetter: () => void;
  onLogout: () => void;
}) {
  const [drawing, setDrawing] = useState(false);
  const [tab, setTab] = useState<Tab>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const quota = state.quota ?? 0;
  const drawn = state.coupons.length;
  const remaining = Math.max(0, quota - drawn);
  const doneCount = state.coupons.filter((c) => c.done).length;
  const pendingCount = drawn - doneCount;

  const list = [...state.coupons]
    .reverse()
    .filter((c) => (tab === "all" ? true : tab === "done" ? c.done : !c.done));

  async function toggle(c: Coupon) {
    setBusyId(c.id);
    const res = await act({ action: c.done ? "undo" : "complete", id: c.id });
    setBusyId(null);
    if (res.ok) {
      if (!c.done) sfx.done();
      onState(res.state);
    }
  }

  async function saveNote(c: Coupon, note: string) {
    if ((c.note ?? "") === note) return;
    const res = await act({ action: "note", id: c.id, note });
    if (res.ok) onState(res.state);
  }

  async function reset() {
    if (!confirm("รีเซ็ตผลสุ่มทั้งหมด? (โควต้า + คูปองทั้งหมดจะหายไป)")) return;
    const res = await act({ action: "reset" });
    if (res.ok) onState(res.state);
  }

  return (
    <div className="screen" style={{ justifyContent: "flex-start" }}>
      <div className="container">
        <section className="panel hub-head">
          <span className="round-tag">ROUND 2 · COMMAND COUPONS</span>
          <div className="counter display">
            {remaining}
            <span className="slash"> / {quota}</span>
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>สิทธิ์สุ่มคำสั่งที่เหลือ</div>
          <div className="progress">
            <div style={{ width: `${quota ? (drawn / quota) * 100 : 0}%` }} />
          </div>
          <div className="stats">
            <span>สุ่มแล้ว <b>{drawn}</b></span>
            <span>รอทำ <b>{pendingCount}</b></span>
            <span>ทำให้แล้ว <b>{doneCount}</b></span>
          </div>
          <button
            className="btn btn-block draw-btn"
            disabled={remaining <= 0}
            onClick={() => {
              sfx.click();
              setDrawing(true);
            }}
          >
            {remaining > 0 ? "✦ สุ่มคำสั่ง 1 ใบ ✦" : "ใช้สิทธิ์ครบแล้ว ❤"}
          </button>
        </section>

        <div className="tabs" role="tablist">
          {(
            [
              ["pending", `รอทำ (${pendingCount})`],
              ["done", `ทำแล้ว (${doneCount})`],
              ["all", `ทั้งหมด (${drawn})`],
            ] as [Tab, string][]
          ).map(([k, label]) => (
            <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>

        <div className="coupons">
          {list.length === 0 && (
            <div className="empty">
              {drawn === 0
                ? "ยังไม่มีคูปองเลย — อยากให้ฉันทำอะไร กดสุ่มได้เลย!"
                : tab === "pending"
                  ? "ไม่มีคำสั่งค้าง ฉันทำครบหมดแล้วนะ ❤"
                  : "ยังไม่มีรายการ"}
            </div>
          )}
          {list.map((c) => {
            const cmd = COMMANDS.find((x) => x.id === c.commandId);
            if (!cmd) return null;
            return (
              <div key={c.id} className={`coupon rar-${c.rarity} ${c.done ? "done" : ""}`}>
                {c.done && <div className="stamp">DONE</div>}
                <div className="ic">{cmd.icon}</div>
                <div className="body">
                  <p className="title">
                    {cmd.title}
                    <span className={`chip rar-${c.rarity}`}>{c.rarity}</span>
                  </p>
                  <p className="detail">{cmd.detail}</p>
                  {cmd.wildcard && (
                    <textarea
                      className="note-input"
                      rows={2}
                      maxLength={200}
                      placeholder="เขียนคำขอของเธอที่นี่…"
                      defaultValue={c.note ?? ""}
                      disabled={c.done}
                      onBlur={(e) => saveNote(c, e.target.value)}
                    />
                  )}
                  <div className="meta">
                    <small>
                      สุ่มได้ {fmt(c.drawnAt)}
                      {c.done && ` · ทำแล้ว ${fmt(c.doneAt)}`}
                    </small>
                    <button
                      className={`btn btn-sm ${c.done ? "btn-ghost" : ""}`}
                      disabled={busyId === c.id}
                      onClick={() => toggle(c)}
                    >
                      {c.done ? "ยกเลิก" : "ทำให้แล้ว ✓"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="footer-links">
          <button className="btn btn-ghost btn-sm" onClick={onOpenLetter}>💌 อ่านจดหมายอีกครั้ง</button>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>ออกจากระบบ</button>
        </div>

        {role === "admin" && (
          <div className="admin-bar">
            <b>โหมดแอดมิน</b> — คุณกำลังดูในฐานะเจ้าของเว็บ ทุกอย่างที่กดจะมีผลจริงเหมือน Zend กด
            {!persistent && (
              <div className="warn">
                ⚠ ยังไม่ได้เชื่อม Redis — ผลสุ่มเก็บในหน่วยความจำชั่วคราว จะหายเมื่อ server รีสตาร์ท
              </div>
            )}
            <div className="row">
              <button className="btn btn-sm" onClick={reset}>รีเซ็ตผลสุ่มทั้งหมด</button>
            </div>
          </div>
        )}
      </div>

      {drawing && <DrawModal onClose={() => setDrawing(false)} onState={onState} />}
    </div>
  );
}
