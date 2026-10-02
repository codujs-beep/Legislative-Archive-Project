import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "TeamBridge — 언어 장벽 없이 팀플하기",
  description: "채팅 · 퀴즈 · 보드가 하나의 흐름으로 이어지는 한중 팀플 도구",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
