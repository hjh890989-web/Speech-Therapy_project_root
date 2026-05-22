import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ServiceWorkerRegister } from "./sw-register";
import { InstitutionHeader } from "@/components/InstitutionHeader";

// 부팅 시 1회 환경변수 검증 — 누락 시 부팅 단계에서 throw (사용자 첫 요청 전 차단).
// 본 import 의 side-effect (zod parse) 가 검증 트리거. ESLint 의 "unused" 회피 위해
// 명시적 reference 만들어 둠 (tree-shake 방지).
import { env as _env } from "@/lib/env";
void _env;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Speech-Therapy — 5분 발음 확인",
  description:
    "회원가입 없이 5분 안에 아이의 발음 발달을 또래와 비교해 확인하는 부모용 보조 도구.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Speech-Therapy",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* FR-Q-010 — 전역 기관 헤더. RSC + Suspense fallback 으로 ≤ 1초 렌더 보장.
            DB / Supabase 오류 시 InstitutionHeader 내부에서 default "Speech-Therapy" 폴백. */}
        <Suspense fallback={null}>
          <InstitutionHeader />
        </Suspense>
        {children}
        <ServiceWorkerRegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
