import { db } from "@/lib/db";
import { transactions, slipJobs } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
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
