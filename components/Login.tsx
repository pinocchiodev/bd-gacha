"use client";
import { useState } from "react";
import { sfx } from "./sound";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    sfx.unlock();
    if (!username || !password) {
      setError("กรอกให้ครบก่อนนะ");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.ok) {
      sfx.login();
      onSuccess();
    } else {
      sfx.error();
      setError("ไม่ถูกน้า~ ลองนึกดีๆ ว่าวันเกิดตัวเองวันไหน");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  return (
    <div className="screen">
      <div className="container">
        <form onSubmit={submit} className={`panel login-card ${shake ? "shake" : ""}`}>
          <span className="heart-logo">❤</span>
          <h1 className="login-title display">HAPPY BIRTHDAY</h1>
          <p className="login-sub">มีของขวัญรออยู่ข้างใน… แต่ต้องยืนยันตัวตนก่อน</p>

          <div className="field">
            <label htmlFor="u">ชื่อผู้ใช้</label>
            <input
              id="u"
              autoComplete="username"
              autoCapitalize="none"
              placeholder="ชื่อของเธอ"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="p">รหัสผ่าน</label>
            <input
              id="p"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="วันเกิด (DDMMYYYY)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="err">{error}</div>
          <button className="btn btn-block" disabled={loading}>
            {loading ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
