import { COMMANDS, COMMAND_RARITY_WEIGHTS, QUOTA_TIERS, type Command, type Rarity } from "./config";

export const RARITY_ORDER: Rarity[] = ["SSR", "SR", "R"];
export const RARITY_NAME: Record<Rarity, string> = { R: "Rare", SR: "Super Rare", SSR: "Legendary" };
export const RARITY_COLOR: Record<Rarity, string> = { R: "#ff3b52", SR: "#dfe6f2", SSR: "#ffc94d" };

export function quotaRates() {
  const total = QUOTA_TIERS.reduce((s, t) => s + t.weight, 0) || 1;
  return QUOTA_TIERS.map((t) => ({ ...t, pct: (t.weight / total) * 100 }));
}

/** อัตราออกของแต่ละระดับ + แต่ละคำสั่ง (ตรงกับ logic ใน lib/gacha.ts) */
export function commandRates() {
  const present = RARITY_ORDER.filter((r) => COMMANDS.some((c) => c.rarity === r));
  const total = present.reduce((s, r) => s + COMMAND_RARITY_WEIGHTS[r], 0) || 1;
  return present.map((rarity) => {
    const items = COMMANDS.filter((c) => c.rarity === rarity);
    const tierPct = (COMMAND_RARITY_WEIGHTS[rarity] / total) * 100;
    return {
      rarity,
      tierPct,
      items: items.map((c) => ({ ...c, pct: tierPct / items.length })) as (Command & { pct: number })[],
    };
  });
}

export function fmtPct(n: number) {
  return n >= 10 ? `${n.toFixed(0)}%` : `${n.toFixed(n >= 1 ? 1 : 2)}%`;
}
