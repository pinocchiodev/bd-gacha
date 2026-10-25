import { randomInt } from "crypto";
import { COMMANDS, COMMAND_RARITY_WEIGHTS, QUOTA_TIERS, type Command, type Rarity } from "./config";

function weightedPick<T>(items: T[], weight: (t: T) => number): T {
  const total = items.reduce((s, i) => s + weight(i), 0);
  let r = randomInt(0, Math.max(1, Math.round(total * 1000))) / 1000;
  for (const it of items) {
    r -= weight(it);
    if (r < 0) return it;
  }
  return items[items.length - 1];
}

export function rollQuota() {
  return weightedPick(QUOTA_TIERS, (t) => t.weight);
}

export function drawCommand(): Command {
  const available = (Object.keys(COMMAND_RARITY_WEIGHTS) as Rarity[]).filter((r) =>
    COMMANDS.some((c) => c.rarity === r),
  );
  const rarity = weightedPick(available, (r) => COMMAND_RARITY_WEIGHTS[r]);
  const pool = COMMANDS.filter((c) => c.rarity === rarity);
  return pool[randomInt(0, pool.length)];
}
