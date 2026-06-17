import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
