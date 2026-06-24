import { eq, and, gte, lte, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
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
      .where(eq(transactions.shopId, shop.id))
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

    const monthlyData = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);

      const txs = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.shopId, shop.id),
            gte(transactions.occurredAt, start),
            lte(transactions.occurredAt, end)
          )
        );

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

    return apiSuccess({
      monthly: monthlyData,
      categoryBreakdown,
      totalExpense,
      dailyTrend,
      dayOfWeekTrend,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to fetch analytics", 500);
  }
}
