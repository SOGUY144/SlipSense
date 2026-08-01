"use client";

import { useState, useEffect } from "react";
import { Credit } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy, Check, RefreshCw, MessageSquare, Loader2 } from "lucide-react";
import { triggerHaptic, formatCurrency } from "@/lib/utils";

interface AiReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credit: Credit | null;
}

export function AiReminderModal({ open, onOpenChange, credit }: AiReminderModalProps) {
  const [reminderText, setReminderText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReminder = async () => {
    if (!credit) return;
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const res = await fetch(`/api/credits/${credit.id}/generate-reminder`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "เกิดข้อผิดพลาดในการสร้างข้อความ");
      }

      const data = await res.json();
      setReminderText(data.reminderText || data.data?.reminderText || "");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "ไม่สามารถร่างข้อความทวงหนี้ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && credit) {
      fetchReminder();
    } else {
      setReminderText("");
      setCopied(false);
      setError(null);
    }
  }, [open, credit?.id]);

  const handleCopy = () => {
    if (!reminderText) return;
    navigator.clipboard.writeText(reminderText);
    setCopied(true);
    triggerHaptic("success");

    setTimeout(() => {
      setCopied(false);
    }, 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
            AI ร่างข้อความทวงหนี้ LINE
          </DialogTitle>
        </DialogHeader>

        {credit && (
          <div className="space-y-4 py-2">
            <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-700">{credit.contactName}</span>
                <span className="text-slate-400 block text-[11px]">
                  ยอดค้างชำระ: {formatCurrency(Number(credit.amount))}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchReminder}
                disabled={loading}
                className="h-8 px-2 text-xs text-slate-500 hover:text-emerald-700 gap-1 rounded-lg"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                ร่างใหม่
              </Button>
            </div>

            {loading ? (
              <div className="p-8 bg-emerald-50/40 rounded-2xl border border-emerald-100/60 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <p className="text-xs text-emerald-800 font-medium">
                  กำลังให้ AI ช่วยคิดข้อความทวงหนี้ที่สุภาพ...
                </p>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-medium">
                {error}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                  <MessageSquare className="w-3.5 h-3.5" />
                  พรีวิวข้อความ (LINE Chat Preview):
                </div>
                <div className="bg-[#55C500]/10 border border-[#55C500]/30 rounded-2xl p-4 relative text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {reminderText}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs sm:w-auto"
          >
            ปิด
          </Button>
          <Button
            type="button"
            onClick={handleCopy}
            disabled={loading || !reminderText}
            className={`rounded-xl text-xs text-white font-bold gap-1.5 transition-all sm:w-auto ${
              copied
                ? "bg-emerald-700 hover:bg-emerald-800"
                : "bg-[#55C500] hover:bg-[#4cb000]"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                คัดลอกเรียบร้อย!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                คัดลอกข้อความ
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
