# Design Specification: SlipSense AI Automation & Smart Features

**Date:** 2026-07-30  
**Status:** Approved (Approach A)  
**Author:** Antigravity AI & SlipSense Lead  

---

## 1. Overview & Objective

Enhance SlipSense with advanced AI Automation capabilities to protect small businesses from fraud and help them anticipate financial bottlenecks:
1. **AI Duplicate & Fake Slip Protection (ระบบตรวจสลิปซ้ำ & สลิปเสี่ยง/ปลอม):** Instantly detect reused slip transaction reference codes (`transRef`) and flag suspicious visual image anomalies (font inconsistency, editing traces).
2. **AI Cash Flow Forecasting & Early Warning (ระบบทำนายกระแสเงินสดล่วงหน้า 30 วัน):** Analyze historical income/expense patterns and recurring bills to project future cash balance and provide early warnings before cash shortages occur.
3. **Future Roadmap Alignment (ระบบบัญชีสำหรับอนาคต):** Prepare architecture to easily integrate Tax Reports (PDF/Excel), LINE Notification Integration, and Material/Inventory Tracking.

---

## 2. System Architecture & Components

### 2.1 AI Duplicate & Fake Slip Detection Module

#### A. Database Schema Updates (`lib/db/schema.ts`)
- **`transactions` & `slip_jobs` tables:**
  - `transRef` (text, optional, indexed): Stores the bank transaction reference number extracted from the slip (e.g. `202607301234567`).
  - `riskScore` (integer, default 0): Risk rating from 0 (safe) to 100 (high risk).
  - `riskLevel` (enum: `'low' | 'medium' | 'high'`, default `'low'`).
  - `riskReasons` (jsonb / text array, optional): Detailed reasons flagged by AI (e.g. `["สลิปนี้เคยถูกบันทึกไปแล้ว", "ตัวเลขอายะทัศน์ไม่สม่ำเสมอ"]`).

#### B. Backend Verification Logic (`lib/ai/slip-extraction.ts` & `app/api/slips/route.ts`)
1. **Duplicate Check:**
   - Prior to creating a transaction, query existing `transactions` and `slip_jobs` by `shopId` and `transRef`.
   - If a matching `transRef` exists, flag `isDuplicate = true`, set `riskLevel = 'high'`, and attach duplicate alert metadata with the date/time of the prior record.
2. **Visual Anomaly Check (AI Prompting):**
   - Update OpenAI Vision prompt in `buildSlipExtractionPrompt` to evaluate image authenticity (font mismatch, misaligned text, suspicious compression artifacts around amount/time).
   - Return `transRef`, `riskScore`, `riskLevel`, and `riskReasons` in the Zod schema (`extractedSlipSchema`).

#### C. UI/UX Changes
- **Review Page (`app/(app)/review/batch/page.tsx`):**
  - Show a prominent warning banner ⚠️ if a slip is identified as duplicate or high-risk.
  - Display risk badge (🟢 Low / 🟡 Medium / 🔴 High Risk) next to each item.
- **Transaction Detail (`app/(app)/transactions/[id]/page.tsx`):**
  - Display security verification badge and reference code (`transRef`).

---

### 2.2 AI Cash Flow Forecasting & Early Warning Module

#### A. Backend Analytics Endpoint (`app/api/analytics/forecast/route.ts`)
- **Historical Analysis:** Queries transactions from the past 90 days grouped by day/type.
- **Recurring Bill Detection:** Integrates with existing `reminders` / scheduled bills table to account for fixed monthly expenses (rent, utilities, salaries).
- **30-Day Projection Algorithm:**
  - Calculates daily average income and recurring expense schedule.
  - Generates a 30-day forecast array: `[{ date: string, projectedIncome: number, projectedExpense: number, projectedBalance: number }]`.
  - Determines if `projectedBalance` falls below threshold (e.g., < 0 or < 10% of monthly average).
- **AI Recommendation Engine:** If a cash shortage is projected, calls LLM to generate targeted advice (e.g., "คาดการณ์วันที่ 25 เงินอาจไม่พอจ่ายค่าเช่า ฿15,000 แนะนำเร่งเก็บเงินลูกค้าหรือจัดโปรโมชั่นช่วงต้นสัปดาห์").

#### B. Dashboard UI Widget (`app/(app)/dashboard/page.tsx`)
- **Cash Flow Forecast Chart:**
  - Interactive line chart showing actual cash flow (past 30 days) transitioning into projected cash flow (next 30 days) with a dashed trendline.
- **Early Warning Banner:**
  - Highlighted card on the Dashboard if a shortage risk is detected within 14-30 days, complete with AI recommendations.

---

## 3. Future Roadmap (Phase 2 Specifications)

1. **Tax & Accounting Export (PDF/Excel):**
   - Format transaction summaries into official Thai Revenue Department (กรมสรรพากร) compliant templates for monthly tax reporting.
2. **LINE Notification Integration:**
   - Webhook endpoint allowing merchants to forward slip images directly to a LINE Official Account bot to record transactions seamlessly without opening the web app.
3. **Inventory & Material Tracking:**
   - Deduct ingredient/stock balances automatically based on extracted bill line items.

---

## 4. Security & Privacy Guarantees

- **No Secrets Exposure:** `.env.local` and all API keys are strictly kept local and excluded via `.gitignore`.
- **Zero Sensitive Log Exposure:** API keys and raw tokens will never be printed, logged, or included in commit messages.
- **Tenant Isolation:** All database queries strictly enforce `shopId` scoping via Drizzle ORM.

---

## 5. Verification Plan

1. **Duplicate Test:** Upload a slip with a known `transRef` twice and verify the second upload triggers a duplicate warning and high-risk flag.
2. **Forecast Test:** Verify `/api/analytics/forecast` correctly calculates projected balance using mock or existing transactions and displays the trendline on the dashboard.
3. **Type & Build Verification:** Run `npx tsc --noEmit` to ensure clean TypeScript compilation without errors.
