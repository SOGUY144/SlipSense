import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { billReminders, transactions } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { shop } = await requireAuth();

    const reminders = await db.query.billReminders.findMany({
      where: and(eq(billReminders.shopId, shop.id), eq(billReminders.isActive, true)),
    });

    if (reminders.length === 0) {
      return NextResponse.json({ alerts: [] });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const txs = await db.query.transactions.findMany({
      where: and(
        eq(transactions.shopId, shop.id),
        gte(transactions.occurredAt, startOfMonth),
        lte(transactions.occurredAt, endOfMonth)
      ),
    });

    const alerts = [];
    const currentDay = now.getDate();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (const reminder of reminders) {
      // User manually marked as paid this month
      if (reminder.lastPaidMonth === currentMonthStr) {
        continue;
      }

      const isPaid = txs.some((tx) => tx.category === reminder.category && tx.type === "expense");

      if (!isPaid) {
        const diff = reminder.dueDay - currentDay;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        let effectiveDiff = diff;
        if (diff < -15) effectiveDiff = diff + daysInMonth;
        if (diff > 15) effectiveDiff = diff - daysInMonth;

        if (effectiveDiff >= -5 && effectiveDiff <= 7) {
          alerts.push({
            id: reminder.id,
            title: reminder.title,
            dueDay: reminder.dueDay,
            amount: reminder.amount,
            daysLeft: effectiveDiff,
          });
        }
      }
    }

    alerts.sort((a, b) => a.daysLeft - b.daysLeft);

    return NextResponse.json({ alerts });
  } catch (error: any) {
    console.error("GET /api/dashboard/reminders-alerts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
