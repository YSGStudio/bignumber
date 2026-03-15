import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "큰 수 자릿값 탐험",
  description: "초등학교 4~5학년 큰 수 자릿값 학습 웹사이트",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
