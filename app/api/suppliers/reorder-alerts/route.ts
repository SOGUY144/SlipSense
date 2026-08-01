import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { reorderCycles, transactionItems } from "@/lib/db/schema";
import { eq, and, lte, desc } from "drizzle-orm";

export async function GET() {
  try {
    const { shop } = await requireAuth();
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    // Fetch items due for reordering within 2 days
    let alerts = await db
      .select()
      .from(reorderCycles)
      .where(
        and(
          eq(reorderCycles.shopId, shop.id),
          lte(reorderCycles.nextDueDate, twoDaysLater)
        )
      )
      .orderBy(desc(reorderCycles.nextDueDate));

    // Fallback: If no reorder_cycles record exists yet, derive top items from transaction_items
    if (alerts.length === 0) {
      const recentItems = await db
        .select()
        .from(transactionItems)
        .where(eq(transactionItems.shopId, shop.id))
        .orderBy(desc(transactionItems.createdAt))
        .limit(3);

      alerts = recentItems.map((item) => ({
        id: item.id,
        shopId: item.shopId,
        itemName: item.itemName,
        averageIntervalDays: 10,
        lastPurchasedAt: item.createdAt,
        nextDueDate: new Date(new Date(item.createdAt).getTime() + 10 * 24 * 60 * 60 * 1000),
        supplierName: item.supplierName,
        createdAt: item.createdAt,
      }));
    }

    return apiSuccess(alerts);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("GET reorder-alerts error:", error);
    return apiError("Failed to fetch reorder alerts", 500);
  }
}
