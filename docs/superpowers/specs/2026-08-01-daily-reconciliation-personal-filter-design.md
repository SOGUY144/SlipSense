# Design Spec: Phase 1 — Daily Shift Reconciliation & Personal Slip Filter

## 1. Overview & Business Goal
SlipSense is tailored for Thai mom-and-pop stores (ร้านโชห่วย) and SMEs. To break away from being "just another income/expense tracking app", Phase 1 introduces two core capabilities:
1. **Personal Slip Filtering (1-Tap Filter):** Allows shop owners to easily segregate personal transfers from business expenses/incomes so shop P&L remains 100% accurate.
2. **1-Minute Daily Shift Close (ระบบปิดยอดร้านประจำวัน):** Auto-calculates daily PromptPay/transfer totals from verified business slips, lets the owner input total cash on hand, and computes total gross sales & Insights instantly.

---

## 2. User Experience (UX / UI Design)

### A. Personal Slip Filter
- **AI Classification:** During AI extraction (upload & LINE webhook), AI inspects transaction notes/senders to suggest `isPersonal` status (e.g. transfers to family members or personal utility bills are tagged as `isPersonal: true`).
- **UI Badge & Toggle:** In the transaction list (`/transactions`), transaction detail (`/transactions/[id]`), and review screen (`/review/[jobId]`), each item renders an interactive pill badge:
  - `[ 🏪 ร้านค้า ]` (Emerald) vs `[ 👤 ส่วนตัว ]` (Slate/Indigo).
  - Clicking the badge toggles state instantly via optimistic update.
- **P&L Impact:** All dashboard calculations, reports, and AI analytics exclude `isPersonal: true` transactions by default.

### B. Daily Shift Close Widget
- **Location:** Prominently featured on the main Dashboard (`/dashboard`).
- **Interactions:**
  1. Displays **Today's Transfer Revenue** (Auto-summed from non-personal income transactions for today).
  2. Provides an input field: **"เงินสดในเกะ (Cash Count)"**.
  3. Clicking **"บันทึกปิดยอดวัน (Close Shift)"** saves the record into `daily_shifts` and generates a daily sales report card (Cash vs Transfer breakdown + % change from yesterday).

---

## 3. Database Schema

### Table: `transactions` (Modify)
Add column:
- `is_personal`: `boolean("is_personal").default(false).notNull()`
- Add index: `index("transactions_shop_personal_date_idx").on(t.shopId, t.isPersonal, t.occurredAt)`

### Table: `daily_shifts` (New)
```typescript
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

---

## 4. API Endpoints

### 1. `POST /api/dashboard/daily-shift`
- **Body:** `{ shiftDate: string, cashTotal: number, notes?: string }`
- **Behavior:**
  - Queries today's `transferTotal` from `transactions` table (`type = 'income' AND isPersonal = false AND occurredAt` within date).
  - Computes `grossTotal = transferTotal + cashTotal`.
  - Upserts into `daily_shifts`.
- **Response:** Updated shift data + daily summary AI insight.

### 2. `GET /api/dashboard/daily-shift?date=YYYY-MM-DD`
- **Response:** Existing `daily_shifts` record for the specified date, or default zeros if not yet closed.

### 3. `PATCH /api/transactions/[id]` (Update `isPersonal`)
- **Body:** `{ isPersonal: boolean }`
- **Behavior:** Updates transaction record and recalculates dashboard cache.

---

## 5. Verification & Testing Strategy
1. **Database Migration Check:** Run `npx drizzle-kit push` and verify `daily_shifts` table and `is_personal` column in Supabase.
2. **API Unit/Integration Test:** Test `POST /api/dashboard/daily-shift` with sample transaction records.
3. **UI Verification:** Test toggling `isPersonal` on transactions and verify P&L totals in Dashboard update immediately.
