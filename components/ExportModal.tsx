"use client";
import { useEffect, useRef, useState } from "react";
import type { GameState } from "@/lib/store";
import { BOYFRIEND_NAME } from "@/lib/config";
import { buildPdf, canvasToBlob, downloadBlob, renderStory, shareFile } from "./exporter";
import { sfx } from "./sound";

const STORY_NAME = `${BOYFRIEND_NAME.toLowerCase()}-birthday-story.png`;
const PDF_NAME = `${BOYFRIEND_NAME.toLowerCase()}-birthday-coupons.pdf`;

export default function ExportModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  const [story, setStory] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    let url = "";
    let alive = true;
    document.body.style.overflow = "hidden";
    (async () => {
      try {
        const cv = await renderStory(state);
        const blob = await canvasToBlob(cv);
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setStory({ blob, url });
        const f = new File([blob], STORY_NAME, { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
        setCanShare(!!nav.share && !!nav.canShare?.({ files: [f] }));
      } catch (e) {
        console.error(e);
        if (alive) setError("สร้างรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
      }
    })();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [state]);

  async function share() {
    if (!story) return;
    sfx.click();
    const ok = await shareFile(story.blob, STORY_NAME, `${BOYFRIEND_NAME}'s Birthday Gacha`);
    if (!ok) downloadBlob(story.blob, STORY_NAME);
  }

  async function savePdf() {
    sfx.click();
    setPdfBusy(true);
    setError("");
    try {
      const blob = await buildPdf(state);
      downloadBlob(blob, PDF_NAME);
      sfx.done();
    } catch (e) {
      console.error(e);
      setError("สร้าง PDF ไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="overlay sheet-overlay" onClick={onClose}>
      <div className="panel sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="เก็บเป็นที่ระลึก">
        <div className="sheet-head">
          <div>
            <span className="round-tag">KEEPSAKE</span>
            <h2 className="display sheet-title">เก็บเป็นที่ระลึก</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="ปิด">✕</button>
        </div>
        <div className="sheet-body">
          {!story && !error && (
            <div className="export-loading">
              <div className="spinner" />
              กำลังวาดรูป…
            </div>
          )}
          {story && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="story-preview" src={story.url} alt="ตัวอย่างรูป Instagram Story" />
              <div className="export-actions">
                {canShare && (
                  <button className="btn btn-block btn-gold" onClick={share}>
                    แชร์ลง Instagram Story
                  </button>
                )}
                <button
                  className={`btn btn-block ${canShare ? "btn-ghost" : "btn-gold"}`}
                  onClick={() => {
                    sfx.click();
                    downloadBlob(story.blob, STORY_NAME);
                  }}
                >
                  บันทึกรูป (1080×1920)
                </button>
                <button className="btn btn-block btn-ghost" onClick={savePdf} disabled={pdfBusy}>
                  {pdfBusy ? "กำลังสร้าง PDF…" : "ดาวน์โหลดสมุดคูปอง (PDF)"}
                </button>
              </div>
              <p className="hint">บน iPhone กดค้างที่รูปแล้วเลือก &ldquo;บันทึกรูปภาพ&rdquo; ได้เหมือนกัน</p>
            </>
          )}
          {error && <div className="err" style={{ textAlign: "center" }}>{error}</div>}
        </div>
      </div>
    </div>
  );
}
