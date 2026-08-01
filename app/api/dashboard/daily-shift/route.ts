import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { dailyShifts, transactions } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

function getDayRange(dateStr?: string | null) {
  let year: number;
  let month: number;
  let day: number;

  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split("-").map(Number);
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth();
    day = now.getDate();
  }

  const startOfDay = new Date(year, month, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month, day, 23, 59, 59, 999);
  return { startOfDay, endOfDay };
}

export async function GET(req: Request) {
  try {
    const { shop } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    const { startOfDay, endOfDay } = getDayRange(dateStr);

    const shift = await db.query.dailyShifts.findFirst({
      where: and(
        eq(dailyShifts.shopId, shop.id),
        gte(dailyShifts.shiftDate, startOfDay),
        lte(dailyShifts.shiftDate, endOfDay)
      ),
    });

    // Auto-calculate transfer income (type = 'income', isPersonal = false)
    const transferRes = await db
      .select({ total: sql<number>`sum(${transactions.amount})` })
      .from(transactions)
      .where(
        and(
          eq(transactions.shopId, shop.id),
          eq(transactions.type, "income"),
          eq(transactions.isPersonal, false),
          gte(transactions.occurredAt, startOfDay),
          lte(transactions.occurredAt, endOfDay)
        )
      );

    const transferTotal = Number(transferRes[0]?.total || 0);

    return apiSuccess({
      shift: shift || null,
      calculatedTransferTotal: transferTotal,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("GET daily-shift error:", error);
    return apiError("Failed to fetch daily shift", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { shop } = await requireAuth();
    const body = await req.json();
    const { shiftDate, cashTotal, notes } = body;

    const { startOfDay, endOfDay } = getDayRange(shiftDate);

    // Calculate promptpay transfer total from verified non-personal income
    const transferRes = await db
      .select({ total: sql<number>`sum(${transactions.amount})` })
      .from(transactions)
      .where(
        and(
          eq(transactions.shopId, shop.id),
          eq(transactions.type, "income"),
          eq(transactions.isPersonal, false),
          gte(transactions.occurredAt, startOfDay),
          lte(transactions.occurredAt, endOfDay)
        )
      );

    const transferTotal = Number(transferRes[0]?.total || 0);
    const cash = Number(cashTotal || 0);
    const grossTotal = transferTotal + cash;

    // Check existing shift
    const existing = await db.query.dailyShifts.findFirst({
      where: and(
        eq(dailyShifts.shopId, shop.id),
        gte(dailyShifts.shiftDate, startOfDay),
        lte(dailyShifts.shiftDate, endOfDay)
      ),
    });

    let result;
    if (existing) {
      const [updated] = await db
        .update(dailyShifts)
        .set({
          transferTotal: String(transferTotal),
          cashTotal: String(cash),
          grossTotal: String(grossTotal),
          notes: notes || null,
        })
        .where(eq(dailyShifts.id, existing.id))
        .returning();
      result = updated;
    } else {
      const [inserted] = await db
        .insert(dailyShifts)
        .values({
          shopId: shop.id,
          shiftDate: startOfDay,
          transferTotal: String(transferTotal),
          cashTotal: String(cash),
          grossTotal: String(grossTotal),
          notes: notes || null,
        })
        .returning();
      result = inserted;
    }

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("POST daily-shift error:", error);
    return apiError("Failed to save daily shift", 500);
  }
}
