import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { isAccessUnlocked } from "@/lib/countdown";

export type Role = "zend" | "admin";
const COOKIE = "zend_session";

function secret() {
  return (
    process.env.SESSION_SECRET ||
    `fallback:${process.env.ZEND_PASSWORD ?? ""}:${process.env.ADMIN_PASSWORD ?? ""}`
  );
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function checkCredentials(username: string, password: string): Role | null {  if (!isAccessUnlocked()) return null;  const u = username.trim().toLowerCase();
  const p = password.trim().replace(/[\s/.\-]/g, ""); // รับ 14/02/1998 หรือ 14-02-1998 ด้วย
  const zendPw = (process.env.ZEND_PASSWORD || "").trim();
  const adminPw = (process.env.ADMIN_PASSWORD || "").trim();
  if (u === "zend" && zendPw && safeEqual(p, zendPw)) return "zend";
  if (u === "admin" && adminPw && safeEqual(password.trim(), adminPw)) return "admin";
  return null;
}

export async function setSession(role: Role) {
  const value = `${role}.${sign(role)}`;
  const jar = await cookies();
  jar.set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getRole(): Promise<Role | null> {
  if (!isAccessUnlocked()) return null;
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const [role, sig] = raw.split(".");
  if ((role !== "zend" && role !== "admin") || !sig) return null;
  return safeEqual(sig, sign(role)) ? (role as Role) : null;
}
