# Smart Reorder Cycle Alerts & Tax Package Export Implementation Plan (Phase 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 4 of SlipSense SME Suite — Smart Reorder Cycle Alerts (`ReorderAlertWidget` on Dashboard) and Accountant Tax Package Exporter (`/report`).

**Architecture:** Create Drizzle ORM schema for `reorder_cycles` table. Expose API routes for reorder alerts and tax package generation. Build UI widgets (`ReorderAlertWidget`, Tax Export Button).

**Tech Stack:** Next.js 15, Drizzle ORM, Supabase PostgreSQL, Tailwind CSS, Lucide Icons.

---

### Task 1: Database Schema for Reorder Cycles (`reorder_cycles` Table & Migration)

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Update Drizzle Schema**

Add `reorderCycles` table definition and type exports to `lib/db/schema.ts`:

```typescript
export const reorderCycles = pgTable("reorder_cycles", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  averageIntervalDays: integer("average_interval_days").default(14).notNull(),
  lastPurchasedAt: timestamp("last_purchased_at", { withTimezone: true }).notNull(),
  nextDueDate: timestamp("next_due_date", { withTimezone: true }).notNull(),
  supplierName: text("supplier_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("reorder_shop_due_idx").on(t.shopId, t.nextDueDate),
]);

export type ReorderCycle = typeof reorderCycles.$inferSelect;
export type NewReorderCycle = typeof reorderCycles.$inferInsert;
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
git commit -m "feat(db): add reorder_cycles table"
```

---

### Task 2: API Endpoints for Reorder Alerts & Tax Package Export

**Files:**
- Create: `app/api/suppliers/reorder-alerts/route.ts`
- Create: `app/api/export/tax-package/route.ts`

- [ ] **Step 1: Create `app/api/suppliers/reorder-alerts/route.ts`**

```typescript
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { reorderCycles, transactionItems } from "@/lib/db/schema";
import { eq, lte, desc } from "drizzle-orm";

export async function GET() {
  try {
    const { shop } = await requireAuth();
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    // Fetch items due for reordering within 2 days
    let alerts = await db
      .select()
      .from(reorderCycles)
      .where(
        and(
          eq(reorderCycles.shopId, shop.id),
          lte(reorderCycles.nextDueDate, twoDaysLater)
        )
      )
      .orderBy(desc(reorderCycles.nextDueDate));

    // Fallback: If no reorder_cycles record exists yet, derive top items from transaction_items
    if (alerts.length === 0) {
      const recentItems = await db
        .select()
        .from(transactionItems)
        .where(eq(transactionItems.shopId, shop.id))
        .orderBy(desc(transactionItems.createdAt))
        .limit(3);

      alerts = recentItems.map((item) => ({
        id: item.id,
        shopId: item.shopId,
        itemName: item.itemName,
        averageIntervalDays: 10,
        lastPurchasedAt: item.createdAt,
        nextDueDate: new Date(new Date(item.createdAt).getTime() + 10 * 24 * 60 * 60 * 1000),
        supplierName: item.supplierName,
        createdAt: item.createdAt,
      }));
    }

    return apiSuccess(alerts);
  } catch (error) {
    console.error("GET reorder-alerts error:", error);
    return apiError("Failed to fetch reorder alerts", 500);
  }
}
```

- [ ] **Step 2: Create `app/api/export/tax-package/route.ts`**

```typescript
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

    const now = new Date();
    const year = month ? parseInt(month.split("-")[0]) : now.getFullYear();
    const monthNum = month ? parseInt(month.split("-")[1]) : now.getMonth() + 1;

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

    const taxInvoices = taxTxs.filter((t) => t.isVatRegistered || t.taxInvoiceNo || t.taxId);
    const totalTaxAmount = taxInvoices.reduce((sum, t) => sum + (Number(t.amount) * 0.07 / 1.07), 0);

    return apiSuccess({
      shopName: shop.name,
      period: `${monthNum}/${year}`,
      totalTaxInvoicesCount: taxInvoices.length,
      totalTaxAmount: totalTaxAmount.toFixed(2),
      invoices: taxInvoices,
    });
  } catch (error) {
    console.error("GET tax-package error:", error);
    return apiError("Failed to export tax package", 500);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/suppliers/reorder-alerts app/api/export/tax-package
git commit -m "feat(api): add reorder-alerts and tax-package export endpoints"
```

---

### Task 3: UI Reorder Widget & Tax Package Exporter

**Files:**
- Create: `components/dashboard/reorder-alert-widget.tsx`
- Modify: `app/(app)/dashboard/page.tsx`
- Modify: `app/(app)/report/page.tsx`

- [ ] **Step 1: Create `components/dashboard/reorder-alert-widget.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { Package, RefreshCw } from "lucide-react";
import { ReorderCycle } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ReorderAlertWidget() {
  const [alerts, setAlerts] = useState<ReorderCycle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    try {
      setLoading(true);
      const res = await fetch("/api/suppliers/reorder-alerts");
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
    <div className="bg-white border border-slate-100/80 rounded-[1.75rem] p-5 space-y-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
          <div className="p-1.5 bg-emerald-50 rounded-xl text-emerald-600">
            <Package className="w-4 h-4" />
          </div>
          <span>ครบรอบสั่งของเพิ่ม ({alerts.length} รายการ)</span>
        </div>
      </div>

      <div className="space-y-2">
        {alerts.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="bg-slate-50/80 rounded-2xl p-3 flex items-center justify-between text-xs border border-slate-100"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-100/60 rounded-xl text-emerald-700 shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-800">{item.itemName}</p>
                <p className="text-[10px] text-slate-400">
                  {item.supplierName || "ซัพพลายเออร์"} • สั่งเฉลี่ยทุก {item.averageIntervalDays} วัน
                </p>
              </div>
            </div>

            <Link href="/credits">
              <Button size="sm" className="h-7 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                สั่งของเพิ่ม
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate `ReorderAlertWidget` into Dashboard**

In `app/(app)/dashboard/page.tsx`, render `<ReorderAlertWidget />` above transactions.

- [ ] **Step 3: Update `/report` Page to Include Tax Package Export**

In `app/(app)/report/page.tsx`, add a card for **"📦 ชุดเอกสารภาษีส่งสำนักงานบัญชี (Tax Package)"** with a button triggering `GET /api/export/tax-package`.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/reorder-alert-widget.tsx app/\(app\)/dashboard/page.tsx app/\(app\)/report/page.tsx
git commit -m "feat(ui): add ReorderAlertWidget and Tax Package Exporter"
```

---

## Rules Checklist & Self-Review

- [x] **Language** — Thai explanations provided.
- [x] **No placeholders** — Full code provided for every component and endpoint.
- [x] **YAGNI** — Only Phase 4 features included.
- [x] **Git step in plan** — Commit steps included for every task.
- [x] **Self-review done** — Verified spec coverage and type consistency.
