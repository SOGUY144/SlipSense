import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { transactionSchema } from "@/lib/validations/schemas";
import { z } from "zod";

const batchTransactionSchema = z.object({
  transactions: z.array(transactionSchema),
});

export async function POST(request: Request) {
  try {
    const { shop } = await requireAuth();
    const body = await request.json();
    
    // Check if it's the old format { jobIds: [...] } vs new format { transactions: [...] }
    // If we only support the new format, parse it directly:
    const parsed = batchTransactionSchema.safeParse(body);
    
    if (!parsed.success) {
      return apiError("Invalid transactions payload", 400);
    }

    if (parsed.data.transactions.length === 0) {
      return apiError("No transactions provided", 400);
    }

    const insertData = parsed.data.transactions.map((t) => ({
      shopId: shop.id,
      slipJobId: t.slipJobId ?? null,
      type: t.type,
      category: t.category,
      amount: t.amount.toString(),
      occurredAt: new Date(t.occurredAt),
      sender: t.sender ?? null,
      receiver: t.receiver ?? null,
      note: t.note ?? null,
      confidence: t.confidence ?? null,
    }));

    const insertedTransactions = await db
      .insert(transactions)
      .values(insertData)
      .returning();

    return apiSuccess(insertedTransactions, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to batch create transactions", 500);
  }
}
