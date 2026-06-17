import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { transactionSchema } from "@/lib/validations/schemas";

export async function GET(request: Request) {
  try {
    const { shop } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const conditions = [eq(transactions.shopId, shop.id)];

    if (type === "income" || type === "expense") {
      conditions.push(eq(transactions.type, type));
    }
    if (category) {
      conditions.push(eq(transactions.category, category));
    }

    const result = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.createdAt), desc(transactions.occurredAt))
      .limit(limit);

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to fetch transactions", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { shop } = await requireAuth();
    const body = await request.json();
    const parsed = transactionSchema.parse(body);

    const [transaction] = await db
      .insert(transactions)
      .values({
        shopId: shop.id,
        slipJobId: parsed.slipJobId ?? null,
        type: parsed.type,
        category: parsed.category,
        amount: parsed.amount.toString(),
        occurredAt: new Date(parsed.occurredAt),
        counterparty: parsed.counterparty ?? null,
        note: parsed.note ?? null,
        confidence: parsed.confidence ?? null,
      })
      .returning();

    return apiSuccess(transaction, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to create transaction", 500);
  }
}
