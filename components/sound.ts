"use client";
// เสียงประกอบทั้งหมดสังเคราะห์ด้วย Web Audio API (ไม่ต้องมีไฟล์เสียง)
import type { Rarity } from "@/lib/config";

let ctx: AudioContext | null = null;
let muted = false;

try {
  muted = typeof window !== "undefined" && localStorage.getItem("zend-muted") === "1";
} catch {}

export function isMuted() {
  return muted;
}
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem("zend-muted", m ? "1" : "0");
  } catch {}
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.15) {
  const a = ac();
  if (!a || muted) return;
  const t0 = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function sweep(from: number, to: number, dur: number, type: OscillatorType = "sawtooth", vol = 0.06) {
  const a = ac();
  if (!a || muted) return;
  const t0 = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(800, t0);
  f.frequency.exponentialRampToValueAtTime(4000, t0 + dur);
  o.type = type;
  o.frequency.setValueAtTime(from, t0);
  o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.1);
  o.connect(f).connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.2);
}

export const sfx = {
  unlock() {
    ac();
  },
  click() {
    tone(660, 0, 0.08, "triangle", 0.1);
  },
  tick() {
    tone(1200, 0, 0.04, "square", 0.04);
  },
  error() {
    tone(220, 0, 0.15, "sawtooth", 0.08);
    tone(180, 0.12, 0.2, "sawtooth", 0.08);
  },
  login() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.35, "triangle", 0.12));
  },
  charge(dur = 1.8) {
    sweep(110, 880, dur);
  },
  reveal(r: Rarity) {
    if (r === "R") {
      [784, 988, 1175].forEach((f, i) => tone(f, i * 0.07, 0.5, "triangle", 0.12));
    } else if (r === "SR") {
      [659, 784, 988, 1319, 1568].forEach((f, i) => tone(f, i * 0.07, 0.7, "triangle", 0.12));
      tone(330, 0, 0.9, "sine", 0.1);
    } else {
      // SSR fanfare
      const notes = [523, 659, 784, 1047, 784, 1047, 1319, 1568, 2093];
      notes.forEach((f, i) => tone(f, i * 0.085, 0.6, "triangle", 0.13));
      [262, 330, 392].forEach((f) => tone(f, 0.7, 1.6, "sine", 0.09));
      [1568, 2093, 2637].forEach((f, i) => tone(f, 0.85 + i * 0.05, 1.2, "sine", 0.05));
    }
  },
  done() {
    tone(880, 0, 0.12, "triangle", 0.12);
    tone(1320, 0.08, 0.25, "triangle", 0.12);
  },
};
