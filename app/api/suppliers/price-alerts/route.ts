import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { transactionItems } from "@/lib/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";

export async function GET() {
  try {
    const { shop } = await requireAuth();

    const alerts = await db
      .select()
      .from(transactionItems)
      .where(
        and(
          eq(transactionItems.shopId, shop.id),
          gt(transactionItems.priceChangePercent, "0")
        )
      )
      .orderBy(desc(transactionItems.createdAt))
      .limit(10);

    return apiSuccess(alerts);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("GET price-alerts error:", error);
    return apiError("Failed to fetch price alerts", 500);
  }
}
