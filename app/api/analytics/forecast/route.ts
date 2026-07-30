import { eq, and, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, billReminders } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { shop } = await requireAuth();

    // 1. Fetch historical transactions from past 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const historicalTxs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.shopId, shop.id),
          gte(transactions.occurredAt, ninetyDaysAgo)
        )
      );

    // 2. Calculate daily income/expense averages
    let totalIncome = 0;
    let totalExpense = 0;
    historicalTxs.forEach((tx) => {
      const amt = parseFloat(tx.amount);
      if (tx.type === "income") totalIncome += amt;
      else totalExpense += amt;
    });

    const daysCount = 90;
    const avgDailyIncome = Math.round(totalIncome / daysCount);
    const avgDailyExpense = Math.round(totalExpense / daysCount);

    // 3. Fetch active billReminders (fixed monthly bills)
    const activeReminders = await db
      .select()
      .from(billReminders)
      .where(and(eq(billReminders.shopId, shop.id), eq(billReminders.isActive, true)));

    // 4. Calculate current running net balance from all historical transactions
    const allTxs = await db
      .select()
      .from(transactions)
      .where(eq(transactions.shopId, shop.id));

    let currentBalance = 0;
    allTxs.forEach((tx) => {
      const amt = parseFloat(tx.amount);
      if (tx.type === "income") currentBalance += amt;
      else currentBalance -= amt;
    });

    // 5. Generate 30-day forecast projection
    const forecast = [];
    let runningBalance = currentBalance;
    let isShortageRisk = false;
    let shortageDate: string | null = null;
    let shortageAmount = 0;

    const today = new Date();

    for (let i = 1; i <= 30; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      const dayOfMonth = targetDate.getDate();
      const dateString = targetDate.toISOString().split("T")[0];

      // Fixed recurring bills due on this day of month
      let scheduledBillAmount = 0;
      activeReminders.forEach((r) => {
        if (r.dueDay === dayOfMonth) {
          scheduledBillAmount += r.amount ? parseFloat(r.amount) : 0;
        }
      });

      const dayIncome = avgDailyIncome;
      const dayExpense = avgDailyExpense + scheduledBillAmount;
      runningBalance = runningBalance + dayIncome - dayExpense;

      if (runningBalance < 0 && !isShortageRisk) {
        isShortageRisk = true;
        shortageDate = dateString;
        shortageAmount = Math.abs(runningBalance);
      }

      forecast.push({
        date: dateString,
        dayLabel: `${targetDate.getDate()}/${targetDate.getMonth() + 1}`,
        projectedIncome: dayIncome,
        projectedExpense: dayExpense,
        projectedBalance: Math.round(runningBalance),
      });
    }

    // 6. Generate AI Recommendation Text
    let recommendation = "กระแสเงินสดอยู่ในเกณฑ์ปกติ คาดการณ์ว่าจะมีสภาพคล่องหมุนเวียนเพียงพอในอีก 30 วันข้างหน้า";

    if (isShortageRisk && shortageDate) {
      const d = new Date(shortageDate);
      const formattedDate = `${d.getDate()}/${d.getMonth() + 1}`;
      recommendation = `⚠️ คาดการณ์ว่าราววันที่ ${formattedDate} อาจมีแนวโน้มเงินหมุนเวียนไม่พอจ่ายประมาณ ฿${shortageAmount.toLocaleString()} แนะนำเร่งติดตามยอดค้างชำระ จัดโปรโมชั่นกระตุ้นยอดขาย หรือชะลอการสั่งซื้อวัตถุดิบช่วงดังกล่าว`;
    }

    return apiSuccess({
      summary: {
        currentBalance: Math.round(currentBalance),
        projected30DayBalance: forecast[forecast.length - 1].projectedBalance,
        avgDailyIncome,
        avgDailyExpense,
        isShortageRisk,
        shortageDate,
        shortageAmount,
        recommendation,
      },
      forecast,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to calculate cash flow forecast", 500);
  }
}
