"use client";
import { useState } from "react";
import { SECRET } from "@/lib/config";
import type { GameState } from "@/lib/store";
import { gameAction } from "./api";
import { Confetti, Flash } from "./Fx";
import { sfx } from "./sound";

export default function SecretBox({ state, onState }: { state: GameState; onState: (s: GameState) => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [tries, setTries] = useState(0);

  if (state.secretFoundAt && !celebrate) {
    return <div className="secret-found">🥚 {SECRET.found}</div>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    sfx.unlock();
    setBusy(true);
    setMsg("");
    sfx.charge(0.7);
    const res = await gameAction({ action: "secret", code });
    setBusy(false);
    if (res.ok) {
      sfx.reveal("SSR");
      setCelebrate(true);
      onState(res.state);
      return;
    }
    if (res.wrong) {
      sfx.error();
      setMsg(SECRET.wrong[tries % SECRET.wrong.length]);
      setTries((t) => t + 1);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } else {
      setMsg(res.message || "เกิดข้อผิดพลาด");
    }
  }

  return (
    <>
      {!open ? (
        <button
          className="secret-teaser"
          onClick={() => {
            sfx.click();
            setOpen(true);
          }}
        >
          {SECRET.teaser}
        </button>
      ) : (
        <form className={`secret-box ${shake ? "shake" : ""}`} onSubmit={submit}>
          <p>{SECRET.prompt}</p>
          <div className="secret-row">
            <input
              inputMode="numeric"
              autoComplete="off"
              placeholder={SECRET.placeholder}
              value={code}
              maxLength={12}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
            <button className="btn btn-sm btn-gold" disabled={busy || !code.trim()}>
              {busy ? "…" : "ปลดล็อค"}
            </button>
          </div>
          <div className="secret-msg">{msg}</div>
        </form>
      )}

      {celebrate && (
        <div className="overlay" onClick={() => setCelebrate(false)}>
          <Flash rarity="SSR" />
          <Confetti kind="SSR" count={170} />
          <div className="secret-celebrate" onClick={(e) => e.stopPropagation()}>
            <span className="round-tag" style={{ color: "var(--SSR)", borderColor: "rgba(255,201,77,.5)" }}>
              EASTER EGG FOUND
            </span>
            <div className="secret-egg">🥚</div>
            <div className="display secret-plus">+{SECRET.bonus}</div>
            <h2 className="display" style={{ margin: "0 0 8px", fontSize: "2.2rem", color: "var(--SSR)" }}>
              SECRET BONUS
            </h2>
            <p style={{ margin: "0 0 22px", color: "#f1dfe2" }}>{SECRET.success}</p>
            <button className="btn btn-gold" onClick={() => setCelebrate(false)}>
              เย้! ❤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
