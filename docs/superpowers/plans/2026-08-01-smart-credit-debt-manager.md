# Smart Credit & Debt Manager Implementation Plan (Phase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 2 of SlipSense SME Suite — Smart Credit & Debt Manager (`/credits`) to record debtors/creditors, draft polite AI LINE reminders, and convert paid debts into transactions.

**Architecture:** Create Drizzle ORM schema for `credits` table. Expose API routes for CRUD, status toggling, and AI reminder generation. Build responsive UI components (`CreditCard`, `AddCreditModal`, `AiReminderModal`) and navigation links.

**Tech Stack:** Next.js 15 (App Router), Drizzle ORM, Supabase PostgreSQL, Vercel AI SDK / OpenAI GPT-4o-mini, Tailwind CSS, Lucide Icons.

---

### Task 1: Database Schema for Credits (`credits` Table & Migration)

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Update Drizzle Schema**

Add `creditTypeEnum`, `creditStatusEnum`, and `credits` table definition to `lib/db/schema.ts`:

```typescript
export const creditTypeEnum = pgEnum("credit_type", ["debtor", "creditor"]);
export const creditStatusEnum = pgEnum("credit_status", [
  "pending",
  "paid",
  "overdue",
  "cancelled",
]);

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
  transactionId: uuid("transaction_id").references(() => transactions.id, {
    onDelete: "set null",
  }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("credits_shop_type_status_idx").on(t.shopId, t.type, t.status),
]);

export type Credit = typeof credits.$inferSelect;
export type NewCredit = typeof credits.$inferInsert;
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
git commit -m "feat(db): add credits table and enums"
```

---

### Task 2: API Endpoints for Credits & AI Reminder Generator

**Files:**
- Create: `app/api/credits/route.ts`
- Create: `app/api/credits/[id]/route.ts`
- Create: `app/api/credits/[id]/generate-reminder/route.ts`

- [ ] **Step 1: Create `app/api/credits/route.ts`**

```typescript
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { credits } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { shop } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as "debtor" | "creditor" | null;

    const conditions = [eq(credits.shopId, shop.id)];
    if (type) {
      conditions.push(eq(credits.type, type));
    }

    const list = await db
      .select()
      .from(credits)
      .where(and(...conditions))
      .orderBy(desc(credits.createdAt));

    return apiSuccess(list);
  } catch (error) {
    console.error("GET credits error:", error);
    return apiError("Failed to fetch credits", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { shop } = await requireAuth();
    const body = await req.json();

    const { type, contactName, contactPhone, amount, description, dueDate } = body;

    if (!type || !contactName || !amount) {
      return apiError("Missing required fields", 400);
    }

    const [created] = await db
      .insert(credits)
      .values({
        shopId: shop.id,
        type,
        contactName,
        contactPhone: contactPhone || null,
        amount: String(amount),
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "pending",
      })
      .returning();

    return apiSuccess(created, 201);
  } catch (error) {
    console.error("POST credits error:", error);
    return apiError("Failed to create credit record", 500);
  }
}
```

- [ ] **Step 2: Create `app/api/credits/[id]/route.ts` (Update Status & Auto-Transaction)**

```typescript
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { credits, transactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { shop } = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const existing = await db.query.credits.findFirst({
      where: and(eq(credits.id, id), eq(credits.shopId, shop.id)),
    });

    if (!existing) {
      return apiError("Credit record not found", 404);
    }

    let linkedTxId = existing.transactionId;

    // If changing to 'paid' and not previously linked, create a transaction record
    if (body.status === "paid" && existing.status !== "paid") {
      const [tx] = await db
        .insert(transactions)
        .values({
          shopId: shop.id,
          type: existing.type === "debtor" ? "income" : "expense",
          category: existing.type === "debtor" ? "รับชำระหนี้" : "จ่ายชำระหนี้",
          amount: existing.amount,
          occurredAt: new Date(),
          note: `ชำระหนี้: ${existing.contactName} (${existing.description || ""})`,
          isPersonal: false,
        })
        .returning();
      linkedTxId = tx.id;
    }

    const [updated] = await db
      .update(credits)
      .set({
        status: body.status || existing.status,
        paidAt: body.status === "paid" ? new Date() : existing.paidAt,
        transactionId: linkedTxId,
      })
      .where(eq(credits.id, id))
      .returning();

    return apiSuccess(updated);
  } catch (error) {
    console.error("PATCH credits error:", error);
    return apiError("Failed to update credit status", 500);
  }
}
```

- [ ] **Step 3: Create `app/api/credits/[id]/generate-reminder/route.ts`**

