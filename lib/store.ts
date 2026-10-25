import { Redis } from "@upstash/redis";
import type { Rarity } from "./config";

export type Coupon = {
  id: string;
  commandId: string;
  rarity: Rarity;
  drawnAt: string;
  done: boolean;
  doneAt?: string;
  note?: string; // สำหรับ wildcard
};

export type GameState = {
  quota: number | null;
  quotaRarity: Rarity | null;
  quotaRolledAt: string | null;
  letterSeen: boolean;
  coupons: Coupon[];
};

export const EMPTY_STATE: GameState = {
  quota: null,
  quotaRarity: null,
  quotaRolledAt: null,
  letterSeen: false,
  coupons: [],
};

const KEY = "zend-birthday:state";
const LOCK_KEY = "zend-birthday:lock";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

// fallback สำหรับรันบนเครื่อง (ไม่มี Redis) — ข้อมูลหายเมื่อรีสตาร์ท
const g = globalThis as unknown as { __zendMem?: GameState };

export const hasPersistentStore = !!redis;

export async function getState(): Promise<GameState> {
  if (redis) {
    const s = await redis.get<GameState>(KEY);
    return s ? { ...EMPTY_STATE, ...s } : { ...EMPTY_STATE };
  }
  return g.__zendMem ? structuredClone(g.__zendMem) : { ...EMPTY_STATE, coupons: [] };
}

export async function setState(s: GameState): Promise<void> {
  if (redis) {
    await redis.set(KEY, s);
    return;
  }
  g.__zendMem = structuredClone(s);
}

/** ป้องกันกดรัวๆ แล้วสุ่มซ้อนกัน */
export async function withLock<T>(fn: () => Promise<T>): Promise<T | "LOCKED"> {
  if (redis) {
    const ok = await redis.set(LOCK_KEY, "1", { nx: true, ex: 10 });
    if (!ok) return "LOCKED";
    try {
      return await fn();
    } finally {
      await redis.del(LOCK_KEY);
    }
  }
  return fn();
}
