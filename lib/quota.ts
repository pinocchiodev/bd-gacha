import type { GameState } from "./store";

/** โควต้ารวม = ผลสุ่มรอบ 1 + โบนัสจาก Easter Egg */
export function totalQuota(s: GameState) {
  return (s.quota ?? 0) + (s.bonusQuota ?? 0);
}
