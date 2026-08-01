# Design Spec: Analytics Charts Upgrade (Peak Hours, Supplier Breakdown, Payment Method)

## 1. Overview & Goal
Enhance SlipSense's financial analytics page (`/analytics`) by adding 3 actionable visual charts specifically tailored for Thai mom-and-pop store (ร้านโชห่วย) & SME owners:
1. **Peak Sales Hours Chart (ช่วงเวลาขายดี):** Bar chart showing revenue distribution by hour of day (with 🔥 peak hour highlight).
2. **Supplier Spend Breakdown Chart (สัดส่วนซัพพลายเออร์):** Donut chart showing percentage of total expense spent per supplier (e.g. Makro vs Local Wholesalers).
3. **Payment Method Breakdown Chart (โอน PromptPay vs เงินสด):** Pie/donut chart comparing transfer slip sales vs cash in drawer.

---

## 2. User Experience (UX / UI Design)

### A. Peak Sales Hours Chart
- **Visual:** Vertical Bar Chart grouped into 2-hour interval buckets (`06:00`, `08:00`, `10:00`, `12:00`, `14:00`, `16:00`, `18:00`, `20:00`, `22:00`).
- **Highlight Card:** Displays a prominent badge summarizing peak performance:
  - *"🔥 ช่วงพีคของวัน: 17:00 - 19:00 น. (ทำยอดขายรวม ฿12,400)"*

### B. Supplier Spend Breakdown Chart
- **Visual:** Donut Chart + Category List displaying supplier spend percentage.
- **Card Content:** Lists each supplier name, total Baht spent, and percentage of monthly expense.

### C. Payment Method Breakdown Chart
- **Visual:** Donut / Pie Chart displaying **PromptPay QR Transfer %** vs **Cash in Drawer %**.
- **Card Content:** Summary of gross sales split by payment channel.

---

## 3. API Contract Updates (`app/api/analytics/route.ts`)

Enhance `GET /api/analytics` response to include:
- `hourlyTrend`: Array<{ hourLabel: string, income: number }>
- `peakHourLabel`: string (e.g. "17:00 - 19:00 น.")
- `supplierBreakdown`: Array<{ supplierName: string, amount: number, percentage: number }>
- `paymentMethodBreakdown`: Array<{ method: string, amount: number, percentage: number }>

Also enforce `isPersonal = false` on all transaction queries.

---

## 4. Verification & Testing Strategy
1. **TypeScript Check:** Run `npx tsc --noEmit`.
2. **Build Check:** Run `npm run build`.
3. **UI Verification:** Check `/analytics` page renders all 7 charts smoothly with responsive tooltips.
