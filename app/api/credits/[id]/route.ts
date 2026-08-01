import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { credits, transactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { shop } = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const existing = await db.query.credits.findFirst({
      where: and(eq(credits.id, id), eq(credits.shopId, shop.id)),
    });

    if (!existing) {
      return apiError("Credit record not found", 404);
    }

    let linkedTxId = existing.transactionId;

    // If changing to 'paid' and not previously linked/paid, create a transaction record
    if (body.status === "paid" && existing.status !== "paid") {
      const [tx] = await db
        .insert(transactions)
        .values({
          shopId: shop.id,
          type: existing.type === "debtor" ? "income" : "expense",
          category: existing.type === "debtor" ? "รับชำระหนี้" : "จ่ายชำระหนี้",
          amount: existing.amount,
          occurredAt: new Date(),
          note: `ชำระหนี้: ${existing.contactName}${existing.description ? ` (${existing.description})` : ""}`,
          isPersonal: false,
        })
        .returning();
      linkedTxId = tx.id;
    }

    const [updated] = await db
      .update(credits)
      .set({
        status: body.status || existing.status,
        paidAt: body.status === "paid" ? new Date() : existing.paidAt,
        transactionId: linkedTxId,
      })
      .where(eq(credits.id, id))
      .returning();

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("PATCH credits error:", error);
    return apiError("Failed to update credit status", 500);
  }
}
