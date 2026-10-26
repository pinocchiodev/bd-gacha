"use client";
// วาดรูป IG Story (1080x1920) และหน้า PDF (A4) ด้วย Canvas — ทำงานฝั่ง browser ทั้งหมด
import { BOYFRIEND_NAME, COMMANDS, FROM_NAME, QUOTA_TIERS, type Command, type Rarity } from "@/lib/config";
import type { Coupon, GameState } from "@/lib/store";
import { RARITY_COLOR, RARITY_NAME, RARITY_ORDER } from "@/lib/rates";

const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';
const THAI = (w: number, px: number) => `${w} ${px}px "Prompt", ${EMOJI}, sans-serif`;
const DISP = (px: number) => `400 ${px}px "Bebas Neue", "Prompt", sans-serif`;

const BG = "#07030a";
const RED = "#e5112d";
const MUTED = "#b8a1a6";

type Row = { coupon: Coupon; cmd: Command; count: number };

// ---------------------------------------------------------------- helpers
export async function ensureFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  const sample = "กขคภาษาไทย ABC 0123";
  await Promise.all(
    [
      ...[300, 400, 500, 600, 700, 800].map((w) => `${w} 40px "Prompt"`),
      `400 40px "Bebas Neue"`,
    ].map((f) => document.fonts.load(f, sample).catch(() => null)),
  );
  await document.fonts.ready;
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) (ctx as any).letterSpacing = `${px}px`;
}

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new (Intl as any).Segmenter("th", { granularity: "word" })
    : null;

function tokens(text: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(text), (s: any) => s.segment as string);
  return Array.from(text);
}

/** ตัดบรรทัดภาษาไทยตามคำ ถ้าเกิน maxLines ใส่ … */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines = 99): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const tk of tokens(text)) {
    const next = cur + tk;
    if (ctx.measureText(next).width <= maxW || cur === "") {
      cur = next;
    } else {
      lines.push(cur.trimEnd());
      cur = tk.trimStart();
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last && ctx.measureText(last + "…").width > maxW) last = Array.from(last).slice(0, -1).join("");
    kept[maxLines - 1] = last + "…";
    return kept;
  }
  return lines;
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  return wrap(ctx, text, maxW, 1)[0] ?? "";
}

function fmtDate(iso?: string | null, withTime = false) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function sortedRows(state: GameState): Row[] {
  const rank = (r: Rarity) => RARITY_ORDER.indexOf(r);
  return state.coupons
    .map((c) => ({ coupon: c, cmd: COMMANDS.find((x) => x.id === c.commandId)!, count: 1 }))
    .filter((r) => r.cmd)
    .sort((a, b) => rank(a.coupon.rarity) - rank(b.coupon.rarity) || a.coupon.drawnAt.localeCompare(b.coupon.drawnAt));
}

/** รวมคำสั่งซ้ำเป็นบรรทัดเดียว (ใช้เมื่อรายการยาวเกินพื้นที่ story) */
function groupedRows(rows: Row[]): Row[] {
  const map = new Map<string, Row>();
  for (const r of rows) {
    const g = map.get(r.cmd.id);
    if (g) g.count++;
    else map.set(r.cmd.id, { ...r });
  }
  return [...map.values()];
}

function counts(state: GameState) {
  const c: Record<Rarity, number> = { R: 0, SR: 0, SSR: 0 };
  state.coupons.forEach((x) => c[x.rarity]++);
  return c;
}

function paintBackground(ctx: CanvasRenderingContext2D, w: number, h: number, seed = 7) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  let g = ctx.createRadialGradient(w / 2, -h * 0.05, 0, w / 2, -h * 0.05, h * 0.75);
  g.addColorStop(0, "rgba(229,17,45,0.55)");
  g.addColorStop(1, "rgba(229,17,45,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  g = ctx.createRadialGradient(w, h, 0, w, h, h * 0.55);
  g.addColorStop(0, "rgba(122,7,22,0.55)");
  g.addColorStop(1, "rgba(122,7,22,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // หัวใจลอยๆ (สุ่มแบบคงที่)
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < 26; i++) {
    const size = 14 + rnd() * 34;
    ctx.globalAlpha = 0.08 + rnd() * 0.18;
    ctx.fillStyle = RED;
    ctx.font = `${size}px sans-serif`;
    ctx.fillText(rnd() > 0.35 ? "♥" : "✦", rnd() * w, rnd() * h);
  }
  ctx.globalAlpha = 1;
}

