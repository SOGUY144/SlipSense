import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { transactionItems } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const { shop } = await requireAuth();

    const supplierSummary = await db
      .select({
        supplierName: transactionItems.supplierName,
        totalSpend: sql<number>`sum(${transactionItems.totalAmount})`,
        itemCount: sql<number>`count(*)`,
      })
      .from(transactionItems)
      .where(eq(transactionItems.shopId, shop.id))
      .groupBy(transactionItems.supplierName)
      .orderBy(sql`sum(${transactionItems.totalAmount}) DESC`);

    return apiSuccess(supplierSummary);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("GET supplier analytics error:", error);
    return apiError("Failed to fetch supplier analytics", 500);
  }
}
