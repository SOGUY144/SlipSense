import type { Metadata, Viewport } from "next";
import { Prompt, Inter } from "next/font/google";
import "./globals.css";

const promptFont = Prompt({ 
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
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
  themeColor: "#34d399", // emerald-400
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${promptFont.variable} ${inter.variable}`}>
      <body className="font-sans bg-[#F5F5F7]">{children}</body>
    </html>
  );
}
