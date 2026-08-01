# Design Spec: Phase 3 — Supplier & Price Hike Intelligence (วิเคราะห์ต้นทุน & แจ้งเตือนสินค้าขึ้นราคา)

## 1. Overview & Business Goal
Phase 3 elevates SlipSense into an automated supply chain & cost control intelligence system for Thai mom-and-pop stores (ร้านโชห่วย) and SMEs. It extracts individual line items from expense slips/receipts, monitors unit prices across purchases, alerts shop owners when supplier prices increase, and provides supplier spending breakdowns.

---

## 2. User Experience (UX / UI Design)

### A. AI Line-Item Slip Extraction
- When an expense slip or invoice is processed (via upload or LINE webhook), AI extracts individual items:
  - `itemName` (e.g. "น้ำมันพืชมรกต 1L")
  - `unitPrice` (e.g. 45.00)
  - `quantity` (e.g. 12)
  - `totalAmount` (e.g. 540.00)
  - `supplierName` (e.g. "Makro")
- Displays line items in the transaction detail page (`/transactions/[id]`) and review screen (`/review/[jobId]`).

### B. Price Hike Alert Widget (Dashboard & Transaction Detail)
- Automatically compares new item unit prices against the most recent historical purchase of the same item name in the same shop.
- If `unitPrice > previousUnitPrice`, flags the item as a price hike.
- **Dashboard Widget:** Renders a **"⚠️ แจ้งเตือนสินค้าปรับขึ้นราคา (Price Hike Alerts)"** card highlighting recent price increases (e.g. *"น้ำมันพืชมรกต 1L: ฿45.00 (+12.5% จากลอตก่อน)"*).

### C. Supplier Analytics View
- Displays a summary of total spend by supplier (e.g. Makro ฿25,000, BigC ฿8,000, Local Wholesale ฿4,500).

---

## 3. Database Schema (`lib/db/schema.ts`)

### Table: `transaction_items` (New)
```typescript
export const transactionItems = pgTable("transaction_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  supplierName: text("supplier_name"),
  previousUnitPrice: numeric("previous_unit_price", { precision: 12, scale: 2 }),
  priceChangePercent: numeric("price_change_percent", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("tx_items_shop_item_name_idx").on(t.shopId, t.itemName),
]);

export type TransactionItem = typeof transactionItems.$inferSelect;
export type NewTransactionItem = typeof transactionItems.$inferInsert;
```

---

## 4. API Endpoints

### 1. `GET /api/suppliers/price-alerts`
- **Response:** List of recent `transaction_items` where `priceChangePercent > 0` for the authenticated shop.

### 2. `GET /api/suppliers/analytics`
- **Response:** Aggregated spend grouped by `supplierName` and top purchased items.

### 3. Update `lib/ai/prompts.ts` / Slip Extraction:
- Prompt instruct AI to output `items: Array<{ itemName, unitPrice, quantity, totalAmount, supplierName }>` when extracting expense receipts.

---

## 5. Verification & Testing Strategy
1. **DB Migration Check:** Run `npx drizzle-kit push` and verify `transaction_items` table in Supabase.
2. **API & Extraction Check:** Verify slip extraction produces `transaction_items` and computes `priceChangePercent` against previous records.
3. **UI Verification:** Test Price Hike Widget on Dashboard and Line Items view in Transaction Detail page.
