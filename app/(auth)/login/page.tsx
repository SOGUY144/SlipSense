"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.startsWith("0")) {
      return "+66" + digits.slice(1);
    }
    if (digits.startsWith("66")) {
      return "+" + digits;
    }
    return "+66" + digits;
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const formattedPhone = formatPhone(phone);

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setStep("otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const formattedPhone = formatPhone(phone);

    const { error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: "sms",
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName: "ร้านของฉัน" }),
    });

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary">SlipSense</h1>
        <p className="mt-2 text-muted-foreground">
          ถ่ายรูปสลิป รู้กำไรทันที
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {step === "phone" ? "เข้าสู่ระบบ" : "ยืนยัน OTP"}
          </CardTitle>
          <CardDescription>
            {step === "phone"
              ? "กรอกเบอร์โทรศัพท์เพื่อรับรหัส OTP"
              : `ส่งรหัสไปที่ ${phone} แล้ว`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0812345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "กำลังส่ง..." : "ส่ง OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">รหัส OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "กำลังตรวจสอบ..." : "ยืนยัน"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError("");
                }}
              >
                เปลี่ยนเบอร์โทร
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      
      <div className="mt-8 max-w-sm w-full p-4 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-800 shadow-sm">
        <p className="font-semibold mb-1 flex items-center gap-1">
          <span className="text-lg">💡</span> สำหรับกรรมการ (Demo)
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>กรอกเบอร์โทรศัพท์: <strong>0812345678</strong></li>
          <li>กรอกรหัส OTP: <strong>123456</strong></li>
        </ul>
      </div>
    </div>
  );
}
