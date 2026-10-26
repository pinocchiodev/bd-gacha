"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState } from "@/lib/store";
import Login from "@/components/Login";
import Letter from "@/components/Letter";
import QuotaRoll from "@/components/QuotaRoll";
import Hub from "@/components/Hub";
import { Embers } from "@/components/Fx";
import { isMuted, setMuted, sfx } from "@/components/sound";

type View = "loading" | "login" | "letter" | "quota" | "hub" | "reread";

export default function Home() {
  const [view, setView] = useState<View>("loading");
  const [state, setState] = useState<GameState | null>(null);
  const [role, setRole] = useState<"zend" | "admin">("zend");
  const [persistent, setPersistent] = useState(true);
  const [muted, setMutedState] = useState(false);
  const [hasMusic, setHasMusic] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const routeFor = (s: GameState): View => (!s.letterSeen ? "letter" : s.quota === null ? "quota" : "hub");

  const load = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (res.status === 401) {
      setView("login");
      return;
    }
    const data = await res.json();
    setState(data.state);
    setRole(data.role);
    setPersistent(data.persistent);
    setView(routeFor(data.state));
  }, []);

  useEffect(() => {
    setMutedState(isMuted());
    load();
    // เพลงพื้นหลัง: ใส่ไฟล์ public/music.mp3 แล้วปุ่มเพลงจะโผล่เอง
    fetch("/music.mp3", { method: "HEAD" })
      .then((r) => {
        if (r.ok) {
          const a = new Audio("/music.mp3");
          a.loop = true;
          a.volume = 0.35;
          audioRef.current = a;
          setHasMusic(true);
        }
      })
      .catch(() => {});
  }, [load]);

  function startMusic() {
    const a = audioRef.current;
    if (!a || musicOn) return;
    a.play().then(() => setMusicOn(true)).catch(() => {});
  }

  function toggleMusic() {
    const a = audioRef.current;
    if (!a) return;
    if (musicOn) {
      a.pause();
      setMusicOn(false);
    } else startMusic();
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    audioRef.current?.pause();
    setMusicOn(false);
    setState(null);
    setView("login");
  }

  async function letterDone() {
    if (state && !state.letterSeen) {
      const r = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "letter-seen" }),
      }).then((r) => r.json());
      if (r.ok) {
        setState(r.state);
        setView(routeFor(r.state));
        return;
      }
    }
    if (state) setView(routeFor(state));
  }

  return (
    <main>
      <Embers />

      {view !== "loading" && (
        <div className="topbar">
          {hasMusic && (
            <button className="icon-btn" onClick={toggleMusic} aria-label="เพลง" title="เพลงพื้นหลัง">
              {musicOn ? "♫" : "♪̸"}
            </button>
          )}
          <button
            className="icon-btn"
            aria-label="เสียงเอฟเฟกต์"
            title="เสียงเอฟเฟกต์"
            onClick={() => {
              setMuted(!muted);
              setMutedState(!muted);
              if (muted) sfx.click();
            }}
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      )}

      {view === "loading" && (
        <div className="screen">
          <div className="spinner" />
        </div>
      )}

      {view === "login" && (
        <Login
          onSuccess={() => {
            startMusic();
            load();
          }}
        />
      )}

      {view === "letter" && state && <Letter onContinue={letterDone} />}

      {view === "reread" && (
        <Letter startOpen continueLabel="← กลับไปหน้าคูปอง" onContinue={() => setView("hub")} />
      )}

      {view === "quota" && state && (
        <QuotaRoll state={state} onState={setState} onDone={() => setView("hub")} />
      )}

      {view === "hub" && state && (
        <Hub
          state={state}
          role={role}
          persistent={persistent}
          onState={setState}
          onOpenLetter={() => {
            window.scrollTo({ top: 0 });
            setView("reread");
          }}
          onLogout={logout}
        />
      )}
    </main>
  );
}
