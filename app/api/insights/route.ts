import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, insights } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { generateInsights } from "@/lib/ai/slip-extraction";

export async function GET() {
  try {
    const { shop } = await requireAuth();

    const latest = await db
      .select()
      .from(insights)
      .where(eq(insights.shopId, shop.id))
      .orderBy(desc(insights.generatedAt))
      .limit(3);

    return apiSuccess(latest);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to fetch insights", 500);
  }
}

export async function POST() {
  try {
    const { shop } = await requireAuth();

    const now = new Date();
    // Get first day of previous month
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    // Get first day of current month
    const startOfCurrMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch ALL transactions for the shop to determine monthsOfData
    const allTxs = await db
      .select()
      .from(transactions)
      .where(eq(transactions.shopId, shop.id))
      .orderBy(transactions.occurredAt);

    if (allTxs.length < 3) {
      return apiError("ต้องมีธุรกรรมอย่างน้อย 3 รายการก่อนสร้างคำแนะนำ", 400);
    }

    const firstTxDate = allTxs[0].occurredAt;
    const monthsOfData = Math.max(1, (now.getFullYear() - firstTxDate.getFullYear()) * 12 + now.getMonth() - firstTxDate.getMonth() + 1);

    // Current Month data
    let currIncome = 0;
    let currExpense = 0;
    const currCategoryTotals = new Map<string, number>();

    // Previous Month data
    let prevIncome = 0;
    let prevExpense = 0;
    const prevCategoryTotals = new Map<string, number>();

    allTxs.forEach((t) => {
      const amount = parseFloat(t.amount);
      const isCurrentMonth = t.occurredAt >= startOfCurrMonth;
      const isPrevMonth = t.occurredAt >= startOfPrevMonth && t.occurredAt < startOfCurrMonth;

      if (isCurrentMonth) {
        if (t.type === "income") currIncome += amount;
        else {
          currExpense += amount;
          currCategoryTotals.set(t.category, (currCategoryTotals.get(t.category) ?? 0) + amount);
        }
      } else if (isPrevMonth) {
        if (t.type === "income") prevIncome += amount;
        else {
          prevExpense += amount;
          prevCategoryTotals.set(t.category, (prevCategoryTotals.get(t.category) ?? 0) + amount);
        }
      }
    });

    const currProfit = currIncome - currExpense;
    const prevProfit = prevIncome - prevExpense;

    let profitChangePct = 0;
    if (prevProfit !== 0) {
      profitChangePct = ((currProfit - prevProfit) / Math.abs(prevProfit)) * 100;
    } else if (currProfit > 0) {
      profitChangePct = 100;
    } else if (currProfit < 0) {
      profitChangePct = -100;
    }

    let topCategory: string | null = null;
    let topCategoryAmount = 0;
    for (const [cat, amt] of currCategoryTotals.entries()) {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategory = cat;
      }
    }

    let topCategoryChangePct: number | null = null;
    if (topCategory) {
      const prevTopAmount = prevCategoryTotals.get(topCategory) || 0;
      if (prevTopAmount !== 0) {
        topCategoryChangePct = ((topCategoryAmount - prevTopAmount) / prevTopAmount) * 100;
      } else if (topCategoryAmount > 0) {
        topCategoryChangePct = 100;
      }
    }

    let prefsText = "";
    const prefs = shop.preferences as any;
    if (prefs) {
      prefsText = `โปรไฟล์พฤติกรรมผู้ใช้ (สำคัญมาก! ใช้อ้างอิงการให้คำแนะนำ):\n- เป้าหมายงบใช้จ่ายต่อวัน: ${prefs.dailyBudget} บาท\n- โซนที่พักอาศัย/ค่าครองชีพ: ${prefs.location}\n- สถานะครอบครัว/ภาระ: ${prefs.familyStatus}\n- ลักษณะอาชีพ/รายได้: ${prefs.jobStatus}`;
    }

    const facts = {
      income: currIncome,
      expense: currExpense,
      profit: currProfit,
      profitChangePct,
      topCategory,
      topCategoryAmount,
      topCategoryChangePct,
      monthsOfData,
      preferencesText: prefsText,
    };

    const generated = await generateInsights(facts);

    const inserted = await db
      .insert(insights)
      .values(
        generated.map((g) => ({
          shopId: shop.id,
          content: g.content,
          metadata: g.metadata ?? null,
        }))
      )
      .returning();

    return apiSuccess(inserted, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to generate insights", 500);
  }
}
