"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Store, Loader2 } from "lucide-react";
import { triggerHaptic } from "@/lib/utils";

interface AddCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialType?: "debtor" | "creditor";
}

export function AddCreditModal({
  open,
  onOpenChange,
  onSuccess,
  initialType = "debtor",
}: AddCreditModalProps) {
  const [type, setType] = useState<"debtor" | "creditor">(initialType);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType(initialType);
      setContactName("");
      setContactPhone("");
      setAmount("");
      setDescription("");
      setDueDate("");
      setError(null);
    }
  }, [open, initialType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) {
      setError("กรุณากรอกชื่อผู้ติดต่อ");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim() || undefined,
          amount: Number(amount),
          description: description.trim() || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึก");
      }

      triggerHaptic("success");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      triggerHaptic("error");
      setError(err.message || "ไม่สามารถเพิ่มข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-800">
            บันทึกรายการหนี้สิน
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Type Selector (Debtor vs Creditor) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType("debtor");
                triggerHaptic("light");
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                type === "debtor"
                  ? "bg-white text-amber-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="w-4 h-4" />
              ลูกหนี้ (ค้างรับ)
            </button>
            <button
              type="button"
              onClick={() => {
                setType("creditor");
                triggerHaptic("light");
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                type === "creditor"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Store className="w-4 h-4" />
              เจ้าหนี้ (ค้างจ่าย)
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Contact Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              ชื่อ{type === "debtor" ? "ลูกหนี้" : "เจ้าหนี้"} *
            </Label>
            <Input
              placeholder={type === "debtor" ? "เช่น คุณสมชาย, ร้าน A" : "เช่น ซัพพลายเออร์ B"}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="rounded-xl border-slate-200"
            />
          </div>

          {/* Contact Phone & Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">เบอร์โทร (ถ้ามี)</Label>
              <Input
                placeholder="0812345678"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">จำนวนเงิน (บาท) *</Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl border-slate-200 font-bold"
              />
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">วันกำหนดชำระ (ถ้ามี)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-xl border-slate-200"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">รายละเอียด / รายการสินค้า</Label>
            <Textarea
              placeholder="เช่น ยืมเงินหมุนเวียน, ค่าวัตถุดิบล็อตที่ 2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-xl border-slate-200 resize-none text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`rounded-xl text-xs text-white font-bold ${
                type === "debtor" ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึกรายการ"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
