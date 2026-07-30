# AI Automation Features & Cash Flow Forecast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI Duplicate & Fake Slip Detection and AI 30-Day Cash Flow Forecasting to SlipSense.

**Architecture:** Extend `transactions` & `slip_jobs` schemas with `transRef` and risk metrics, update OpenAI Vision prompt and Zod extraction schemas, add duplicate check API middleware, create `/api/analytics/forecast` endpoint for 30-day projection, and update Dashboard and Review UI.

**Tech Stack:** Next.js App Router, TypeScript, Drizzle ORM, Supabase, Vercel AI SDK (OpenAI GPT-4o), Zod, Tailwind CSS, Lucide React.

## Global Constraints

- Never print, log, or push API keys or `.env.local` variables.
- Scopes all queries by `shopId`.
- Strictly enforce Type-safety with `npx tsc --noEmit`.

---

### Task 1: Update Schema & AI Prompt for Slip Risk & TransRef

**Files:**
- Modify: `lib/db/schema.ts`
- Modify: `lib/validations/schemas.ts`
- Modify: `lib/ai/slip-extraction.ts`

**Interfaces:**
- Consumes: Existing DB schemas and Zod validation schemas
- Produces: `transRef`, `riskScore`, `riskLevel`, `riskReasons` fields in DB & Zod schemas

- [ ] **Step 1: Add risk fields and `transRef` to `lib/db/schema.ts`**

Add `transRef`, `riskScore`, `riskLevel`, `riskReasons` to `slipJobs` and `transactions` tables.

```typescript
// in lib/db/schema.ts
export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high"]);

// Add to slipJobs and transactions:
transRef: text("trans_ref"),
riskScore: integer("risk_score").default(0),
riskLevel: riskLevelEnum("risk_level").default("low"),
riskReasons: jsonb("risk_reasons"),
```

- [ ] **Step 2: Update Zod validation schema in `lib/validations/schemas.ts`**

Add `transRef`, `riskScore`, `riskLevel`, `riskReasons` to `extractedSlipSchema`.

```typescript
export const extractedSlipSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string(),
  amount: z.number().positive(),
  occurredAt: z.string(),
  sender: z.string().nullable().optional(),
  receiver: z.string().nullable().optional(),
  confidence: z.enum(["high", "medium", "low"]).nullable().optional(),
  note: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  transRef: z.string().nullable().optional(),
  riskScore: z.number().optional().default(0),
  riskLevel: z.enum(["low", "medium", "high"]).optional().default("low"),
  riskReasons: z.array(z.string()).optional().default([]),
});
```

- [ ] **Step 3: Update AI Prompt in `lib/ai/slip-extraction.ts`**

Update prompt to extract transaction reference numbers (`transRef`) and evaluate image risk (font alignment, editing traces, image artifacts).

- [ ] **Step 4: Verify Type Check**

Run `npx tsc --noEmit` and ensure no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.ts lib/validations/schemas.ts lib/ai/slip-extraction.ts
git commit -m "feat: add transRef and risk assessment fields to DB schema and AI extraction"
```

---

### Task 2: Implement Duplicate Check Logic & Batch Review UI Update

**Files:**
- Modify: `app/api/slips/route.ts`
- Modify: `app/api/transactions/batch/route.ts`
- Modify: `app/(app)/review/batch/page.tsx`

**Interfaces:**
- Consumes: `transRef` from AI extraction
- Produces: Duplicate alert metadata and Risk Badges in Batch Review UI

- [ ] **Step 1: Duplicate check logic in `app/api/slips/route.ts` & `app/api/jobs/batch/route.ts`**

Check if `transRef` already exists in `transactions` or `slipJobs` for the current shop. If duplicate is found, set `riskLevel = 'high'`, `riskScore = 100`, and append `"สลิปนี้เคยถูกบันทึกในระบบแล้ว"` to `riskReasons`.

- [ ] **Step 2: Add Risk Badges & Warning Banners to `app/(app)/review/batch/page.tsx`**

Display Risk Badge (`🟢 ปลอดภัย`, `🟡 ควรตรวจสอบ`, `🔴 เสี่ยงสูง / สลิปซ้ำ`) and warning banner if duplicate or high risk is detected.

- [ ] **Step 3: Verify Type Check**

Run `npx tsc --noEmit`.

- [ ] **Step 4: Commit**

```bash
git add app/api/slips/route.ts app/api/jobs/batch/route.ts app/(app)/review/batch/page.tsx
git commit -m "feat: implement duplicate slip detection and risk indicators in batch review"
```

---

### Task 3: Display Verification & Risk Info in Transaction Detail Page

**Files:**
- Modify: `app/api/transactions/[id]/route.ts`
- Modify: `app/(app)/transactions/[id]/page.tsx`

**Interfaces:**
- Consumes: `transRef`, `riskLevel`, `riskReasons` from transaction record
- Produces: Security verification section in detail page

- [ ] **Step 1: Pass risk fields in `app/api/transactions/[id]/route.ts`**

Ensure `transRef`, `riskLevel`, `riskReasons` are returned by the GET endpoint.

- [ ] **Step 2: Add Security Verification Card to `app/(app)/transactions/[id]/page.tsx`**

Add a card displaying:
- Transaction Reference Code (`transRef`)
- Security Status Badge (Low / Medium / High Risk)
- List of risk reasons if flagged

- [ ] **Step 3: Verify Type Check**

Run `npx tsc --noEmit`.

- [ ] **Step 4: Commit**

```bash
git add app/api/transactions/[id]/route.ts app/(app)/transactions/[id]/page.tsx
git commit -m "feat: add security verification and transRef to transaction detail view"
```

---

### Task 4: Create AI 30-Day Cash Flow Forecasting API

**Files:**
- Create: `app/api/analytics/forecast/route.ts`

**Interfaces:**
- Consumes: Historical transactions and recurring bills (`reminders`)
- Produces: 30-day forecast array and AI recommendation text

- [ ] **Step 1: Create `/api/analytics/forecast/route.ts`**

Implement endpoint to:
1. Aggregate daily average income and expenses over last 90 days.
2. Incorporate scheduled recurring bill amounts.
3. Calculate 30-day daily projected balance.
4. If projected balance drops below zero, generate an AI recommendation alert.

- [ ] **Step 2: Verify Type Check**

Run `npx tsc --noEmit`.

- [ ] **Step 3: Commit**

```bash
git add app/api/analytics/forecast/route.ts
git commit -m "feat: create 30-day cash flow forecast and early warning API endpoint"
```

---

### Task 5: Add Cash Flow Forecast Widget to Dashboard UI

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `/api/analytics/forecast`
- Produces: Dashboard Forecast Chart & Early Warning Card

- [ ] **Step 1: Integrate Cash Flow Forecast & Early Warning Banner in `app/(app)/dashboard/page.tsx`**

Render:
1. **Early Warning Banner:** Highlighted card when cash shortage risk is flagged with AI advice.
2. **Forecast Summary Card:** Showing projected balance in 30 days and trend direction.

- [ ] **Step 2: Verify Type Check**

Run `npx tsc --noEmit`.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/dashboard/page.tsx
git commit -m "feat: integrate cash flow forecast chart and early warning widget in dashboard"
```
