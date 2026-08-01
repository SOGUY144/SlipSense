"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Credit } from "@/lib/db/schema";
import { formatCurrency, triggerHaptic, cn } from "@/lib/utils";
import { CreditCard } from "@/components/credits/credit-card";
import { AddCreditModal } from "@/components/credits/add-credit-modal";
import { AiReminderModal } from "@/components/credits/ai-reminder-modal";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Plus,
  User,
  Store,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Filter,
  Loader2,
  Users,
} from "lucide-react";

export default function CreditsPage() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "debtor" | "creditor">("debtor");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("pending");

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalType, setAddModalType] = useState<"debtor" | "creditor">("debtor");
  const [reminderCredit, setReminderCredit] = useState<Credit | null>(null);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [paidToast, setPaidToast] = useState(false);

  const fetchCredits = async () => {
    try {
      const res = await fetch("/api/credits");
      if (res.ok) {
        const data = await res.json();
        setCredits(data.data || data || []);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  // Summary Calculations
  const stats = useMemo(() => {
    let totalDebtorPending = 0;
    let totalCreditorPending = 0;
    let debtorCount = 0;
    let creditorCount = 0;

    credits.forEach((item) => {
      const amount = Number(item.amount) || 0;
      if (item.type === "debtor") {
        if (item.status !== "paid") {
          totalDebtorPending += amount;
          debtorCount++;
        }
      } else if (item.type === "creditor") {
        if (item.status !== "paid") {
          totalCreditorPending += amount;
          creditorCount++;
        }
      }
    });

    return {
      totalDebtorPending,
      totalCreditorPending,
      debtorCount,
      creditorCount,
    };
  }, [credits]);

  // Filtered List
  const filteredCredits = useMemo(() => {
    return credits.filter((item) => {
      // Tab filter
      if (activeTab !== "all" && item.type !== activeTab) {
        return false;
      }
      // Status filter
      if (statusFilter === "pending" && item.status === "paid") {
        return false;
      }
      if (statusFilter === "paid" && item.status !== "paid") {
        return false;
      }
      return true;
    });
  }, [credits, activeTab, statusFilter]);

  // Mark as Paid handler
  const handleMarkPaid = async (id: string) => {
    try {
      triggerHaptic("light");
      const res = await fetch(`/api/credits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });

      if (res.ok) {
        triggerHaptic("success");
        setPaidToast(true);
        setTimeout(() => setPaidToast(false), 2000);
        fetchCredits();
      } else {
        alert("ไม่สามารถอัปเดตสถานะได้");
      }
    } catch (error) {
      console.error("Failed to mark credit as paid:", error);
    }
  };

  // Open AI Reminder modal
  const handleOpenReminder = (credit: Credit) => {
    setReminderCredit(credit);
    setReminderModalOpen(true);
  };

  // Open Add modal with specified default type
  const handleOpenAddModal = (type: "debtor" | "creditor" = "debtor") => {
    setAddModalType(type);
    setAddModalOpen(true);
  };

  return (
    <>
      <PullToRefresh onRefresh={fetchCredits}>
        <div className="space-y-6 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1 rounded-xl shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate">สมุดหนี้สิน & ลูกหนี้</h1>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">จัดการยอดค้างรับ-ค้างจ่าย พร้อม AI ทวงหนี้</p>
              </div>
            </div>

            <Button
              onClick={() => handleOpenAddModal(activeTab === "creditor" ? "creditor" : "debtor")}
              size="sm"
              className="gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 text-xs shrink-0 shadow-xs h-9"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>บันทึกรายการ</span>
            </Button>
          </div>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <Card
              onClick={() => {
                setActiveTab("debtor");
                triggerHaptic("light");
              }}
              className={cn(
                "cursor-pointer border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl transition-all",
                activeTab === "debtor"
                  ? "bg-gradient-to-br from-amber-500/10 to-amber-600/5 ring-2 ring-amber-500/30"
                  : "bg-white hover:bg-slate-50/80"
              )}
            >
              <CardContent className="p-3.5 sm:p-4 space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-600 flex items-center gap-1 truncate">
                    <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    ค้างรับ (ลูกหนี้)
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 self-start sm:self-auto shrink-0">
                    {stats.debtorCount} รายการ
                  </span>
                </div>
                <p className="text-base sm:text-xl font-extrabold text-amber-600 font-number">
                  {formatCurrency(stats.totalDebtorPending)}
                </p>
              </CardContent>
            </Card>

            <Card
              onClick={() => {
                setActiveTab("creditor");
                triggerHaptic("light");
              }}
              className={cn(
                "cursor-pointer border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl transition-all",
                activeTab === "creditor"
                  ? "bg-gradient-to-br from-blue-500/10 to-blue-600/5 ring-2 ring-blue-500/30"
                  : "bg-white hover:bg-slate-50/80"
              )}
            >
              <CardContent className="p-3.5 sm:p-4 space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-600 flex items-center gap-1 truncate">
                    <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    ค้างจ่าย (เจ้าหนี้)
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 self-start sm:self-auto shrink-0">
                    {stats.creditorCount} รายการ
                  </span>
                </div>
                <p className="text-base sm:text-xl font-extrabold text-blue-600 font-number">
                  {formatCurrency(stats.totalCreditorPending)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Tabs & Status Filter */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              {/* Type Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                <button
                  onClick={() => {
                    setActiveTab("debtor");
                    triggerHaptic("light");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === "debtor"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  ลูกหนี้ (ค้างรับ)
                </button>
                <button
                  onClick={() => {
                    setActiveTab("creditor");
                    triggerHaptic("light");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === "creditor"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  เจ้าหนี้ (ค้างจ่าย)
                </button>
                <button
                  onClick={() => {
                    setActiveTab("all");
                    triggerHaptic("light");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === "all"
                      ? "bg-slate-800 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  ทั้งหมด
                </button>
              </div>

              {/* Status Filter Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => {
                    setStatusFilter("pending");
                    triggerHaptic("light");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    statusFilter === "pending"
                      ? "bg-white text-slate-800 shadow-xs"
                      : "text-slate-500"
                  }`}
                >
                  ค้างอยู่
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("paid");
                    triggerHaptic("light");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    statusFilter === "paid"
                      ? "bg-white text-slate-800 shadow-xs"
                      : "text-slate-500"
                  }`}
                >
                  ชำระแล้ว
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    triggerHaptic("light");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    statusFilter === "all"
                      ? "bg-white text-slate-800 shadow-xs"
                      : "text-slate-500"
                  }`}
                >
                  ทั้งหมด
                </button>
              </div>
            </div>

            {/* List Content */}
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs">กำลังโหลดข้อมูล...</span>
              </div>
            ) : filteredCredits.length === 0 ? (
              <Card className="border-dashed border-2 border-slate-200 bg-white rounded-2xl">
                <CardContent className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-700">ยังไม่มีรายการบันทึก</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {activeTab === "debtor"
                        ? "บันทึกลูกหนี้เพื่อติดตามยอดค้างชำระและส่งข้อความทวงหนี้ผ่าน LINE"
                        : "บันทึกเจ้าหนี้หรือซัพพลายเออร์เพื่อติดตามกำหนดชำระ"}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleOpenAddModal(activeTab === "creditor" ? "creditor" : "debtor")}
                    size="sm"
                    className="rounded-xl text-xs bg-slate-900 text-white hover:bg-slate-800 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    เพิ่มรายการแรก
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredCredits.map((credit) => (
                  <CreditCard
                    key={credit.id}
                    credit={credit}
                    onMarkPaid={handleMarkPaid}
                    onOpenReminder={handleOpenReminder}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>

      {/* Add Modal */}
      <AddCreditModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={fetchCredits}
        initialType={addModalType}
      />

      {/* AI Reminder Modal */}
      <AiReminderModal
        open={reminderModalOpen}
        onOpenChange={setReminderModalOpen}
        credit={reminderCredit}
      />

      {/* Paid Success Overlay Toast */}
      {paidToast && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-9 h-9" strokeWidth={2.5} />
            </div>
            <p className="text-sm font-bold text-slate-800">บันทึกชำระหนี้เรียบร้อยแล้ว!</p>
          </div>
        </div>
      )}
    </>
  );
}
