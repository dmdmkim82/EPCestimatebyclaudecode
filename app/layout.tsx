import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DisplayConfig } from "@/components/display-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOFC 연료전지 EPC 견적산출",
  description:
    "기준 프로젝트 워크북을 브라우저에서 검수하고 로컬 계산으로 SOFC EPC 견적을 산출하는 내부 검토용 도구입니다.",
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
      </head>
      <body>
        <span className="site-credit">coding by codex</span>
        {children}
        <DisplayConfig />
      </body>
    </html>
  );
}
