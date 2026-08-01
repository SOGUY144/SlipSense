import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, slipJobs } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { transactionSchema } from "@/lib/validations/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, shop } = await requireAuth();
    const { id } = await params;

    const result = await db
      .select()
      .from(transactions)
      .leftJoin(slipJobs, eq(transactions.slipJobId, slipJobs.id))
      .where(and(eq(transactions.id, id), eq(transactions.shopId, shop.id)));

    if (!result || result.length === 0) {
      return apiError("Transaction not found", 404);
    }

    let imageUrl = null;
    if (result[0].slip_jobs?.storagePath) {
      const { data } = await supabase.storage
        .from("slips")
        .createSignedUrl(result[0].slip_jobs.storagePath, 3600);
      imageUrl = data?.signedUrl || null;
    }

    const transaction = {
      ...result[0].transactions,
      imageUrl,
    };

    return apiSuccess(transaction);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to fetch transaction", 500);
  }
}
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
        ...(parsed.taxId !== undefined && { taxId: parsed.taxId }),
        ...(parsed.taxInvoiceNo !== undefined && { taxInvoiceNo: parsed.taxInvoiceNo }),
        ...(parsed.taxInvoiceDate !== undefined && { taxInvoiceDate: parsed.taxInvoiceDate ? new Date(parsed.taxInvoiceDate) : null }),
        ...(parsed.partnerName !== undefined && { partnerName: parsed.partnerName }),
        ...(parsed.partnerAddress !== undefined && { partnerAddress: parsed.partnerAddress }),
        ...(parsed.isVatRegistered !== undefined && { isVatRegistered: parsed.isVatRegistered }),
        ...(typeof body.isPersonal === "boolean" && { isPersonal: body.isPersonal }),
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
