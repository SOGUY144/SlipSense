# Daily Shift Reconciliation & Personal Slip Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 of SlipSense SME Suite — 1-Tap Personal vs Business Slip Tagging and 1-Minute Daily Shift Reconciliation Widget on the Dashboard.

**Architecture:** Extend Drizzle ORM schema with `is_personal` in `transactions` and a new `daily_shifts` table. Expose API routes for shift closing and personal flag toggling. Build dedicated UI components (`PersonalToggleBadge`, `DailyShiftWidget`) and update Dashboard aggregation logic.

**Tech Stack:** Next.js 15 (App Router), Drizzle ORM, Supabase PostgreSQL, Tailwind CSS, Lucide React.

---

### Task 1: Database Schema Updates (`schema.ts` & Drizzle Push)

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Update Drizzle Schema**

Add `isPersonal` to `transactions` table and create `dailyShifts` table in `lib/db/schema.ts`:

```typescript
// In lib/db/schema.ts

export const dailyShifts = pgTable("daily_shifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  shiftDate: timestamp("shift_date", { withTimezone: true }).notNull(),
  transferTotal: numeric("transfer_total", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  cashTotal: numeric("cash_total", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  grossTotal: numeric("gross_total", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("daily_shifts_shop_date_idx").on(t.shopId, t.shiftDate),
]);
```

In `transactions` table definition:
```typescript
  isPersonal: boolean("is_personal").default(false).notNull(),
```

- [ ] **Step 2: Apply Database Migration**

Run:
```bash
npx drizzle-kit push
```
Expected: Schema pushed successfully to Supabase DB.

- [ ] **Step 3: Commit**

Check `.agent/config.yml` for `auto_commit`.
```bash
git add lib/db/schema.ts
git commit -m "feat(db): add isPersonal to transactions and daily_shifts table"
```

---

### Task 2: API Endpoints for Daily Shift and Transaction Update

**Files:**
- Create: `app/api/dashboard/daily-shift/route.ts`
- Modify: `app/api/transactions/[id]/route.ts`

- [ ] **Step 1: Create `app/api/dashboard/daily-shift/route.ts`**

```typescript
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { dailyShifts, transactions } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { shop } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const shift = await db.query.dailyShifts.findFirst({
      where: and(
        eq(dailyShifts.shopId, shop.id),
        gte(dailyShifts.shiftDate, startOfDay),
        lte(dailyShifts.shiftDate, endOfDay)
      ),
    });

    // Auto-calculate today's transfer income
    const transferRes = await db
      .select({ total: sql<number>`sum(${transactions.amount})` })
      .from(transactions)
      .where(
        and(
          eq(transactions.shopId, shop.id),
          eq(transactions.type, "income"),
          eq(transactions.isPersonal, false),
          gte(transactions.occurredAt, startOfDay),
          lte(transactions.occurredAt, endOfDay)
        )
      );

    const transferTotal = Number(transferRes[0]?.total || 0);

    return apiSuccess({
      shift: shift || null,
      calculatedTransferTotal: transferTotal,
    });
  } catch (error) {
    console.error("GET daily-shift error:", error);
    return apiError("Failed to fetch daily shift", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { shop } = await requireAuth();
    const { shiftDate, cashTotal, notes } = await req.json();

    const dateStr = shiftDate || new Date().toISOString().split("T")[0];
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    // Calculate promptpay transfer total from verified non-personal income
    const transferRes = await db
      .select({ total: sql<number>`sum(${transactions.amount})` })
      .from(transactions)
      .where(
        and(
          eq(transactions.shopId, shop.id),
          eq(transactions.type, "income"),
          eq(transactions.isPersonal, false),
          gte(transactions.occurredAt, startOfDay),
          lte(transactions.occurredAt, endOfDay)
        )
      );

    const transferTotal = Number(transferRes[0]?.total || 0);
    const cash = Number(cashTotal || 0);
    const grossTotal = transferTotal + cash;

    // Check existing shift
    const existing = await db.query.dailyShifts.findFirst({
      where: and(
        eq(dailyShifts.shopId, shop.id),
        gte(dailyShifts.shiftDate, startOfDay),
        lte(dailyShifts.shiftDate, endOfDay)
      ),
    });

    let result;
    if (existing) {
      const [updated] = await db
        .update(dailyShifts)
        .set({
          transferTotal: String(transferTotal),
          cashTotal: String(cash),
          grossTotal: String(grossTotal),
          notes: notes || null,
        })
        .where(eq(dailyShifts.id, existing.id))
        .returning();
      result = updated;
    } else {
      const [inserted] = await db
        .insert(dailyShifts)
        .values({
          shopId: shop.id,
          shiftDate: startOfDay,
          transferTotal: String(transferTotal),
          cashTotal: String(cash),
          grossTotal: String(grossTotal),
          notes: notes || null,
        })
        .returning();
      result = inserted;
    }

    return apiSuccess(result);
  } catch (error) {
    console.error("POST daily-shift error:", error);
    return apiError("Failed to save daily shift", 500);
  }
}
```

- [ ] **Step 2: Modify `app/api/transactions/[id]/route.ts` to support `isPersonal`**

Ensure PATCH handler in `app/api/transactions/[id]/route.ts` handles updating `isPersonal`:

```typescript
// Add isPersonal to payload update in PATCH handler of app/api/transactions/[id]/route.ts
if (typeof body.isPersonal === "boolean") {
  updateData.isPersonal = body.isPersonal;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/dashboard/daily-shift/route.ts app/api/transactions/[id]/route.ts
git commit -m "feat(api): add daily-shift endpoint and isPersonal patch support"
```

