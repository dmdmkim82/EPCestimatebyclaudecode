import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DisplayConfig } from "@/components/display-config";
import { SiteHeader } from "@/components/site-header";
import { SiteSidebar } from "@/components/site-sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOFC 연료전지 EPC 견적 스튜디오",
  description:
    "기준 프로젝트 워크북을 바탕으로 SOFC EPC 견적, 물가상승 반영, 경제성 검토, B2B 제안을 한 화면에서 정리하는 내부 검토용 스튜디오입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta content="no-referrer" name="referrer" />
        {/* Iconify Solar — 아이콘 시스템 */}
        <script src="https://cdn.jsdelivr.net/npm/@iconify/iconify@3/dist/iconify.min.js" async />
      </head>
      <body>
        <div className="app-shell">
          <SiteSidebar />
          <div className="app-content">
            <SiteHeader />
            {children}
            <DisplayConfig />
          </div>
        </div>
      </body>
    </html>
  );
}
