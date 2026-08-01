import { db } from "@/lib/db";
import { transactionItems } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export interface RawItemInput {
  itemName: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  supplierName?: string;
}

export async function saveTransactionItemsWithPriceCheck(
  shopId: string,
  transactionId: string,
  items: RawItemInput[]
) {
  const insertedItems = [];

  for (const item of items) {
    // Look up previous purchase of the same item in this shop
    const previous = await db.query.transactionItems.findFirst({
      where: and(
        eq(transactionItems.shopId, shopId),
        eq(transactionItems.itemName, item.itemName)
      ),
      orderBy: [desc(transactionItems.createdAt)],
    });

    let previousUnitPrice = null;
    let priceChangePercent = null;

    if (previous) {
      previousUnitPrice = Number(previous.unitPrice);
      if (previousUnitPrice > 0) {
        const diff = item.unitPrice - previousUnitPrice;
        priceChangePercent = ((diff / previousUnitPrice) * 100).toFixed(2);
      }
    }

    const [inserted] = await db
      .insert(transactionItems)
      .values({
        shopId,
        transactionId,
        itemName: item.itemName,
        unitPrice: String(item.unitPrice),
        quantity: item.quantity || 1,
        totalAmount: String(item.totalAmount),
        supplierName: item.supplierName || null,
        previousUnitPrice: previousUnitPrice ? String(previousUnitPrice) : null,
        priceChangePercent: priceChangePercent || null,
      })
      .returning();

    insertedItems.push(inserted);
  }

  return insertedItems;
}
