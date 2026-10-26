"use client";

export const UNAUTHORIZED_EVENT = "zend-unauthorized";

/** เรียก /api/game — ถ้า session หมดอายุ (401) จะส่ง event ให้หน้าเว็บพากลับไปหน้าล็อคอิน */
export async function gameAction(body: Record<string, unknown>) {
  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  return res.json().catch(() => ({ ok: false, message: "เกิดข้อผิดพลาด" }));
}
