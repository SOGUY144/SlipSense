"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { ALL_CATEGORIES } from "@/lib/validations/schemas";
import type { Transaction } from "@/lib/db/schema";

export default function TransactionsPage() {
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
      <div>
        <h1 className="text-xl font-bold">รายการธุรกรรม</h1>
        <p className="text-sm text-muted-foreground">
          {transactions.length} รายการ
        </p>
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
        <p className="text-center text-muted-foreground py-10">กำลังโหลด...</p>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            ไม่มีรายการ
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <Card key={tx.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{tx.category}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {tx.counterparty ?? "—"} · {formatDate(tx.occurredAt)}
                  </p>
                  {tx.note && (
                    <p className="text-xs text-muted-foreground truncate">
                      {tx.note}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <p
                    className={`font-semibold whitespace-nowrap ${
                      tx.type === "income"
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {formatCurrency(parseFloat(tx.amount))}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(tx.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