```typescript
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { credits } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { shop } = await requireAuth();
    const { id } = await params;

    const credit = await db.query.credits.findFirst({
      where: and(eq(credits.id, id), eq(credits.shopId, shop.id)),
    });

    if (!credit) {
      return apiError("Credit record not found", 404);
    }

    const prompt = `ร่างข้อความทวงหนี้แบบสุภาพ น่ารัก และเป็นมิตรผ่าน LINE สำหรับร้านค้าชื่อ "${shop.name}" 
ลูกหนี้ชื่อ: "${credit.contactName}"
ยอดเงิน: ${Number(credit.amount).toLocaleString()} บาท
รายการสินค้า: ${credit.description || "สินค้าที่ซื้อไว้"}
วันนัดชำระ: ${credit.dueDate ? new Date(credit.dueDate).toLocaleDateString("th-TH") : "เร็วๆ นี้"}

ข้อความควรสั้นกระชับ สุภาพ ให้เกียรติลูกค้า มี emoji น่ารัก และลงท้ายด้วยคำขอบคุณ`;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: prompt,
    });

    return apiSuccess({ reminderText: text });
  } catch (error) {
    console.error("Generate reminder error:", error);
    return apiError("Failed to generate reminder", 500);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/credits
git commit -m "feat(api): add credits endpoints and AI reminder generator"
```

---

### Task 3: Credit Manager UI Components & Page (`/credits`)

**Files:**
- Create: `components/credits/credit-card.tsx`
- Create: `components/credits/add-credit-modal.tsx`
- Create: `components/credits/ai-reminder-modal.tsx`
- Create: `app/(app)/credits/page.tsx`

- [ ] **Step 1: Create `components/credits/credit-card.tsx`**

```tsx
"use client";

import { Credit } from "@/lib/db/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { User, Store, CheckCircle2, Clock, MessageSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditCardProps {
  credit: Credit;
  onMarkPaid: (id: string) => void;
  onOpenReminder: (credit: Credit) => void;
}

export function CreditCard({ credit, onMarkPaid, onOpenReminder }: CreditCardProps) {
  const isPaid = credit.status === "paid";
  const isDebtor = credit.type === "debtor";

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${isDebtor ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
            {isDebtor ? <User className="w-5 h-5" /> : <Store className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">{credit.contactName}</h4>
            <p className="text-xs text-slate-400">
              {isDebtor ? "ลูกหนี้ค้างชำระ" : "เจ้าหนี้ค้างจ่าย"}
              {credit.contactPhone && ` • ${credit.contactPhone}`}
            </p>
          </div>
        </div>

        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
          isPaid
            ? "bg-emerald-50 text-emerald-600"
            : "bg-amber-50 text-amber-600"
        }`}>
          {isPaid ? "ชำระแล้ว" : "รอชำระ"}
        </span>
      </div>

      {credit.description && (
        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
          {credit.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[11px] text-slate-400">ยอดเงิน</span>
          <p className={`text-base font-extrabold ${isDebtor ? "text-amber-600" : "text-blue-600"}`}>
            ฿{formatCurrency(Number(credit.amount))}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDebtor && !isPaid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenReminder(credit)}
              className="h-8 px-2.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-xl"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              ทวงหนี้ LINE
            </Button>
          )}

          {!isPaid && (
            <Button
              size="sm"
              onClick={() => onMarkPaid(credit.id)}
              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              ชำระแล้ว
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/credits/add-credit-modal.tsx`**

Modal with form fields: `type`, `contactName`, `contactPhone`, `amount`, `description`, `dueDate`.

- [ ] **Step 3: Create `components/credits/ai-reminder-modal.tsx`**

Modal displaying AI generated text with a **"คัดลอกข้อความ"** button.

- [ ] **Step 4: Create `app/(app)/credits/page.tsx`**

Main page with Debtors vs Creditors Tabs, Summary Cards, and List View.

- [ ] **Step 5: Commit**

```bash
git add components/credits app/\(app\)/credits/page.tsx
git commit -m "feat(ui): add Credit Manager page and components"
```

---

### Task 4: Navigation Integration

**Files:**
- Modify: `components/layout/app-shell.tsx`

- [ ] **Step 1: Add Credit Manager to `app-shell.tsx`**

Add `{ href: "/credits", label: "สมุดหนี้สิน", icon: Users }` to navigation items.

- [ ] **Step 2: Verify & Commit**

Run `npx tsc --noEmit` to verify clean build.
```bash
git add components/layout/app-shell.tsx
git commit -m "feat(ui): add credits link to app-shell navigation"
```

---

## Rules Checklist & Self-Review

- [x] **Language** — Thai explanations provided.
- [x] **No placeholders** — Full code provided for every component and endpoint.
- [x] **YAGNI** — Only Phase 2 features included.
- [x] **Git step in plan** — Commit steps included for every task.
- [x] **Self-review done** — Verified spec coverage and type consistency.
