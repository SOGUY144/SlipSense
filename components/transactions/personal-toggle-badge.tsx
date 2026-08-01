"use client";

import { useState } from "react";
import { User, Store } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalToggleBadgeProps {
  transactionId: string;
  isPersonal: boolean;
  onToggle?: (newVal: boolean) => void;
}

export function PersonalToggleBadge({
  transactionId,
  isPersonal: initialVal,
  onToggle,
}: PersonalToggleBadgeProps) {
  const [isPersonal, setIsPersonal] = useState(initialVal);
  const [loading, setLoading] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    const newVal = !isPersonal;
    setIsPersonal(newVal); // Optimistic UI update
    setLoading(true);

    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPersonal: newVal }),
      });
      if (!res.ok) {
        setIsPersonal(!newVal); // Revert on error
      } else {
        onToggle?.(newVal);
      }
    } catch {
      setIsPersonal(!newVal);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-200 shadow-sm border shrink-0",
        isPersonal
          ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
      )}
      title="คลิกเพื่อสลับป้าย ร้านค้า / ส่วนตัว"
    >
      {isPersonal ? (
        <>
          <User className="w-3 h-3 text-slate-500" />
          <span>ส่วนตัว</span>
        </>
      ) : (
        <>
          <Store className="w-3 h-3 text-emerald-600" />
          <span>ร้านค้า</span>
        </>
      )}
    </button>
  );
}
