import { db } from "@/lib/db";
import { transactions, slipJobs, ingredients } from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";
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
    
    let transactionsToInsert = [];

    if (body.jobIds && Array.isArray(body.jobIds)) {
      // Support old format: { jobIds: string[] }
      const jobs = await db.query.slipJobs.findMany({
        where: (table, { eq, inArray, and }) => and(
          eq(table.shopId, shop.id),
          inArray(table.id, body.jobIds),
          eq(table.status, "done")
        )
      });

      if (jobs.length === 0) {
        return apiError("No valid slip jobs found", 400);
      }

      transactionsToInsert = jobs.map((job) => {
        const data = job.extractedData as any;
        return {
          slipJobId: job.id,
          type: data.type || "expense",
          category: data.category || "อื่นๆ",
          amount: data.amount || 0,
          occurredAt: data.occurredAt || new Date().toISOString(),
          sender: data.sender || null,
          receiver: data.receiver || null,
          note: data.note || null,
          confidence: job.confidence || null,
        };
      });
    } else {
      // Support new format: { transactions: [...] }
      const parsed = batchTransactionSchema.safeParse(body);
      
      if (!parsed.success) {
        console.error("Batch save validation error:", parsed.error);
        return apiError("Invalid transactions payload", 400);
      }

      if (parsed.data.transactions.length === 0) {
        return apiError("No transactions provided", 400);
      }

      transactionsToInsert = parsed.data.transactions;
    }

    const insertData = transactionsToInsert.map((t: any) => ({
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
      transRef: t.transRef ?? null,
      riskScore: t.riskScore ?? 0,
      riskLevel: t.riskLevel ?? "low",
      riskReasons: t.riskReasons ?? [],
    }));

    const insertedTransactions = await db
      .insert(transactions)
      .values(insertData)
      .onConflictDoNothing({ target: transactions.transRef })
      .returning();

    // Auto-Sync Ingredient Cost: for expense transactions that came from a bill/receipt,
    // upsert the ingredient unit cost using the receiver name as ingredient name.
    const expenseTxs = insertedTransactions.filter(
      (t) => t.type === "expense" && (t.receiver || t.category)
    );

    if (expenseTxs.length > 0) {
      for (const tx of expenseTxs) {
        const ingredientName = (tx.receiver || tx.category || "").trim();
        if (!ingredientName || ingredientName.length < 2) continue;

        const amount = parseFloat(tx.amount);
        if (!amount || amount <= 0) continue;

        // Default unit cost = total amount (assume 1 unit per transaction)
        const costPerUnit = amount;

        const existing = await db.query.ingredients.findFirst({
          where: and(
            eq(ingredients.shopId, shop.id),
            eq(ingredients.name, ingredientName)
          ),
        });

        if (existing) {
          // Update to latest price from this slip
          await db
            .update(ingredients)
            .set({ costPerUnit: String(costPerUnit) })
            .where(and(eq(ingredients.shopId, shop.id), eq(ingredients.name, ingredientName)));
        } else {
          // Create new ingredient entry
          await db.insert(ingredients).values({
            shopId: shop.id,
            name: ingredientName,
            unit: "ชุด",
            costPerUnit: String(costPerUnit),
          }).onConflictDoNothing();
        }
      }
    }

    return apiSuccess(insertedTransactions, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to batch create transactions", 500);
  }
}
