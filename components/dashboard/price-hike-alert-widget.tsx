"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, TrendingUp, ShoppingBag } from "lucide-react";
import type { TransactionItem } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/utils";

export function PriceHikeAlertWidget() {
  const [alerts, setAlerts] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    try {
      setLoading(true);
      const res = await fetch("/api/suppliers/price-alerts");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAlerts(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch price alerts:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || alerts.length === 0) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
        <AlertTriangle className="w-4 h-4" />
        <span>เตือนสินค้าปรับขึ้นราคา ({alerts.length} รายการ)</span>
      </div>

      <div className="space-y-2">
        {alerts.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl p-2.5 flex items-center justify-between text-xs shadow-sm border border-amber-100"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">{item.itemName}</p>
                <p className="text-[10px] text-slate-400">
                  {item.supplierName || "ซัพพลายเออร์"} • เดิม {item.previousUnitPrice ? formatCurrency(Number(item.previousUnitPrice)) : "-"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-extrabold text-amber-600">
                {formatCurrency(Number(item.unitPrice))}
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-rose-500 ml-1">
                <TrendingUp className="w-3 h-3 mr-0.5" />+{item.priceChangePercent}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
