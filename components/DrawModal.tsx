"use client";
import { useEffect, useRef, useState } from "react";
import { COMMANDS, type Rarity } from "@/lib/config";
import type { Coupon, GameState } from "@/lib/store";
import { Confetti, Flash } from "./Fx";
import { sfx } from "./sound";

const RARITY_TEXT: Record<Rarity, string> = { R: "R", SR: "SR", SSR: "SSR" };

export default function DrawModal({
  onClose,
  onState,
}: {
  onClose: () => void;
  onState: (s: GameState) => void;
}) {
  const [phase, setPhase] = useState<"ready" | "shaking" | "flipped" | "error">("ready");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [error, setError] = useState("");
  const started = useRef(false);

  async function draw() {
    if (started.current) return;
    started.current = true;
    sfx.unlock();
    setPhase("shaking");
    sfx.charge(1.6);
    const [res] = await Promise.all([
      fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draw" }),
      }).then((r) => r.json()),
      new Promise((r) => setTimeout(r, 1600)),
    ]);
    if (!res.ok) {
      setError(res.message || "เกิดข้อผิดพลาด");
      setPhase("error");
      sfx.error();
      return;
    }
    setCoupon(res.coupon);
    setPhase("flipped");
    sfx.reveal(res.coupon.rarity);
    onState(res.state);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && phase !== "shaking" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onClose]);

  const cmd = coupon ? COMMANDS.find((c) => c.id === coupon.commandId) : null;
  const rarity = coupon?.rarity;

  return (
    <div className="overlay">
      {phase === "flipped" && rarity && <Flash rarity={rarity} />}
      {phase === "flipped" && rarity && rarity !== "R" && <Confetti kind={rarity} count={rarity === "SSR" ? 160 : 80} />}

      <span className="round-tag" style={{ marginBottom: 18 }}>ROUND 2 · COMMAND DRAW</span>

      <div className="card-scene">
        {phase === "flipped" && rarity && <div className={`rays ${rarity}`} />}
        <div
          className={`card ${phase === "flipped" ? "flipped" : ""} ${phase === "shaking" ? "shaking" : ""}`}
          onClick={phase === "ready" ? draw : undefined}
          style={{ cursor: phase === "ready" ? "pointer" : "default" }}
        >
          <div className="face back">
            <div className="mark">❤</div>
            <div className="lbl display">COMMAND</div>
            <div className="shine" />
          </div>
          <div className={`face front rar-${rarity ?? "R"} ${rarity ? `glow-${rarity}` : ""}`}>
            {cmd && rarity && (
              <>
                <div className={`rar-label display rar-${rarity}`}>{RARITY_TEXT[rarity]}</div>
                <div className="big-ic">{cmd.icon}</div>
                <h3>{cmd.title}</h3>
                <p>{cmd.detail}</p>
                <div className="shine" />
              </>
            )}
          </div>
        </div>
      </div>

      {phase === "ready" && (
        <>
          <button className="btn draw-btn" onClick={draw}>แตะเพื่อเปิดการ์ด</button>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={onClose}>
            ยังไม่ใช้ตอนนี้
          </button>
        </>
      )}
      {phase === "shaking" && <p className="hint">กำลังสุ่มคำสั่ง…</p>}
      {phase === "flipped" && (
        <div className="fade-in" style={{ textAlign: "center" }}>
          <p className="hint" style={{ marginTop: 0, marginBottom: 14 }}>
            คูปองถูกเก็บไว้แล้ว — เอาไปยื่นให้ฉันได้เลย!
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={onClose}>รับคูปอง ❤</button>
          </div>
        </div>
      )}
      {phase === "error" && (
        <div style={{ textAlign: "center" }}>
          <div className="err">{error}</div>
          <button className="btn btn-ghost" onClick={onClose}>ปิด</button>
        </div>
      )}
    </div>
  );
}
