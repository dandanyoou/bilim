import type { Metadata } from "next";
import { Noto_Sans_KR, Gaegu } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";

// Noto Sans KR/Gaegu는 Google Fonts 메타데이터상 한글 글리프가 "latin" 서브셋 하나에
// 다 들어있다(별도 "korean" 서브셋이 없음) — next/font 타입에도 그렇게 정의돼 있다.
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const gaegu = Gaegu({
  variable: "--font-gaegu",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "빌림 — 캠퍼스 물품 대여",
  description: "같은 캠퍼스 학생에게 하루 단위로 물건을 빌려주고 빌리는 중개 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${gaegu.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <NavBar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
