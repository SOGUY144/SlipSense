"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Home, Zap, Wifi, Car, CreditCard, Tv, Plus, Shield, TrainFront, Heart, Landmark } from "lucide-react";

interface BillOption {
  id: string;
  icon: React.ReactNode;
  title: string;
  category: string;
}

const COMMON_BILLS: BillOption[] = [
  { id: "rent", icon: <Home className="w-5 h-5" />, title: "ค่าเช่าหอ/บ้าน", category: "ค่าเช่า/ที่พัก" },
  { id: "utilities", icon: <Zap className="w-5 h-5" />, title: "ค่าน้ำ-ไฟ", category: "ค่าน้ำค่าไฟ" },
  { id: "internet", icon: <Wifi className="w-5 h-5" />, title: "ค่าเน็ต/โทรศัพท์", category: "ค่าโทรศัพท์/อินเทอร์เน็ต" },
  { id: "car", icon: <Car className="w-5 h-5" />, title: "ผ่อนรถ", category: "ค่าเดินทาง" },
  { id: "creditcard", icon: <CreditCard className="w-5 h-5" />, title: "บัตรเครดิต", category: "หนี้สิน/บัตรเครดิต" },
  { id: "subscription", icon: <Tv className="w-5 h-5" />, title: "สตรีมมิ่ง (Netflix)", category: "ความบันเทิง" },
  { id: "insurance", icon: <Shield className="w-5 h-5" />, title: "ค่าประกัน", category: "ประกันภัย" },
  { id: "transport", icon: <TrainFront className="w-5 h-5" />, title: "ค่าเดินทาง (BTS/MRT)", category: "ค่าเดินทาง" },
  { id: "family", icon: <Heart className="w-5 h-5" />, title: "ส่งให้ครอบครัว", category: "ครอบครัว" },
  { id: "loan", icon: <Landmark className="w-5 h-5" />, title: "สินเชื่อ/กยศ.", category: "หนี้สิน/เงินกู้" },
];

export function OnboardingReminders({ onComplete, forceOpen }: { onComplete: () => void, forceOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [billDetails, setBillDetails] = useState<Record<string, { dueDay: number; amount?: number }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }

    // Check if we should show it
    const hasSkipped = localStorage.getItem("hasSkippedBillOnboardingV2");
    if (hasSkipped) return;

    fetch("/api/reminders")
      .then((res) => res.json())
      .then((data) => {
        // Show it even if they have bills, so they can see the new options
        setOpen(true);
      })
      .catch(console.error);
  }, [forceOpen]);

  const handleSkip = () => {
    if (!forceOpen) {
      localStorage.setItem("hasSkippedBillOnboardingV2", "true");
    }
    setOpen(false);
    onComplete();
  };

  const handleToggleBill = (id: string) => {
    setSelectedBills((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selectedBills.length === 0) {
      handleSkip();
      return;
    }

    // Validate details
    for (const id of selectedBills) {
      const details = billDetails[id];
      if (!details?.dueDay || details.dueDay < 1 || details.dueDay > 31) {
        alert("กรุณาระบุวันที่ต้องจ่ายให้ครบถ้วน (1-31)");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = selectedBills.map((id) => {
        const option = COMMON_BILLS.find((b) => b.id === id)!;
        const details = billDetails[id];
        return {
          title: option.title,
          category: option.category,
          dueDay: details.dueDay,
          amount: details.amount || null,
        };
      });

      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminders: payload }),
      });

      if (!res.ok) throw new Error("Failed to save");

      localStorage.setItem("hasSkippedBillOnboardingV2", "true");
      setOpen(false);
      onComplete();
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ตั้งค่าบิลประจำเดือน 📅</DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "เลือกบิลที่คุณต้องจ่ายเป็นประจำทุกเดือน เพื่อให้ AI ช่วยเตือนคุณเมื่อใกล้ถึงกำหนด (เลือกได้หลายข้อ)" 
              : "ระบุวันที่กำหนดจ่ายในแต่ละเดือนเพื่อให้ระบบเตือนได้แม่นยำ"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              {COMMON_BILLS.map((bill) => {
                const isSelected = selectedBills.includes(bill.id);
                return (
                  <button
                    key={bill.id}
                    onClick={() => handleToggleBill(bill.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted bg-background hover:bg-muted/50"
                    }`}
                  >
                    <div className={`p-3 rounded-full mb-2 ${isSelected ? "bg-primary/20" : "bg-muted"}`}>
                      {bill.icon}
                    </div>
                    <span className="text-sm font-medium text-center">{bill.title}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="ghost" className="flex-1" onClick={handleSkip}>
                ข้ามไปก่อน
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => setStep(2)}
                disabled={selectedBills.length === 0}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-2">
              {selectedBills.map((id) => {
                const option = COMMON_BILLS.find((b) => b.id === id)!;
                return (
                  <div key={id} className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center gap-2 font-medium">
                      {option.icon} {option.title}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">วันที่ต้องจ่าย (1-31) *</Label>
                        <Input 
                          type="number" 
                          min={1} 
                          max={31} 
                          placeholder="เช่น 1 หรือ 25" 
                          value={billDetails[id]?.dueDay || ""}
                          onChange={(e) => setBillDetails(prev => ({
                            ...prev, 
                            [id]: { ...prev[id], dueDay: parseInt(e.target.value) }
                          }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">จำนวนเงิน (ไม่บังคับ)</Label>
                        <Input 
                          type="number" 
                          placeholder="เช่น 5000"
                          value={billDetails[id]?.amount || ""}
                          onChange={(e) => setBillDetails(prev => ({
                            ...prev, 
                            [id]: { ...prev[id], amount: parseInt(e.target.value) }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                ย้อนกลับ
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? "กำลังบันทึก..." : "เสร็จสิ้น"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
