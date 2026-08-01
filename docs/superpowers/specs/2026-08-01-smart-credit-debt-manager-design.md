# Design Spec: Phase 2 — Smart Credit & Debt Manager (ระบบสมุดติดหนี้ & เครดิตอัจฉริยะ)

## 1. Overview & Business Goal
Phase 2 empowers Thai mom-and-pop stores (ร้านโชห่วย) and SMEs to manage informal credits, customer tabs ("แป๊กของไว้ก่อน"), and supplier payables. It replaces paper debt notebooks with an automated credit manager featuring 1-tap polite AI LINE reminder drafting and 1-tap payment conversion into verified shop transactions.

---

## 2. User Experience (UX / UI Design)

### A. Credit Manager Hub (`/credits` or Navigation Tab)
- **Two Tab Views:**
  - **ลูกหนี้ (Debtors / Outstanding Income):** Customers who owe money to the shop.
  - **เจ้าหนี้ (Creditors / Outstanding Expenses):** Wholesalers or suppliers owed money by the shop.
- **Card Summary Header:**
  - Total Outstanding Debtors Amount (฿) & Total Outstanding Creditors Amount (฿).
  - Highlighting overdue accounts in red badge (`[ เกินกำหนดชำระ ]`).
- **New Credit Modal (`+ จดรายการติดหนี้`):**
  - Inputs: Contact Name, Type (Debtor/Creditor), Amount, Description/Items, Due Date, Contact Phone (optional).

### B. AI 1-Tap Friendly LINE Debt Reminder Generator
- Each overdue or pending debtor card features a **"💬 ร่างข้อความทวงหนี้ (LINE)"** button.
- Clicking calls AI to generate a polite, friendly Thai message tailored to the customer & amount (e.g. *"สวัสดีครับป้าแอน 😊 ยอดค้างชำระ 350 บาท (ค่าเครื่องดื่ม) จากร้านพี่สมชาย ครบกำหนดแล้วนะครับ..."*).
- Includes a 1-tap **"คัดลอกข้อความ"** button for instant sharing in LINE.

### C. 1-Tap Payment Settlement (`Mark as Paid`)
- Clicking **"ชำระแล้ว (Mark Paid)"** updates the credit status to `paid`.
- Automatically generates a corresponding record in `transactions` (Income for Debtors, Expense for Creditors) with tag `isPersonal = false`.

---

## 3. Database Schema (`lib/db/schema.ts`)

### Enums
```typescript
export const creditTypeEnum = pgEnum("credit_type", ["debtor", "creditor"]);
export const creditStatusEnum = pgEnum("credit_status", ["pending", "paid", "overdue", "cancelled"]);
```

### Table: `credits` (New)
```typescript
export const credits = pgTable("credits", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  type: creditTypeEnum("type").notNull(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: creditStatusEnum("status").default("pending").notNull(),
  transactionId: uuid("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("credits_shop_type_status_idx").on(t.shopId, t.type, t.status),
]);
```

---

## 4. API Endpoints

### 1. `GET /api/credits`
- **Query Params:** `type=debtor|creditor`, `status=pending|paid|overdue`
- **Response:** List of credits for the authenticated shop + calculated summary totals.

### 2. `POST /api/credits`
- **Body:** `{ type, contactName, contactPhone?, amount, description?, dueDate? }`
- **Behavior:** Validates inputs and inserts new credit record.

### 3. `PATCH /api/credits/[id]`
- **Body:** `{ status: "paid" | "cancelled" | "pending" }`
- **Behavior:** Updates status. If transitioning to `paid`, automatically inserts a new row in `transactions` and links `transactionId`.

### 4. `POST /api/credits/[id]/generate-reminder`
- **Behavior:** Calls AI (GPT-4o-mini) to generate a friendly, polite Thai reminder message for LINE.

---

## 5. Verification & Testing Strategy
1. **DB Migration Check:** Run `npx drizzle-kit push` and verify `credits` table and enums in Supabase.
2. **API Endpoint Verification:** Test creation, status updates, and transaction auto-generation.
3. **UI Verification:** Test `/credits` page, modal input, status toggling, and AI reminder generation.
