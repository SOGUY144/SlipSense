"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportButton } from "@/components/export/export-button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ALL_CATEGORIES } from "@/lib/validations/schemas";
import type { Transaction } from "@/lib/db/schema";

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  async function loadTransactions() {
    const params = new URLSearchParams();
    if (filterType !== "all") params.set("type", filterType);
    if (filterCategory !== "all") params.set("category", filterCategory);

    const res = await fetch(`/api/transactions?${params}`);
    if (res.ok) {
      setTransactions(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterCategory]);

  async function handleDelete(id: string) {
    if (!confirm("ลบรายการนี้?")) return;
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">รายการธุรกรรม</h1>
          <p className="text-sm text-muted-foreground">
            {transactions.length} รายการ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton />
          <Button asChild className="rounded-xl font-medium shadow-sm hover:scale-105 active:scale-95 transition-all">
            <Link href="/transactions/new">
              <Plus className="mr-2 h-4 w-4" /> เพิ่มรายการ
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="ประเภท" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="income">รายรับ</SelectItem>
            <SelectItem value="expense">รายจ่าย</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="หมวด" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกหมวด</SelectItem>
            {ALL_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse">
          <div className="h-8 w-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
          <p className="text-sm font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      ) : transactions.length === 0 ? (
        <Card className="border-none shadow-sm bg-white rounded-[1.5rem] mt-8">
          <CardContent className="py-16 text-center text-slate-500 flex flex-col items-center">
            <div className="p-4 bg-[#F5F5F7] rounded-full mb-4">
              <List className="h-10 w-10 text-slate-400" strokeWidth={1.5} />
            </div>
            <p className="font-semibold text-slate-700">ยังไม่มีรายการในหมวดนี้</p>
            <p className="text-[12px] mt-1">ลองเปลี่ยนตัวกรอง หรือเพิ่มรายการใหม่</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-[1.5rem] shadow-sm overflow-hidden mb-8 px-4">
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between py-3.5 bg-white active:bg-slate-50 transition-colors cursor-pointer group"
                onClick={() => router.push(`/transactions/${tx.id}`)}
              >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-[0.85rem] flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-[#43936C]/10 text-[#43936C]' : 'bg-[#7364E3]/10 text-[#7364E3]'}`}>
                    <div className="w-5 h-5 flex items-center justify-center font-bold text-lg leading-none">
                      {tx.type === 'income' ? '+' : '-'}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-slate-800 truncate">{tx.category}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                      {tx.type === 'income' ? '📥 ' : '📤 '}
                      {(tx.type === "income" ? tx.sender : tx.receiver) ?? "ไม่มีรายละเอียด"}
                    </p>
                    {tx.note && (
                      <p className="text-[10px] text-slate-500 truncate mt-1 bg-slate-50 inline-block px-2 py-0.5 rounded-md border border-slate-100">
                        {tx.note}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <div className="flex flex-col items-end">
                    <p
                      className={`text-[15px] font-bold tracking-tight font-number ${
                        tx.type === "income"
                          ? "text-[#43936C]"
                          : "text-slate-900"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatCurrency(parseFloat(tx.amount))}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(tx.occurredAt)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
