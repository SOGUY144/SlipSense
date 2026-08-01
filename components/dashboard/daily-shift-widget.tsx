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
    <Card className="rounded-[1.5rem] border-0 shadow-md bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
        <Store className="w-32 h-32" />
      </div>

      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">ปิดยอดร้านประจำวัน</h3>
              <p className="text-xs text-slate-400">สรุปยอดเงินโอน + เงินสด 1 นาที</p>
            </div>
          </div>
          {isClosed && (
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> ปิดยอดแล้ว
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>ยอดสแกนโอนวันนี้</span>
            </div>
            <p className="text-lg font-black text-emerald-400 font-number">
              ฿{transferTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Banknote className="w-3.5 h-3.5 text-amber-400" />
              <span>เงินสดในเกะ</span>
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={cashTotal}
              onChange={(e) => setCashTotal(e.target.value)}
              className="h-8 bg-white/10 border-0 text-white font-bold text-base focus:ring-1 focus:ring-emerald-400 px-2 rounded-lg"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">ยอดขายรวมวันนี้</span>
            <p className="text-xl font-black text-white font-number">
              ฿{(isClosed ? grossTotal : computedGross).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <Button
            onClick={handleCloseShift}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/20"
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
