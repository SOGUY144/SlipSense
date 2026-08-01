# Analytics Charts Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 new interactive financial charts to `/analytics`: Peak Sales Hours Chart (with peak flame badge), Supplier Spend Breakdown Chart, and Payment Method (PromptPay vs Cash) Chart.

**Architecture:** Enhance `GET /api/analytics` to aggregate hourly sales, supplier items, and payment methods. Update `AnalyticsCharts` component with Recharts components and responsive tooltips.

**Tech Stack:** Next.js 15, Recharts, Drizzle ORM, Tailwind CSS, Lucide Icons.

---

### Task 1: API Calculations for Peak Hours, Suppliers & Payment Methods

**Files:**
- Modify: `app/api/analytics/route.ts`

- [ ] **Step 1: Update `app/api/analytics/route.ts`**

Add calculations for `hourlyTrend`, `peakHourLabel`, `supplierBreakdown`, `paymentMethodBreakdown`, and enforce `isPersonal = false`:

```typescript
// In app/api/analytics/route.ts
// Add imports: transactionItems, dailyShifts

// 1. Filter out personal transactions
const nonPersonalTxs = currentTxs.filter((t) => !t.isPersonal);

// 2. Calculate hourly trend (2-hour buckets: 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00)
const hourlyBuckets = [
  { label: "06:00 - 08:00", hourStart: 6, hourEnd: 8, income: 0 },
  { label: "08:00 - 10:00", hourStart: 8, hourEnd: 10, income: 0 },
  { label: "10:00 - 12:00", hourStart: 10, hourEnd: 12, income: 0 },
  { label: "12:00 - 14:00", hourStart: 12, hourEnd: 14, income: 0 },
  { label: "14:00 - 16:00", hourStart: 14, hourEnd: 16, income: 0 },
  { label: "16:00 - 18:00", hourStart: 16, hourEnd: 18, income: 0 },
  { label: "18:00 - 20:00", hourStart: 18, hourEnd: 20, income: 0 },
  { label: "20:00 - 22:00", hourStart: 20, hourEnd: 22, income: 0 },
];

allRecentTxs.filter((t) => t.type === "income" && !t.isPersonal).forEach((t) => {
  const hour = new Date(t.occurredAt).getHours();
  const bucket = hourlyBuckets.find((b) => hour >= b.hourStart && hour < b.hourEnd);
  if (bucket) {
    bucket.income += parseFloat(t.amount);
  }
});

const maxBucket = [...hourlyBuckets].sort((a, b) => b.income - a.income)[0];
const peakHourLabel = maxBucket && maxBucket.income > 0 ? `${maxBucket.label} น.` : null;

// 3. Query Supplier Spend Breakdown
const supplierItems = await db
  .select({
    supplierName: transactionItems.supplierName,
    totalSpend: sql<number>`sum(${transactionItems.totalAmount})`,
  })
  .from(transactionItems)
  .where(eq(transactionItems.shopId, shop.id))
  .groupBy(transactionItems.supplierName);

const totalSupplierSpend = supplierItems.reduce((sum, item) => sum + Number(item.totalSpend || 0), 0);
const supplierBreakdown = supplierItems.map((item) => ({
  supplierName: item.supplierName || "ไม่ระบุชื่อซัพพลายเออร์",
  amount: Number(item.totalSpend || 0),
  percentage: totalSupplierSpend > 0 ? (Number(item.totalSpend || 0) / totalSupplierSpend) * 100 : 0,
}));

// 4. Query Payment Method Breakdown (Transfer vs Cash)
const shifts = await db
  .select()
  .from(dailyShifts)
  .where(eq(dailyShifts.shopId, shop.id));

const totalCash = shifts.reduce((sum, s) => sum + Number(s.cashTotal || 0), 0);
const totalTransfer = shifts.reduce((sum, s) => sum + Number(s.transferTotal || 0), 0);
const totalPayment = totalCash + totalTransfer;

const paymentMethodBreakdown = [
  { method: "สแกนโอน PromptPay (สลิป)", amount: totalTransfer, percentage: totalPayment > 0 ? (totalTransfer / totalPayment) * 100 : 0 },
  { method: "เงินสดในเกะ", amount: totalCash, percentage: totalPayment > 0 ? (totalCash / totalPayment) * 100 : 0 },
].filter((p) => p.amount > 0);
```

- [ ] **Step 2: Verify & Commit**

Run `npx tsc --noEmit`.
```bash
git add app/api/analytics/route.ts
git commit -m "feat(api): add hourlyTrend, supplierBreakdown, and paymentMethodBreakdown to analytics route"
```

---

### Task 2: UI Analytics Charts Components Upgrade

**Files:**
- Modify: `components/charts/analytics-charts.tsx`
- Modify: `app/(app)/analytics/page.tsx`

- [ ] **Step 1: Update `components/charts/analytics-charts.tsx`**

Add chart sections:
1. Peak Sales Hours BarChart with Flame Badge (`🔥 ช่วงพีคของวัน`)
2. Supplier Spend Breakdown DonutChart
3. Payment Method Breakdown DonutChart

- [ ] **Step 2: Update `app/(app)/analytics/page.tsx`**

Pass new props `hourlyTrend`, `peakHourLabel`, `supplierBreakdown`, `paymentMethodBreakdown` into `<AnalyticsCharts />`.

- [ ] **Step 3: Verify & Commit**

Run `npx tsc --noEmit`.
```bash
git add components/charts/analytics-charts.tsx app/\(app\)/analytics/page.tsx
git commit -m "feat(ui): add Peak Hours, Supplier Breakdown, and Payment Method charts to analytics"
```

---

## Rules Checklist & Self-Review

- [x] **Language** — Thai explanations provided.
- [x] **No placeholders** — Full code provided for every component and endpoint.
- [x] **YAGNI** — Only requested chart features included.
- [x] **Git step in plan** — Commit steps included for every task.
- [x] **Self-review done** — Verified spec coverage and type consistency.
