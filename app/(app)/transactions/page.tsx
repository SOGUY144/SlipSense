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
        <Card className="border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white rounded-3xl mt-8">
          <CardContent className="py-16 text-center text-slate-500 flex flex-col items-center">
            <div className="p-5 bg-slate-50 rounded-full mb-4">
              <List className="h-12 w-12 text-slate-300" strokeWidth={1.5} />
            </div>
            <p className="font-semibold text-slate-700">ยังไม่มีรายการในหมวดนี้</p>
            <p className="text-sm mt-1">ลองเปลี่ยนตัวกรอง หรือเพิ่มรายการใหม่</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="divide-y divide-slate-50">
            {transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between p-4 px-5 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                onClick={() => router.push(`/transactions/${tx.id}`)}
              >
                <div className="flex-1 min-w-0 flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100/50' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100/50'}`}>
                    <div className="w-5 h-5 flex items-center justify-center font-bold text-lg leading-none">
                      {tx.type === 'income' ? '+' : '-'}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-slate-800 truncate">{tx.category}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                      {(tx.type === "income" ? tx.sender : tx.receiver) ?? "—"} · {formatDate(tx.occurredAt)}
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
                      className={`font-bold tracking-tight font-number ${
                        tx.type === "income"
                          ? "text-emerald-600"
                          : "text-slate-800"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatCurrency(parseFloat(tx.amount))}
                    </p>
                    <div className="flex items-center text-[10px] text-primary mt-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                      รายละเอียด <ChevronRight className="h-3 w-3 ml-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
