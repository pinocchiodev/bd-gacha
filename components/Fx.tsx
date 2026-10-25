"use client";
import { useEffect, useMemo, useState } from "react";
import type { Rarity } from "@/lib/config";

export function Embers() {
  const [items, setItems] = useState<{ left: number; size: number; dur: number; delay: number; ch: string }[]>([]);
  useEffect(() => {
    const chars = ["♥", "•", "✦", "♥", "•"];
    setItems(
      Array.from({ length: 22 }, (_, i) => ({
        left: Math.random() * 100,
        size: 6 + Math.random() * 14,
        dur: 9 + Math.random() * 12,
        delay: -Math.random() * 20,
        ch: chars[i % chars.length],
      })),
    );
  }, []);
  return (
    <div className="embers" aria-hidden>
      {items.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={{
            left: `${e.left}%`,
            fontSize: e.size,
            animationDuration: `${e.dur}s`,
            animationDelay: `${e.delay}s`,
          }}
        >
          {e.ch}
        </span>
      ))}
    </div>
  );
}

const PALETTE: Record<Rarity | "party", string[]> = {
  R: ["#ff3b52", "#ff8a98", "#ffffff", "#b30d26"],
  SR: ["#dfe6f2", "#ffffff", "#ff3b52", "#9aa6bb"],
  SSR: ["#ffc94d", "#fff1c1", "#ff3b52", "#ffffff", "#e09b12"],
  party: ["#ff3b52", "#ffc94d", "#ffffff", "#b30d26", "#ff8a98"],
};

export function Confetti({ kind = "party", count = 120 }: { kind?: Rarity | "party"; count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        dur: 2.4 + Math.random() * 2.6,
        delay: Math.random() * 0.8,
        color: PALETTE[kind][Math.floor(Math.random() * PALETTE[kind].length)],
        rot: Math.random() * 360,
        round: Math.random() > 0.6,
      })),
    [kind, count],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rot}deg)`,
            borderRadius: p.round ? "50%" : 2,
          }}
        />
      ))}
    </div>
  );
}

export function Flash({ rarity }: { rarity: Rarity }) {
  const color =
    rarity === "SSR" ? "rgba(255, 210, 110, 0.95)" : rarity === "SR" ? "rgba(235, 240, 255, 0.85)" : "rgba(255, 60, 80, 0.7)";
  return <div className="flash" style={{ background: `radial-gradient(circle, ${color}, transparent 75%)` }} />;
}
