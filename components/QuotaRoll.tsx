"use client";
import { useRef, useState } from "react";
import { QUOTA_TIERS, type Rarity } from "@/lib/config";
import type { GameState } from "@/lib/store";
import { Confetti, Flash } from "./Fx";
import { sfx } from "./sound";
import { gameAction } from "./api";
import RatesModal from "./RatesModal";

type Phase = "idle" | "charging" | "spinning" | "revealed";

const RARITY_TEXT: Record<Rarity, string> = { R: "RARE", SR: "SUPER RARE", SSR: "SSR · LEGENDARY" };

export default function QuotaRoll({
  state,
  onDone,
  onState,
}: {
  state: GameState;
  onDone: () => void;
  onState: (s: GameState) => void;
}) {
  const alreadyRolled = useRef(state.quota !== null).current;
  const [phase, setPhase] = useState<Phase>(alreadyRolled ? "revealed" : "idle");
  const [display, setDisplay] = useState<number | string>(alreadyRolled ? state.quota! : "?");
  const [rarity, setRarity] = useState<Rarity | null>(state.quotaRarity);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const [showRates, setShowRates] = useState(false);

  async function summon() {
    if (busy.current) return;
    busy.current = true;
    setError("");
    sfx.unlock();
    setPhase("charging");
    sfx.charge(2);

    const [res] = await Promise.all([
      gameAction({ action: "roll" }),
      new Promise((r) => setTimeout(r, 2000)),
    ]);

    if (!res.ok) {
      // ถ้าสุ่มไปแล้ว (เช่น เปิดหลายแท็บ) ให้ดึงผลเดิม
      const st = await fetch("/api/state").then((r) => r.json());
      if (st.ok && st.state.quota !== null) {
        onState(st.state);
        setDisplay(st.state.quota);
        setRarity(st.state.quotaRarity);
        setPhase("revealed");
      } else {
        setError(res.message || "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
        setPhase("idle");
      }
      busy.current = false;
      return;
    }

    const final: number = res.state.quota;
    const finalRarity: Rarity = res.state.quotaRarity;
    setPhase("spinning");

    const values = QUOTA_TIERS.map((t) => t.value);
    const steps = 26;
    let i = 0;
    const run = () => {
      i++;
      if (i >= steps) {
        setDisplay(final);
        setRarity(finalRarity);
        setPhase("revealed");
        sfx.reveal(finalRarity);
        onState(res.state);
        busy.current = false;
        return;
      }
      setDisplay(values[i % values.length]);
      sfx.tick();
      const delay = 50 + Math.pow(i / steps, 3) * 380;
      setTimeout(run, delay);
    };
    run();
  }

  const tier = QUOTA_TIERS.find((t) => t.value === display);
  const justRevealed = phase === "revealed" && !alreadyRolled;

  return (
    <div className="screen">
      {justRevealed && rarity && <Flash rarity={rarity} />}
      {justRevealed && rarity && rarity !== "R" && <Confetti kind={rarity} count={rarity === "SSR" ? 160 : 90} />}

      <div className="container" style={{ textAlign: "center" }}>
        <span className="round-tag">ROUND 1 / 2</span>
        <h1 className="round-title display">QUOTA SUMMON</h1>
        <p className="round-desc">
          สุ่มจำนวนครั้งที่เธอจะ &ldquo;ใช้งานฉัน&rdquo; ได้
          <br />
          {QUOTA_TIERS.map((t) => `${t.value}`).join(" / ")} ครั้ง · สุ่มได้ครั้งเดียวเท่านั้น!
        </p>

        <div className={`stage ${phase === "charging" || phase === "spinning" ? "charging" : ""}`}>
          {phase === "revealed" && rarity && <div className={`rays ${rarity}`} />}
          <div className="ring" />
          <div className="ring r2" />
          <div className="ring r3" />
          <div
            className={`orb ${phase === "revealed" && rarity ? `glow-${rarity}` : ""}`}
            style={
              phase === "revealed" && rarity === "SSR"
                ? { background: "radial-gradient(circle at 35% 30%, #fff1c1, #ffc94d 40%, #7a4a00 85%)" }
                : phase === "revealed" && rarity === "SR"
                  ? { background: "radial-gradient(circle at 35% 30%, #ffffff, #c9d2e3 40%, #3a3f4c 85%)" }
                  : undefined
            }
          >
            <div className="reel display" style={phase === "revealed" && rarity !== "R" ? { color: "#1a0a00", textShadow: "none" } : undefined}>
              {display}
              {phase === "revealed" && <small>TIMES</small>}
            </div>
          </div>
        </div>

        {phase === "revealed" && rarity ? (
          <div className="fade-in">
            <div className={`result-badge rar-${rarity}`}>{RARITY_TEXT[rarity]}</div>
            <h2 style={{ margin: "14px 0 4px", fontWeight: 700 }}>
              {tier?.title ?? ""} ได้ {display} ครั้ง!
            </h2>
            <p className="round-desc">ต่อไป ทุกครั้งที่อยากใช้งาน ให้กดสุ่มคำสั่งทีละใบในรอบที่ 2</p>
            <button
              className="btn"
              onClick={() => {
                sfx.click();
                onDone();
              }}
            >
              ไปรอบที่ 2 →
            </button>
          </div>
        ) : (
          <>
            <button className="btn draw-btn" onClick={summon} disabled={phase !== "idle"}>
              {phase === "idle" ? "✦ SUMMON ✦" : "กำลังสุ่ม…"}
            </button>
            {error && <div className="err" style={{ marginTop: 12 }}>{error}</div>}
            {phase === "idle" && (
              <div>
                <button className="link-btn" onClick={() => setShowRates(true)}>
                  📜 ดูอัตราการออก
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {showRates && <RatesModal state={state} onClose={() => setShowRates(false)} />}
    </div>
  );
}
