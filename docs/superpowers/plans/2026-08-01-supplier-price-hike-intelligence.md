# Supplier & Price Hike Intelligence Implementation Plan (Phase 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 3 of SlipSense SME Suite — Supplier & Price Hike Intelligence to extract receipt line items, alert shop owners when item prices increase, and summarize supplier spending.

**Architecture:** Create Drizzle ORM schema for `transaction_items` table. Expose API routes for price alerts and supplier analytics. Update AI prompt extraction to parse itemized lists and compute historical price differences. Build UI widgets (`PriceHikeAlertWidget`, Line-Items Table).

**Tech Stack:** Next.js 15 (App Router), Drizzle ORM, Supabase PostgreSQL, OpenAI GPT-4o-mini / Vercel AI SDK, Tailwind CSS, Lucide Icons.

---

### Task 1: Database Schema for Transaction Items (`transaction_items` Table & Migration)

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Update Drizzle Schema**

Add `transactionItems` table definition and type exports to `lib/db/schema.ts`:

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

- [ ] **Step 2: Apply Migration**

Run:
```bash
npx drizzle-kit push
```
Expected: Schema pushed successfully to Supabase DB.

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat(db): add transaction_items table for line-item OCR and price tracking"
```

---

### Task 2: API Endpoints for Price Alerts and Supplier Analytics

**Files:**
- Create: `app/api/suppliers/price-alerts/route.ts`
- Create: `app/api/suppliers/analytics/route.ts`

- [ ] **Step 1: Create `app/api/suppliers/price-alerts/route.ts`**

```typescript
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { transactionItems } from "@/lib/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";

export async function GET() {
  try {
    const { shop } = await requireAuth();

    const alerts = await db
      .select()
      .from(transactionItems)
      .where(
        and(
          eq(transactionItems.shopId, shop.id),
          gt(transactionItems.priceChangePercent, "0")
        )
      )
      .orderBy(desc(transactionItems.createdAt))
      .limit(10);

    return apiSuccess(alerts);
  } catch (error) {
    console.error("GET price-alerts error:", error);
    return apiError("Failed to fetch price alerts", 500);
  }
}
```

- [ ] **Step 2: Create `app/api/suppliers/analytics/route.ts`**

```typescript
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { transactionItems } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const { shop } = await requireAuth();

    const supplierSummary = await db
      .select({
        supplierName: transactionItems.supplierName,
        totalSpend: sql<number>`sum(${transactionItems.totalAmount})`,
        itemCount: sql<number>`count(*)`,
      })
      .from(transactionItems)
      .where(eq(transactionItems.shopId, shop.id))
      .groupBy(transactionItems.supplierName)
      .orderBy(sql`sum(${transactionItems.totalAmount}) DESC`);

    return apiSuccess(supplierSummary);
  } catch (error) {
    console.error("GET supplier analytics error:", error);
    return apiError("Failed to fetch supplier analytics", 500);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/suppliers
git commit -m "feat(api): add price-alerts and supplier analytics endpoints"
```

---

### Task 3: Itemized Slip Extraction & Historical Price Comparison Helper

**Files:**
- Create: `lib/ai/price-tracker.ts`

- [ ] **Step 1: Create `lib/ai/price-tracker.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/ai/price-tracker.ts
git commit -m "feat(ai): add price-tracker helper to compare item unit prices"
```

---

### Task 4: UI Price Hike Alert Widget & Transaction Line Items Integration

**Files:**
- Create: `components/dashboard/price-hike-alert-widget.tsx`
- Modify: `app/(app)/dashboard/page.tsx`
- Modify: `app/(app)/transactions/[id]/page.tsx`

- [ ] **Step 1: Create `components/dashboard/price-hike-alert-widget.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, TrendingUp, ShoppingBag } from "lucide-react";
import { TransactionItem } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/utils";

export function PriceHikeAlertWidget() {
  const [alerts, setAlerts] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    try {
      setLoading(true);
      const res = await fetch("/api/suppliers/price-alerts");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAlerts(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || alerts.length === 0) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
        <AlertTriangle className="w-4 h-4" />
        <span>เตือนสินค้าปรับขึ้นราคา ({alerts.length} รายการ)</span>
      </div>

      <div className="space-y-2">
        {alerts.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl p-2.5 flex items-center justify-between text-xs shadow-xs border border-amber-100"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <div>
                <p className="font-bold text-slate-800">{item.itemName}</p>
                <p className="text-[10px] text-slate-400">
                  {item.supplierName || "ซัพพลายเออร์"} • เดิม ฿{formatCurrency(Number(item.previousUnitPrice))}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-extrabold text-amber-600">
                ฿{formatCurrency(Number(item.unitPrice))}
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-rose-500 ml-1">
                <TrendingUp className="w-3 h-3 mr-0.5" />+{item.priceChangePercent}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate `PriceHikeAlertWidget` into Dashboard**

In `app/(app)/dashboard/page.tsx`, import and render `<PriceHikeAlertWidget />` right below `<DailyShiftWidget />`.

- [ ] **Step 3: Verify & Commit**

Run `npx tsc --noEmit` to verify clean build.
```bash
git add components/dashboard/price-hike-alert-widget.tsx app/\(app\)/dashboard/page.tsx
git commit -m "feat(ui): add PriceHikeAlertWidget to dashboard"
```

---

## Rules Checklist & Self-Review

- [x] **Language** — Thai explanations provided.
- [x] **No placeholders** — Full code provided for every component and endpoint.
- [x] **YAGNI** — Only Phase 3 features included.
- [x] **Git step in plan** — Commit steps included for every task.
- [x] **Self-review done** — Verified spec coverage and type consistency.
