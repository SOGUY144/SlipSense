"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsCharts } from "@/components/charts/analytics-charts";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface AnalyticsData {
  monthly: Array<{
    monthLabel: string;
    income: number;
    expense: number;
    profit: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  dailyTrend: Array<{
    day: string;
    income: number;
    expense: number;
  }>;
  dayOfWeekTrend: Array<{
    dayName: string;
    income: number;
  }>;
  totalExpense: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        setData(await res.json());
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">กำลังโหลด...</p>
      </div>
    );
  }

  const currentMonth = data?.monthly[data.monthly.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">วิเคราะห์การเงิน</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `ภาพรวม ${data.monthly.length} เดือนย้อนหลัง` : "กำลังโหลดข้อมูล..."}
          </p>
        </div>
        <Link href="/report">
          <Button size="sm" variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            PDF รายงาน
          </Button>
        </Link>
      </div>

      {currentMonth && (
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">รายรับ</p>
              <p className="text-sm font-bold text-success">
                {formatCurrency(currentMonth.income)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">รายจ่าย</p>
              <p className="text-sm font-bold text-destructive">
                {formatCurrency(currentMonth.expense)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">กำไร</p>
              <p className="text-sm font-bold text-primary">
                {formatCurrency(currentMonth.profit)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {data && (
        <AnalyticsCharts
          monthly={data.monthly}
          categoryBreakdown={data.categoryBreakdown}
          dailyTrend={data.dailyTrend}
          dayOfWeekTrend={data.dayOfWeekTrend}
        />
      )}

      {!data?.monthly.some((m) => m.income > 0 || m.expense > 0) && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            ยังไม่มีข้อมูล — อัปโหลดสลิปหรือโหลดข้อมูลตัวอย่างจากหน้าตั้งค่า
          </CardContent>
        </Card>
      )}
    </div>
  );
}
