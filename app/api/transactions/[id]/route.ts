import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { transactionSchema } from "@/lib/validations/schemas";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { shop } = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = transactionSchema.partial().parse(body);

    const [updated] = await db
      .update(transactions)
      .set({
        ...(parsed.type && { type: parsed.type }),
        ...(parsed.category && { category: parsed.category }),
        ...(parsed.amount && { amount: parsed.amount.toString() }),
        ...(parsed.occurredAt && { occurredAt: new Date(parsed.occurredAt) }),
        ...(parsed.sender !== undefined && {
          sender: parsed.sender,
        }),
        ...(parsed.receiver !== undefined && {
          receiver: parsed.receiver,
        }),
        ...(parsed.note !== undefined && { note: parsed.note }),
        ...(parsed.confidence && { confidence: parsed.confidence }),
      })
      .where(and(eq(transactions.id, id), eq(transactions.shopId, shop.id)))
      .returning();

    if (!updated) {
      return apiError("Transaction not found", 404);
    }

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to update transaction", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { shop } = await requireAuth();
    const { id } = await params;

    const [deleted] = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.shopId, shop.id)))
      .returning();

    if (!deleted) {
      return apiError("Transaction not found", 404);
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to delete transaction", 500);
  }
}
