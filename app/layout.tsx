import type { Metadata, Viewport } from "next";
// ฟอนต์ self-host ผ่าน @fontsource (ไม่ต้องพึ่ง Google Fonts และใช้วาดรูป export ได้)
import "@fontsource/prompt/300.css";
import "@fontsource/prompt/400.css";
import "@fontsource/prompt/500.css";
import "@fontsource/prompt/600.css";
import "@fontsource/prompt/700.css";
import "@fontsource/prompt/800.css";
import "@fontsource/bebas-neue/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Happy Birthday, Zend",
  description: "A birthday gacha, just for you.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#07030a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