function chip(ctx: CanvasRenderingContext2D, label: string, color: string, xRight: number, yMid: number, px: number) {
  ctx.font = THAI(700, px);
  setSpacing(ctx, px * 0.08);
  const tw = ctx.measureText(label).width;
  const padX = px * 0.55;
  const h = px * 1.55;
  const w = tw + padX * 2;
  rrect(ctx, xRight - w, yMid - h / 2, w, h, h * 0.28);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, px * 0.09);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, xRight - w / 2, yMid + px * 0.04);
  setSpacing(ctx, 0);
  return w;
}

function check(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.45, cy + r * 0.02);
  ctx.lineTo(cx - r * 0.1, cy + r * 0.38);
  ctx.lineTo(cx + r * 0.48, cy - r * 0.35);
  ctx.stroke();
}

// ---------------------------------------------------------------- IG story
export async function renderStory(state: GameState): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const W = 1080;
  const H = 1920;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  paintBackground(ctx, W, H);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // header
  ctx.font = DISP(46);
  setSpacing(ctx, 14);
  ctx.fillStyle = "#ff4d63";
  ctx.fillText("BIRTHDAY GACHA RESULT", W / 2 + 7, 168);
  setSpacing(ctx, 6);

  ctx.save();
  ctx.shadowColor = "rgba(229,17,45,0.9)";
  ctx.shadowBlur = 50;
  const grad = ctx.createLinearGradient(0, 180, 0, 400);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.55, "#ffc2ca");
  grad.addColorStop(1, "#ff2d4a");
  ctx.fillStyle = grad;
  ctx.font = DISP(250);
  ctx.fillText(BOYFRIEND_NAME.toUpperCase(), W / 2 + 3, 395);
  ctx.restore();
  setSpacing(ctx, 0);

  ctx.font = THAI(500, 38);
  ctx.fillStyle = "#f1dfe2";
  ctx.fillText("สุขสันต์วันเกิด ♥ คูปองทั้งหมดที่สุ่มได้", W / 2, 470);

  // quota card
  const qx = 70, qy = 520, qw = W - 140, qh = 190;
  const qRarity = (state.quotaRarity ?? "R") as Rarity;
  const qColor = RARITY_COLOR[qRarity];
  rrect(ctx, qx, qy, qw, qh, 28);
  ctx.fillStyle = "rgba(28,8,12,0.82)";
  ctx.fill();
  ctx.strokeStyle = qRarity === "SSR" ? "rgba(255,201,77,0.6)" : "rgba(255,60,80,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = THAI(500, 26);
  ctx.fillStyle = MUTED;
  ctx.fillText("โควต้ารอบที่ 1", qx + 44, qy + 62);
  ctx.font = DISP(120);
  ctx.fillStyle = "#fff";
  ctx.fillText(String(state.quota ?? 0), qx + 40, qy + 162);
  const numW = ctx.measureText(String(state.quota ?? 0)).width;
  ctx.font = THAI(600, 34);
  ctx.fillStyle = "#f1dfe2";
  ctx.fillText("ครั้ง", qx + 52 + numW, qy + 158);
  if (state.bonusQuota > 0) {
    const kw = ctx.measureText("ครั้ง").width;
    ctx.font = THAI(700, 30);
    ctx.fillStyle = RARITY_COLOR.SSR;
    ctx.fillText(`+${state.bonusQuota} 🥚 bonus`, qx + 52 + numW + kw + 18, qy + 158);
  }

  chip(ctx, RARITY_NAME[qRarity].toUpperCase(), qColor, qx + qw - 40, qy + 62, 24);

  const c = counts(state);
  const done = state.coupons.filter((x) => x.done).length;
  ctx.textAlign = "right";
  ctx.font = THAI(500, 28);
  let sx = qx + qw - 40;
  const stat = (label: string, color: string) => {
    ctx.fillStyle = color;
    ctx.fillText(label, sx, qy + 150);
    sx -= ctx.measureText(label).width + 26;
  };
  stat(`R ${c.R}`, RARITY_COLOR.R);
  stat(`SR ${c.SR}`, RARITY_COLOR.SR);
  stat(`SSR ${c.SSR}`, RARITY_COLOR.SSR);
  ctx.font = THAI(400, 24);
  ctx.fillStyle = MUTED;
  ctx.fillText(`ใช้แล้ว ${done}/${state.coupons.length}`, qx + qw - 40, qy + 108);

  // coupon list
  let rows = sortedRows(state);
  if (rows.length > 22) rows = groupedRows(rows);
  const top = 760;
  const bottom = 1745;
  const n = Math.max(rows.length, 1);
  const slot = Math.min(104, (bottom - top) / n);
  const gap = Math.max(6, slot * 0.12);
  const rh = slot - gap;
  const titlePx = Math.max(20, Math.min(34, rh * 0.38));
  const iconPx = Math.max(22, Math.min(46, rh * 0.52));
  const chipPx = Math.max(15, Math.min(22, rh * 0.24));

  rows.forEach((r, i) => {
    const y = top + i * slot;
    const col = RARITY_COLOR[r.coupon.rarity];
    rrect(ctx, 70, y, W - 140, rh, Math.min(20, rh * 0.3));
    ctx.fillStyle = r.coupon.rarity === "SSR" ? "rgba(70,42,8,0.85)" : "rgba(36,9,14,0.88)";
    ctx.fill();
    ctx.strokeStyle = r.coupon.rarity === "SSR" ? "rgba(255,201,77,0.45)" : "rgba(255,60,80,0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.save();
    rrect(ctx, 70, y, W - 140, rh, Math.min(20, rh * 0.3));
    ctx.clip();
    ctx.fillStyle = col;
    ctx.fillRect(70, y, 8, rh);
    ctx.restore();

    const mid = y + rh / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${iconPx}px ${EMOJI}, sans-serif`;
    ctx.fillText(r.cmd.icon, 70 + 30 + iconPx * 0.6, mid + 2);

    let right = W - 70 - 26;
    const cw = chip(ctx, r.coupon.rarity, col, right, mid, chipPx);
    right -= cw + 16;
    if (r.count === 1 && r.coupon.done) {
      const cr = Math.min(18, rh * 0.22);
      check(ctx, right - cr, mid, cr);
      right -= cr * 2 + 14;
    }
    if (r.count > 1) {
      ctx.font = THAI(700, titlePx * 0.85);
      ctx.textAlign = "right";
      ctx.fillStyle = col;
      ctx.fillText(`×${r.count}`, right, mid + 1);
      right -= ctx.measureText(`×${r.count}`).width + 14;
    }

    const tx = 70 + 30 + iconPx * 1.2 + 18;
    ctx.textAlign = "left";
    ctx.font = THAI(600, titlePx);
    ctx.fillStyle = r.count === 1 && r.coupon.done ? "#cdb8bd" : "#fff";
    ctx.fillText(fit(ctx, r.cmd.title, right - tx), tx, mid + 1);
  });

  // footer
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  ctx.font = THAI(600, 34);
  ctx.fillStyle = "#ff4d63";
  ctx.fillText(`with love, ${FROM_NAME} ♥`, W / 2, 1830);
  ctx.font = THAI(400, 22);
  ctx.fillStyle = MUTED;
  ctx.fillText(fmtDate(state.quotaRolledAt ?? new Date().toISOString()), W / 2, 1872);

  return cv;
}

// ---------------------------------------------------------------- PDF (A4 @150dpi)
const PW = 1240;
const PH = 1754;
const M = 80;

type Laid = { row: Row; h: number; detail: string[]; note: string[] };

export async function renderPdfPages(state: GameState): Promise<HTMLCanvasElement[]> {
  await ensureFonts();
  const rows = sortedRows(state);
  const measure = document.createElement("canvas").getContext("2d")!;
  const cardW = PW - M * 2;
  const textW = cardW - 150 - 40;

  const laid: Laid[] = rows.map((row) => {
    measure.font = THAI(300, 24);
    const detail = wrap(measure, row.cmd.detail, textW, 2);
    const note = row.coupon.note ? wrap(measure, `คำขอ: “${row.coupon.note}”`, textW, 3) : [];
    const h = 30 + 40 + detail.length * 34 + (note.length ? 8 + note.length * 34 : 0) + 14 + 30 + 26;
    return { row, h, detail, note };
  });

  // แบ่งหน้า
  const FIRST_TOP = 640;
  const TOP = 150;
  const BOTTOM = PH - 120;
  const GAP = 18;
  const pages: { items: { l: Laid; y: number }[] }[] = [{ items: [] }];
  let y = FIRST_TOP;
  for (const l of laid) {
    if (y + l.h > BOTTOM) {
      pages.push({ items: [] });
      y = TOP;
    }
    pages[pages.length - 1].items.push({ l, y });
    y += l.h + GAP;
  }

  const c = counts(state);
  const done = state.coupons.filter((x) => x.done).length;
  const qTier = QUOTA_TIERS.find((t) => t.value === state.quota);

  return pages.map((page, pi) => {
    const cv = document.createElement("canvas");
    cv.width = PW;
    cv.height = PH;
    const ctx = cv.getContext("2d")!;
    paintBackground(ctx, PW, PH, 11 + pi);

    if (pi === 0) {
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = DISP(40);
      setSpacing(ctx, 12);
      ctx.fillStyle = "#ff4d63";
      ctx.fillText("BIRTHDAY GACHA · COUPON BOOK", PW / 2 + 6, 150);
      setSpacing(ctx, 4);
      ctx.save();
      ctx.shadowColor = "rgba(229,17,45,0.85)";
      ctx.shadowBlur = 40;
      ctx.fillStyle = "#fff";
      const heading = `HAPPY BIRTHDAY, ${BOYFRIEND_NAME.toUpperCase()}`;
      let size = 170;
      ctx.font = DISP(size);
      while (ctx.measureText(heading).width > PW - M * 2 && size > 60) {
        size -= 4;
        ctx.font = DISP(size);
      }
      ctx.fillText(heading, PW / 2, 320);
      ctx.restore();
      setSpacing(ctx, 0);
      ctx.font = THAI(400, 28);
      ctx.fillStyle = "#f1dfe2";
      ctx.fillText(`สมุดคูปองคำสั่งจาก ${FROM_NAME} · สุ่มเมื่อ ${fmtDate(state.quotaRolledAt)}`, PW / 2, 385);

      // summary box
      const bx = M, by = 430, bw = PW - M * 2, bh = 160;
      rrect(ctx, bx, by, bw, bh, 24);
      ctx.fillStyle = "rgba(28,8,12,0.85)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,60,80,0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      const cells: [string, string, string][] = [
        [
          "โควต้า",
          state.bonusQuota > 0 ? `${state.quota ?? 0}+${state.bonusQuota}` : `${state.quota ?? 0}`,
          state.bonusQuota > 0
            ? `${state.quotaRarity ?? ""} · 🥚 Easter Egg`
            : state.quotaRarity
              ? `${state.quotaRarity} · ${qTier?.title ?? ""}`
              : "",
        ],
        ["SSR", `${c.SSR}`, "Legendary"],
        ["SR", `${c.SR}`, "Super Rare"],
        ["R", `${c.R}`, "Rare"],
        ["ใช้แล้ว", `${done}/${state.coupons.length}`, "คูปอง"],
      ];
      const cw = bw / cells.length;
      cells.forEach(([label, val, sub], i) => {
        const cx = bx + cw * i + cw / 2;
        const color =
          label === "SSR" ? RARITY_COLOR.SSR : label === "SR" ? RARITY_COLOR.SR : label === "R" ? RARITY_COLOR.R : "#fff";
        ctx.textAlign = "center";
        ctx.font = THAI(500, 22);
        ctx.fillStyle = MUTED;
        ctx.fillText(label, cx, by + 46);
        ctx.font = DISP(72);
        ctx.fillStyle = color;
        ctx.fillText(val, cx, by + 116);
        ctx.font = THAI(300, 18);
        ctx.fillStyle = MUTED;
        ctx.fillText(fit(ctx, sub, cw - 20), cx, by + 144);
        if (i > 0) {
          ctx.strokeStyle = "rgba(255,255,255,0.07)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bx + cw * i, by + 26);
          ctx.lineTo(bx + cw * i, by + bh - 26);
          ctx.stroke();
        }
      });
    } else {
      ctx.textAlign = "left";
      ctx.font = DISP(40);
      setSpacing(ctx, 6);
      ctx.fillStyle = "#ff4d63";
      ctx.fillText(`${BOYFRIEND_NAME.toUpperCase()}'S COUPON BOOK`, M, 100);
      setSpacing(ctx, 0);
    }

    // cards
    for (const { l, y } of page.items) {
      const { row, h, detail, note } = l;
      const idx = rows.indexOf(row) + 1;
      const col = RARITY_COLOR[row.coupon.rarity];
      const ssr = row.coupon.rarity === "SSR";
      rrect(ctx, M, y, cardW, h, 22);
      ctx.fillStyle = ssr ? "rgba(66,40,8,0.88)" : "rgba(34,9,13,0.9)";
      ctx.fill();
      ctx.strokeStyle = ssr ? "rgba(255,201,77,0.5)" : "rgba(255,60,80,0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      rrect(ctx, M, y, cardW, h, 22);
      ctx.clip();
      ctx.fillStyle = col;
      ctx.fillRect(M, y, 8, h);
      ctx.restore();

      // icon tile
      const ix = M + 34, iy = y + 30, is = 96;
      rrect(ctx, ix, iy, is, is, 20);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `52px ${EMOJI}, sans-serif`;
      ctx.fillText(row.cmd.icon, ix + is / 2, iy + is / 2 + 3);

      const tx = M + 150;
      let right = M + cardW - 30;
      const chipW = chip(ctx, row.coupon.rarity, col, right, y + 50, 20);
      right -= chipW + 14;
      ctx.textAlign = "right";
      ctx.font = THAI(500, 20);
      ctx.fillStyle = MUTED;
      ctx.fillText(`#${String(idx).padStart(2, "0")}`, right, y + 51);
      right -= 60;

      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = THAI(700, 32);
      ctx.fillStyle = "#fff";
      ctx.fillText(fit(ctx, row.cmd.title, right - tx), tx, y + 62);

      let ty = y + 62 + 40;
      ctx.font = THAI(300, 24);
      ctx.fillStyle = "#e7d3d7";
      for (const line of detail) {
        ctx.fillText(line, tx, ty);
        ty += 34;
      }
      if (note.length) {
        ty += 8;
        ctx.font = THAI(500, 24);
        ctx.fillStyle = RARITY_COLOR.SSR;
        for (const line of note) {
          ctx.fillText(line, tx, ty);
          ty += 34;
        }
      }
      ty += 14;
      ctx.font = THAI(400, 21);
      ctx.fillStyle = MUTED;
      const drawn = `สุ่มได้ ${fmtDate(row.coupon.drawnAt, true)}`;
      ctx.fillText(drawn, tx, ty);
      const dx = tx + ctx.measureText(drawn).width + 24;
      if (row.coupon.done) {
        check(ctx, dx + 13, ty - 8, 13);
        ctx.fillStyle = "#ff8a98";
        ctx.font = THAI(600, 21);
        ctx.fillText(`ทำให้แล้ว ${fmtDate(row.coupon.doneAt, true)}`, dx + 34, ty);
      } else {
        ctx.fillStyle = "#f1dfe2";
        ctx.font = THAI(500, 21);
        ctx.fillText("○ ยังไม่ได้ใช้", dx, ty);
      }
    }

    // footer
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.font = THAI(500, 22);
    ctx.fillStyle = "#ff4d63";
    ctx.fillText(`with love, ${FROM_NAME} ♥`, M, PH - 60);
    ctx.textAlign = "right";
    ctx.fillStyle = MUTED;
    ctx.font = THAI(400, 20);
    ctx.fillText(`หน้า ${pi + 1}/${pages.length}`, PW - M, PH - 60);
    return cv;
  });
}

export async function buildPdf(state: GameState): Promise<Blob> {
  const pages = await renderPdfPages(state);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  pages.forEach((cv, i) => {
    if (i > 0) doc.addPage();
    doc.addImage(cv.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 210, 297, undefined, "FAST");
  });
  doc.setProperties({ title: `${BOYFRIEND_NAME}'s Birthday Coupon Book`, author: FROM_NAME });
  return doc.output("blob");
}

export function canvasToBlob(cv: HTMLCanvasElement, type = "image/png", q?: number): Promise<Blob> {
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), type, q));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** แชร์ไฟล์ผ่าน share sheet ของมือถือ (เลือก Instagram ได้) — คืน false ถ้าเครื่องไม่รองรับ */
export async function shareFile(blob: Blob, filename: string, title: string): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare?.({ files: [file] })) return false;
  try {
    await nav.share({ files: [file], title });
  } catch (e) {
    if ((e as Error).name !== "AbortError") return false;
  }
  return true;
}
