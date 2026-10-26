"use client";
import { useEffect } from "react";
import type { GameState } from "@/lib/store";
import { commandRates, fmtPct, quotaRates, RARITY_NAME } from "@/lib/rates";

export default function RatesModal({ state, onClose }: { state: GameState | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const owned = new Map<string, number>();
  state?.coupons.forEach((c) => owned.set(c.commandId, (owned.get(c.commandId) ?? 0) + 1));
  const groups = commandRates();
  const totalCmds = groups.reduce((s, g) => s + g.items.length, 0);
  const collected = groups.reduce((s, g) => s + g.items.filter((i) => owned.has(i.id)).length, 0);

  return (
    <div className="overlay sheet-overlay" onClick={onClose}>
      <div className="panel sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="อัตราการออก">
        <div className="sheet-head">
          <div>
            <span className="round-tag">DROP RATES</span>
            <h2 className="display sheet-title">อัตราการออก</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="ปิด">✕</button>
        </div>

        <div className="sheet-body">
          <h3 className="rate-h">รอบที่ 1 · จำนวนครั้ง</h3>
          <div className="rate-quota">
            {quotaRates().map((t) => (
              <div
                key={t.value}
                className={`rate-quota-item rar-${t.rarity} ${state?.quota === t.value ? "is-mine" : ""}`}
              >
                <span className="chip">{t.rarity}</span>
                <b className="display">{t.value}</b>
                <small>ครั้ง</small>
                <span className="pct">{fmtPct(t.pct)}</span>
                {state?.quota === t.value && <span className="mine-tag">ได้อันนี้</span>}
              </div>
            ))}
          </div>

          <h3 className="rate-h">
            รอบที่ 2 · คำสั่ง
            {state && state.coupons.length > 0 && (
              <span className="collected">
                สะสมแล้ว {collected}/{totalCmds}
              </span>
            )}
          </h3>

          {groups.map((g) => (
            <section key={g.rarity} className={`rate-group rar-${g.rarity}`}>
              <div className="rate-group-head">
                <span className="chip">{g.rarity}</span>
                <span className="name">{RARITY_NAME[g.rarity]}</span>
                <span className="pct">รวม {fmtPct(g.tierPct)}</span>
              </div>
              <ul className="rate-list">
                {g.items.map((it) => {
                  const n = owned.get(it.id) ?? 0;
                  return (
                    <li key={it.id} className={n ? "got" : ""}>
                      <span className="ic">{it.icon}</span>
                      <span className="t">{it.title}</span>
                      {n > 0 && <span className="own">×{n}</span>}
                      <span className="p">{fmtPct(it.pct)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <p className="hint" style={{ marginBottom: 4 }}>
            ทุกคำสั่งในระดับเดียวกันมีโอกาสออกเท่ากัน · สุ่มซ้ำได้
          </p>
        </div>
      </div>
    </div>
  );
}
