import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOFC EPC 견적산출 스튜디오",
  description:
    "E, P, C, ETC 항목을 한 줄씩 추가하며 총 견적을 완성하는 SOFC EPC 견적 작성 도구입니다.",
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
      </body>
    </html>
  );
}
