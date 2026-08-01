import { eq, and, gte, lte, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, dailyShifts, transactionItems } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { shop } = await requireAuth();

    const now = new Date();
    let monthsBack = 6;

    // Find the earliest transaction to determine how far back to go
    const earliestTx = await db
      .select({ occurredAt: transactions.occurredAt })
      .from(transactions)
      .where(
        and(
          eq(transactions.shopId, shop.id),
          eq(transactions.isPersonal, false)
        )
      )
      .orderBy(asc(transactions.occurredAt))
      .limit(1);

    if (earliestTx.length > 0) {
      const firstDate = new Date(earliestTx[0].occurredAt);
      const diffMonths =
        (now.getFullYear() - firstDate.getFullYear()) * 12 +
        (now.getMonth() - firstDate.getMonth()) +
        1;
      // Show at least 6 months, or more if data exists (up to 60 months)
      monthsBack = Math.max(6, Math.min(diffMonths, 60));
    }

    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);

    // Single query for all non-personal transactions over the requested timeframe (eliminates N+1 loop)
    const allRecentTxs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.shopId, shop.id),
          eq(transactions.isPersonal, false),
          gte(transactions.occurredAt, startDate)
        )
      );

    const monthlyData = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);

      const txs = allRecentTxs.filter((t) => {
        const txDate = new Date(t.occurredAt);
        return txDate >= start && txDate <= end;
      });

      const income = txs
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + parseFloat(t.amount), 0);
      const expense = txs
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + parseFloat(t.amount), 0);

      monthlyData.push({
        month: `${month}/${year}`,
        monthLabel: new Intl.DateTimeFormat("th-TH", {
          month: "short",
          year: "2-digit",
        }).format(start),
        income,
        expense,
        profit: income - expense,
      });
    }

    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const currentTxs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.shopId, shop.id),
          eq(transactions.isPersonal, false),
          gte(transactions.occurredAt, currentStart),
          lte(transactions.occurredAt, currentEnd)
        )
      );

    const categoryMap = new Map<string, number>();
    currentTxs
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const current = categoryMap.get(t.category) ?? 0;
        categoryMap.set(t.category, current + parseFloat(t.amount));
      });

    const totalExpense = Array.from(categoryMap.values()).reduce(
      (s, v) => s + v,
      0
    );

    const categoryBreakdown = Array.from(categoryMap.entries()).map(
      ([category, amount]) => ({
        category,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      })
    );

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyMap = new Map<number, { income: number; expense: number }>();
    for (let i = 1; i <= daysInMonth; i++) dailyMap.set(i, { income: 0, expense: 0 });

    currentTxs.forEach((t) => {
      const day = new Date(t.occurredAt).getDate();
      const amount = parseFloat(t.amount);
      const current = dailyMap.get(day)!;
      if (t.type === "income") current.income += amount;
      if (t.type === "expense") current.expense += amount;
    });

    const dailyTrend = Array.from(dailyMap.entries()).map(([day, data]) => ({
      day: `${day} ${new Intl.DateTimeFormat("th-TH", { month: "short" }).format(now)}`,
      income: data.income,
      expense: data.expense,
    })).filter((d, i) => i < now.getDate()); // Only show up to current day

    // Calculate Day of Week average income (Last 6 Months)
    const daysOfWeek = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
    const dowMap = new Map<number, { income: number; count: number; datesMap: Map<string, number> }>();
    for (let i = 0; i < 7; i++) dowMap.set(i, { income: 0, count: 0, datesMap: new Map() });

    const allRecentTxs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.shopId, shop.id),
          eq(transactions.isPersonal, false),
          gte(transactions.occurredAt, new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1))
        )
      );

    allRecentTxs.filter(t => t.type === "income").forEach((t) => {
      const d = new Date(t.occurredAt);
      const dow = d.getDay();
      const dateStr = d.toISOString().split('T')[0];
      
      const current = dowMap.get(dow)!;
      current.income += parseFloat(t.amount);
      current.count += 1;
      
      const existingDateIncome = current.datesMap.get(dateStr) || 0;
      current.datesMap.set(dateStr, existingDateIncome + parseFloat(t.amount));
    });

    const dayOfWeekTrend = Array.from(dowMap.entries()).map(([dow, data]) => {
      const topDates = Array.from(data.datesMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([date, income]) => ({ date, income }));

      return {
        dayName: daysOfWeek[dow],
        income: data.income,
        topDates,
      };
    });

    // 1. Calculate Hourly Trend & Peak Hours
    const hourlyBuckets = [
      { label: "06:00 - 08:00", isMatch: (h: number) => h >= 6 && h < 8, income: 0 },
      { label: "08:00 - 10:00", isMatch: (h: number) => h >= 8 && h < 10, income: 0 },
      { label: "10:00 - 12:00", isMatch: (h: number) => h >= 10 && h < 12, income: 0 },
      { label: "12:00 - 14:00", isMatch: (h: number) => h >= 12 && h < 14, income: 0 },
      { label: "14:00 - 16:00", isMatch: (h: number) => h >= 14 && h < 16, income: 0 },
      { label: "16:00 - 18:00", isMatch: (h: number) => h >= 16 && h < 18, income: 0 },
      { label: "18:00 - 20:00", isMatch: (h: number) => h >= 18 && h < 20, income: 0 },
      { label: "20:00 - 22:00", isMatch: (h: number) => h >= 20 && h < 22, income: 0 },
      { label: "22:00 - 06:00", isMatch: (h: number) => h >= 22 || h < 6, income: 0 },
    ];

    allRecentTxs
      .filter((t) => t.type === "income")
      .forEach((t) => {
        const hour = new Date(t.occurredAt).getHours();
        const bucket = hourlyBuckets.find((b) => b.isMatch(hour));
        if (bucket) {
          bucket.income += parseFloat(t.amount);
        }
      });

    const maxBucket = [...hourlyBuckets].sort((a, b) => b.income - a.income)[0];
    const peakHourLabel =
      maxBucket && maxBucket.income > 0 ? `${maxBucket.label} น.` : null;
    const hourlyTrend = hourlyBuckets.map((b) => ({
      hourLabel: b.label,
      timeSlot: b.label,
      income: b.income,
    }));

    // 2. Query Supplier Spend Breakdown
    const supplierItems = await db
      .select({
        supplierName: transactionItems.supplierName,
        totalSpend: sql<number>`sum(${transactionItems.totalAmount})`,
      })
      .from(transactionItems)
      .where(eq(transactionItems.shopId, shop.id))
      .groupBy(transactionItems.supplierName);

    const totalSupplierSpend = supplierItems.reduce(
      (sum, item) => sum + Number(item.totalSpend || 0),
      0
    );
    const supplierBreakdown = supplierItems.map((item) => ({
      supplierName: item.supplierName || "ไม่ระบุชื่อซัพพลายเออร์",
      amount: Number(item.totalSpend || 0),
      percentage:
        totalSupplierSpend > 0
          ? (Number(item.totalSpend || 0) / totalSupplierSpend) * 100
          : 0,
    }));

    // 3. Query Payment Method Breakdown (Transfer vs Cash)
    const shifts = await db
      .select()
      .from(dailyShifts)
      .where(eq(dailyShifts.shopId, shop.id));

    const totalCash = shifts.reduce(
      (sum, s) => sum + Number(s.cashTotal || 0),
      0
    );
    const totalTransfer = shifts.reduce(
      (sum, s) => sum + Number(s.transferTotal || 0),
      0
    );
    const totalPayment = totalCash + totalTransfer;

    const paymentMethodBreakdown = [
      {
        method: "สแกนโอน PromptPay (สลิป)",
        amount: totalTransfer,
        percentage:
          totalPayment > 0 ? (totalTransfer / totalPayment) * 100 : 0,
      },
      {
        method: "เงินสดในเกะ",
        amount: totalCash,
        percentage: totalPayment > 0 ? (totalCash / totalPayment) * 100 : 0,
      },
    ].filter((p) => p.amount > 0);

    return apiSuccess({
      monthly: monthlyData,
      categoryBreakdown,
      totalExpense,
      dailyTrend,
      dayOfWeekTrend,
      hourlyTrend,
      peakHourLabel,
      supplierBreakdown,
      paymentMethodBreakdown,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to fetch analytics", 500);
  }
}

