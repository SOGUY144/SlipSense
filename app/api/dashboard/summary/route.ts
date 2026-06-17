import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function GET(request: Request) {
  try {
    const { shop } = await requireAuth();
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()));
    const month = parseInt(
      searchParams.get("month") ?? String(now.getMonth() + 1)
    );

    const current = getMonthRange(year, month);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const previous = getMonthRange(prevYear, prevMonth);

    const [currentTxs, previousTxs, recentTxs] = await Promise.all([
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.shopId, shop.id),
            gte(transactions.occurredAt, current.start),
            lte(transactions.occurredAt, current.end)
          )
        ),
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.shopId, shop.id),
            gte(transactions.occurredAt, previous.start),
            lte(transactions.occurredAt, previous.end)
          )
        ),
      db
        .select()
        .from(transactions)
        .where(eq(transactions.shopId, shop.id))
        .orderBy(desc(transactions.createdAt), desc(transactions.occurredAt))
        .limit(10),
    ]);

    const sumByType = (txs: typeof currentTxs) => ({
      income: txs
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + parseFloat(t.amount), 0),
      expense: txs
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + parseFloat(t.amount), 0),
    });

    const currentSums = sumByType(currentTxs);
    const previousSums = sumByType(previousTxs);

    const currentProfit = currentSums.income - currentSums.expense;
    const previousProfit = previousSums.income - previousSums.expense;

    const profitChange =
      previousProfit !== 0
        ? ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100
        : currentProfit > 0
          ? 100
          : 0;

    return apiSuccess({
      shopName: shop.name,
      current: {
        income: currentSums.income,
        expense: currentSums.expense,
        profit: currentProfit,
      },
      previous: {
        income: previousSums.income,
        expense: previousSums.expense,
        profit: previousProfit,
      },
      profitChangePercent: profitChange,
      recentTransactions: recentTxs,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to fetch summary", 500);
  }
}
