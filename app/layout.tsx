import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai, Inter } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({ 
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SlipSense — AI วิเคราะห์สุขภาพการเงินร้านค้า",
  description:
    "ถ่ายรูปสลิปโอนเงิน AI อ่านและสรุปรายรับ-รายจ่ายให้ทันที สำหรับเจ้าของร้าน SME",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${notoSansThai.variable} ${inter.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
