"use client";

import { useState, useEffect } from "react";
import { Store, QrCode, Banknote, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function DailyShiftWidget({ onShiftClosed }: { onShiftClosed?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transferTotal, setTransferTotal] = useState(0);
  const [cashTotal, setCashTotal] = useState("");
  const [isClosed, setIsClosed] = useState(false);
  const [grossTotal, setGrossTotal] = useState(0);

  useEffect(() => {
    fetchTodayShift();
  }, []);

  async function fetchTodayShift() {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/daily-shift");
      const data = await res.json();
      if (data.success) {
        setTransferTotal(data.data.calculatedTransferTotal || 0);
        if (data.data.shift) {
          setCashTotal(data.data.shift.cashTotal);
          setGrossTotal(Number(data.data.shift.grossTotal));
          setIsClosed(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseShift() {
    try {
      setSaving(true);
      const res = await fetch("/api/dashboard/daily-shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashTotal: Number(cashTotal) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGrossTotal(Number(data.data.grossTotal));
        setIsClosed(true);
        onShiftClosed?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur rounded-2xl p-4 flex items-center justify-center min-h-[100px]">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const currentCash = Number(cashTotal) || 0;
  const computedGross = transferTotal + currentCash;

  return (
    <Card className="rounded-[1.75rem] border border-slate-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] bg-white text-slate-800 overflow-hidden relative mb-4">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">ปิดยอดร้านประจำวัน</h3>
              <p className="text-[11px] font-medium text-slate-400">สรุปยอดเงินโอน + เงินสดประจำวัน</p>
            </div>
          </div>
          {isClosed && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] px-2.5 py-1 rounded-full font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> ปิดยอดแล้ว
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>ยอดสแกนโอนวันนี้</span>
            </div>
            <p className="text-lg font-black text-emerald-600 font-number">
              ฿{transferTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
              <Banknote className="w-3.5 h-3.5 text-amber-500" />
              <span>เงินสดในเกะ</span>
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={cashTotal}
              onChange={(e) => setCashTotal(e.target.value)}
              className="h-8 bg-white border border-slate-200 text-slate-900 font-bold text-base focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 px-2.5 rounded-xl shadow-xs"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400">ยอดขายรวมวันนี้</span>
            <p className="text-xl font-black text-slate-900 font-number">
              ฿{(isClosed ? grossTotal : computedGross).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <Button
            onClick={handleCloseShift}
            disabled={saving}
            className="bg-[#43936C] hover:bg-[#367a59] text-white font-bold px-4 py-2.5 rounded-2xl text-xs shadow-sm transition-all"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isClosed ? (
              "อัปเดตปิดยอด"
            ) : (
              "บันทึกปิดยอดวัน"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
