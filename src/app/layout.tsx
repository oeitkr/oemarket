import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "../components/BottomNav";
import Script from "next/script";

// ✅ [추가] 인앱브라우저(카톡 등)에서 크롬으로 열기 안내창
import OpenInBrowserGate from "../components/OpenInBrowserGate";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// ✅ 아이콘(favicon.ico)을 사용하겠다는 설정을 추가했습니다.
export const metadata: Metadata = {
  title: "오이 마켓",
  description: "우리 동네 직거래/경매 장터",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable}`}
        style={{ margin: 0 }}
      >
        {/* ✅ [추가] 카톡/인스타 인앱브라우저면 안내창 띄움 */}
        <OpenInBrowserGate />
        {/* ✅ [추가] 카톡/인스타 인앱브라우저면 안내창 띄움 */}
        <OpenInBrowserGate />

        {/* 👇 사용자님 아이디(kxohiw00c5)가 들어간 지도 코드입니다! */}
        <Script
          strategy="beforeInteractive"
          src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=kxohiw00c5&submodules=geocoder"
        />

        {children}

        {/* ✅ 홈(/list 또는 /)에서만 보이게 처리됨 */}
        <BottomNav />
      </body>
    </html>
  );
}
