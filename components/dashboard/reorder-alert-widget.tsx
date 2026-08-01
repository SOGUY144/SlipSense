"use client";

import { useState, useEffect } from "react";
import { Package, RefreshCw } from "lucide-react";
import type { ReorderCycle } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ReorderAlertWidget() {
  const [alerts, setAlerts] = useState<ReorderCycle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    try {
      setLoading(true);
      const res = await fetch("/api/suppliers/reorder-alerts");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAlerts(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || alerts.length === 0) return null;

  return (
    <div className="bg-white border border-slate-100/80 rounded-[1.75rem] p-5 space-y-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
          <div className="p-1.5 bg-emerald-50 rounded-xl text-emerald-600">
            <Package className="w-4 h-4" />
          </div>
          <span>ครบรอบสั่งของเพิ่ม ({alerts.length} รายการ)</span>
        </div>
      </div>

      <div className="space-y-2">
        {alerts.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="bg-slate-50/80 rounded-2xl p-3 flex items-center justify-between text-xs border border-slate-100"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-100/60 rounded-xl text-emerald-700 shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-800">{item.itemName}</p>
                <p className="text-[10px] text-slate-400">
                  {item.supplierName || "ซัพพลายเออร์"} • สั่งเฉลี่ยทุก {item.averageIntervalDays} วัน
                </p>
              </div>
            </div>

            <Link href="/credits">
              <Button size="sm" className="h-7 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                สั่งของเพิ่ม
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
