"use client";

import { Credit } from "@/lib/db/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { User, Store, CheckCircle2, MessageSquare, Calendar, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditCardProps {
  credit: Credit;
  onMarkPaid: (id: string) => void;
  onOpenReminder: (credit: Credit) => void;
}

export function CreditCard({ credit, onMarkPaid, onOpenReminder }: CreditCardProps) {
  const isPaid = credit.status === "paid";
  const isDebtor = credit.type === "debtor";

  // Check if overdue (if not paid and due date has passed)
  const isOverdue =
    !isPaid &&
    credit.dueDate &&
    new Date(credit.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

  const getStatusBadge = () => {
    if (isPaid) {
      return (
        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          ชำระแล้ว
        </span>
      );
    }
    if (isOverdue || credit.status === "overdue") {
      return (
        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-50 text-rose-600 border border-rose-200">
          เกินกำหนด
        </span>
      );
    }
    return (
      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-600 border border-amber-200">
        รอชำระ
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2.5 rounded-xl ${
              isDebtor ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
            }`}
          >
            {isDebtor ? <User className="w-5 h-5" /> : <Store className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-base leading-tight">
              {credit.contactName}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{isDebtor ? "ลูกหนี้ (ค้างรับเงิน)" : "เจ้าหนี้ (ค้างชำระ)"}</span>
              {credit.contactPhone && (
                <span className="flex items-center gap-0.5">
                  • <Phone className="w-3 h-3 inline ml-0.5" />
                  {credit.contactPhone}
                </span>
              )}
            </div>
          </div>
        </div>

        {getStatusBadge()}
      </div>

      {credit.description && (
        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
          {credit.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-slate-50">
        <div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400">ยอดเงิน</span>
            {credit.dueDate && (
              <span className="text-[11px] text-slate-400 flex items-center gap-0.5 ml-1">
                • <Calendar className="w-3 h-3 inline" />
                กำหนด {formatDate(credit.dueDate)}
              </span>
            )}
          </div>
          <p
            className={`text-lg font-extrabold ${
              isDebtor ? "text-amber-600" : "text-blue-600"
            }`}
          >
            {formatCurrency(Number(credit.amount))}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDebtor && !isPaid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenReminder(credit)}
              className="h-8 px-2.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-xl gap-1.5 font-medium"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              💬 ทวงหนี้ LINE
            </Button>
          )}

          {!isPaid && (
            <Button
              size="sm"
              onClick={() => onMarkPaid(credit.id)}
              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm gap-1 font-medium"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              ✓ ชำระแล้ว
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
