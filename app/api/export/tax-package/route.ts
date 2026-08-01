import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { shop } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // YYYY-MM

    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return apiError("รูปแบบเดือนไม่ถูกต้อง (ต้องเป็น YYYY-MM)", 400);
    }

    const now = new Date();
    const year = month ? parseInt(month.split("-")[0], 10) : now.getFullYear();
    const monthNum = month ? parseInt(month.split("-")[1], 10) : now.getMonth() + 1;

    const start = new Date(year, monthNum - 1, 1);
    const end = new Date(year, monthNum, 0, 23, 59, 59, 999);

    const taxTxs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.shopId, shop.id),
          eq(transactions.isPersonal, false),
          gte(transactions.occurredAt, start),
          lte(transactions.occurredAt, end)
        )
      );

    let taxInvoices = taxTxs.filter((t) => t.isVatRegistered || t.taxInvoiceNo || t.taxId);
    if (taxInvoices.length === 0) {
      // Fallback: Include all non-personal expense transactions for accountant review
      taxInvoices = taxTxs.filter((t) => t.type === "expense");
    }

    const totalTaxAmount = taxInvoices.reduce((sum, t) => sum + (Number(t.amount) * 0.07 / 1.07), 0);

    return apiSuccess({
      success: true,
      data: {
        shopName: shop.name,
        period: `${monthNum}/${year}`,
        totalTaxInvoicesCount: taxInvoices.length,
        totalTaxAmount: totalTaxAmount.toFixed(2),
        invoices: taxInvoices,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("GET tax-package error:", error);
    return apiError("Failed to export tax package", 500);
  }
}
