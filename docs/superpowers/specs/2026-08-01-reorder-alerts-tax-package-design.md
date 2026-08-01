# Design Spec: Phase 4 — Smart Reorder Cycle Alerts & Accountant Tax Package

## 1. Overview & Goal
Phase 4 expands SlipSense's SME automation by introducing:
1. **Smart Reorder Cycle Alerts:** Automatic tracking of purchase intervals per item to remind shop owners before inventory runs out.
2. **Accountant Tax Package Export:** 1-tap extraction of VAT 7% & WHT tax invoices and structured tax report export for accountants.

---

## 2. User Experience (UX / UI Design)

### A. Smart Reorder Cycle Alert Widget
- **Location:** Featured on main Dashboard (`/dashboard`).
- **Visual:** Clean emerald/white card listing items due for reordering (e.g. *"📦 น้ำมันพืชมรกต 1L (สั่งซื้อเฉลี่ยทุก 10 วัน) — ครบรอบต้องสั่งเพิ่มวันนี้"*).
- **1-Tap Action:** "สั่งซื้อเพิ่ม" button creates a pending creditor entry or reminder.

### B. Accountant Tax Package Export (`/report`)
- **Location:** Report & Analytics page (`/report`).
- **Features:**
  - Tab for **"ใบกำกับภาษี (VAT 7%)"** & **"หัก ณ ที่จ่าย (WHT)"**.
  - **"📦 ดาวน์โหลดแพ็กเกจส่งนักบัญชี"** button generating formatted tax summary reports.

---

## 3. Database Schema (`lib/db/schema.ts`)

### Table: `reorder_cycles` (New)
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

---

## 4. API Endpoints

### 1. `GET /api/suppliers/reorder-alerts`
- **Response:** List of `reorder_cycles` where `nextDueDate` is within 2 days for the authenticated shop.

### 2. `GET /api/export/tax-package`
- **Query Params:** `month=YYYY-MM`
- **Response:** Formatted tax summary JSON / CSV payload containing all tax invoice entries.

---

## 5. Verification & Testing Strategy
1. **DB Migration Check:** Run `npx drizzle-kit push` and verify `reorder_cycles` table.
2. **TypeScript & Build Verification:** Run `npx tsc --noEmit` and `npm run build`.
3. **UI Verification:** Verify Reorder Widget on Dashboard and Tax Export on `/report`.
