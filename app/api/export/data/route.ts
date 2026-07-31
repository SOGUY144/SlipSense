import { requireAuth } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { shop } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const type = searchParams.get("type"); // "income" or "expense"

    if (!month || !year || !type) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 1);

    const txs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.shopId, shop.id),
          eq(transactions.type, type as "income" | "expense"),
          gte(transactions.occurredAt, startDate),
          lt(transactions.occurredAt, endDate)
        )
      )
      .orderBy(desc(transactions.occurredAt));

    return NextResponse.json({ shopName: shop.name, transactions: txs });
  } catch (error) {
    console.error("Export data error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
