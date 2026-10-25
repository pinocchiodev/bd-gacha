"use client";
import { useState } from "react";
import { LETTER } from "@/lib/config";
import { Confetti } from "./Fx";
import { sfx } from "./sound";

export default function Letter({
  onContinue,
  continueLabel = "ไปสุ่มกาชากัน →",
  startOpen = false,
}: {
  onContinue: () => void;
  continueLabel?: string;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);

  if (!open) {
    return (
      <div className="screen">
        <div className="envelope-wrap fade-in">
          <span className="round-tag">YOU&apos;VE GOT MAIL</span>
          <div
            className="envelope"
            role="button"
            tabIndex={0}
            onClick={() => {
              sfx.login();
              setOpen(true);
            }}
            onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
          >
            <div className="seal">❤</div>
          </div>
          <p className="round-desc" style={{ margin: 0 }}>แตะซองจดหมายเพื่อเปิด</p>
        </div>
      </div>
    );
  }

  const paragraphs = LETTER.body.split(/\n\s*\n/);

  return (
    <div className="screen">
      {!startOpen && <Confetti kind="party" count={90} />}
      <div className="container">
        <article className="panel letter">
          <h2 className="display">{LETTER.title}</h2>
          {paragraphs.map((p, i) => (
            <p key={i}>
              {p.split("\n").map((line, j, arr) => (
                <span key={j}>
                  {line}
                  {j < arr.length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
          <p className="sig">{LETTER.signature}</p>
        </article>
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <button
            className="btn"
            onClick={() => {
              sfx.click();
              onContinue();
            }}
          >
            {continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