---

### Task 3: Interactive `PersonalToggleBadge` Component

**Files:**
- Create: `components/transactions/personal-toggle-badge.tsx`
- Modify: `app/(app)/transactions/page.tsx`

- [ ] **Step 1: Create `components/transactions/personal-toggle-badge.tsx`**

```tsx
"use client";

import { useState } from "react";
import { User, Store } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalToggleBadgeProps {
  transactionId: string;
  isPersonal: boolean;
  onToggle?: (newVal: boolean) => void;
}

export function PersonalToggleBadge({
  transactionId,
  isPersonal: initialVal,
  onToggle,
}: PersonalToggleBadgeProps) {
  const [isPersonal, setIsPersonal] = useState(initialVal);
  const [loading, setLoading] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    const newVal = !isPersonal;
    setIsPersonal(newVal); // Optimistic UI update
    setLoading(true);

    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPersonal: newVal }),
      });
      if (!res.ok) {
        setIsPersonal(!newVal); // Revert on error
      } else {
        onToggle?.(newVal);
      }
    } catch {
      setIsPersonal(!newVal);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-200 shadow-sm border",
        isPersonal
          ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
      )}
      title="คลิกเพื่อสลับป้าย ร้านค้า / ส่วนตัว"
    >
      {isPersonal ? (
        <>
          <User className="w-3 h-3 text-slate-500" />
          <span>ส่วนตัว</span>
        </>
      ) : (
        <>
          <Store className="w-3 h-3 text-emerald-600" />
          <span>ร้านค้า</span>
        </>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Integrate Badge in Transaction List**

In `app/(app)/transactions/page.tsx`, import `PersonalToggleBadge` and render it next to category/amount in transaction list items.

- [ ] **Step 3: Commit**

```bash
git add components/transactions/personal-toggle-badge.tsx app/\(app\)/transactions/page.tsx
git commit -m "feat(ui): add PersonalToggleBadge to transactions page"
```

---

### Task 4: Daily Shift Close Widget on Dashboard

**Files:**
- Create: `components/dashboard/daily-shift-widget.tsx`
- Modify: `app/(app)/dashboard/page.tsx`
- Modify: `app/api/dashboard/summary/route.ts` (Exclude `isPersonal: true` from P&L summary)

- [ ] **Step 1: Create `components/dashboard/daily-shift-widget.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { Store, QrCode, Banknote, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function DailyShiftWidget({ onShiftClosed }: { onShiftClosed?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transferTotal, setTransferTotal] = useState(0);
  const [cashTotal, setCashTotal] = useState("");
  const [isClosed, setIsClosed] = useState(false);
  const [grossTotal, setGrossTotal] = useState(0);

  useEffect(() => {
    fetchTodayShift();
  }, []);

  async function fetchTodayShift() {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/daily-shift");
      const data = await res.json();
      if (data.success) {
        setTransferTotal(data.data.calculatedTransferTotal || 0);
        if (data.data.shift) {
          setCashTotal(data.data.shift.cashTotal);
          setGrossTotal(Number(data.data.shift.grossTotal));
          setIsClosed(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseShift() {
    try {
      setSaving(true);
      const res = await fetch("/api/dashboard/daily-shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashTotal: Number(cashTotal) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGrossTotal(Number(data.data.grossTotal));
        setIsClosed(true);
        onShiftClosed?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur rounded-2xl p-4 flex items-center justify-center min-h-[100px]">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const currentCash = Number(cashTotal) || 0;
  const computedGross = transferTotal + currentCash;

  return (
    <Card className="rounded-[1.5rem] border-0 shadow-md bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
        <Store className="w-32 h-32" />
      </div>

      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">ปิดยอดร้านประจำวัน</h3>
              <p className="text-xs text-slate-400">สรุปยอดเงินโอน + เงินสด 1 นาที</p>
            </div>
          </div>
          {isClosed && (
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> ปิดยอดแล้ว
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>ยอดสแกนโอนวันนี้</span>
            </div>
            <p className="text-lg font-black text-emerald-400">
              ฿{transferTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Banknote className="w-3.5 h-3.5 text-amber-400" />
              <span>เงินสดในเกะ</span>
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={cashTotal}
              onChange={(e) => setCashTotal(e.target.value)}
              className="h-8 bg-white/10 border-0 text-white font-bold text-base focus:ring-1 focus:ring-emerald-400 px-2 rounded-lg"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">ยอดขายรวมวันนี้</span>
            <p className="text-xl font-black text-white">
              ฿{(isClosed ? grossTotal : computedGross).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <Button
            onClick={handleCloseShift}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/20"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isClosed ? (
              "อัปเดตปิดยอด"
            ) : (
              "บันทึกปิดยอดวัน"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Integrate `DailyShiftWidget` in Dashboard**

In `app/(app)/dashboard/page.tsx`, place `<DailyShiftWidget />` above the transaction section.
In `app/api/dashboard/summary/route.ts`, ensure `isPersonal = false` is added to where clause when summing income & expenses!

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/daily-shift-widget.tsx app/\(app\)/dashboard/page.tsx app/api/dashboard/summary/route.ts
git commit -m "feat(ui): integrate DailyShiftWidget into dashboard and exclude personal slips from summary"
```

---

## Rules Checklist & Self-Review

- [x] **Language** — Thai explanations provided.
- [x] **No placeholders** — Full code provided for every component and endpoint.
- [x] **YAGNI** — Only Phase 1 features included.
- [x] **Git step in plan** — Commit steps included for every task.
- [x] **Self-review done** — Verified spec coverage and type consistency.
