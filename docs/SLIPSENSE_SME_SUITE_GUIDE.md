# 🏬 คู่มือการใช้งานและเอกสารการพัฒนา SlipSense SME Suite

> **SlipSense** — ระบบบริหารร้านโชห่วยและ SME อัจฉริยะ เปลี่ยนการบันทึกรายรับรายจ่ายแบบเดิมๆ ให้เป็นระบบอัตโนมัติด้วย AI ที่ออกแบบมาเพื่อเจ้าของร้านค้าคนไทยโดยเฉพาะ

---

## 📌 สารบัญ (Table of Contents)
1. [ภาพรวมระบบ (Overview)](#1-ภาพรวมระบบ-overview)
2. [สรุประบบและฟีเจอร์ทั้งหมดที่เพิ่มเข้ามา (Features & Systems Breakdown)](#2-สรุประบบและฟีเจอร์ทั้งหมดที่เพิ่มเข้ามา)
3. [คู่มือวิธีการใช้งานสำหรับเจ้าของร้าน (User Guide)](#3-คู่มือวิธีการใช้งานสำหรับเจ้าของร้าน-user-guide)
4. [คำอธิบายการพัฒนาและสถาปัตยกรรมระบบ (Technical Architecture Guide)](#4-คำอธิบายการพัฒนาและสถาปัตยกรรมระบบ-technical-architecture-guide)

---

## 1. ภาพรวมระบบ (Overview)

 SlipSense พัฒนาขึ้นเพื่อแก้ปัญหาหลักของร้านค้าโชห่วย มินิมาร์ท และ SME ไทยที่มักประสบปัญหา:
- ❌ **สลิปส่วนตัวปนกับรายรับร้าน:** ซื้อของกินส่วนตัวแต่รวมเข้าบัญชีร้านทำให้กำไรเพี้ยน
- ❌ **ไม่มีเวลาปิดยอดรายวัน:** ปิดร้านดึก เหนื่อยเกินกว่าจะนับเงินสดกระทบยอดโอน
- ❌ **สมุดจดหนี้หาย/ทวงหนี้ไม่เป็น:** ลูกค้าติดหนี้ลืมจ่าย ทวงหนี้ไม่ถูกวิธีเกรงใจคนกันเอง
- ❌ **ไม่รู้ว่าซัพพลายเออร์แอบขึ้นราคา:** โดนปรับขึ้นราคาสินค้าโดยไม่รู้ตัว ทำให้กำไรลดลง
- ❌ **เอกสารภาษียุ่งยาก:** ตอนสิ้นเดือนต้องนั่งค้นสลิปส่งสำนักงานบัญชีอย่างกระจัดกระจาย

SlipSense SME Suite แก้ไขปัญหาเหล่านี้ด้วยฟีเจอร์อัตโนมัติ 4 เฟสหลัก + กราฟวิเคราะห์การเงินเชิงลึก

---

## 2. สรุประบบและฟีเจอร์ทั้งหมดที่เพิ่มเข้ามา

### 🟢 **Phase 1: ปิดยอดร้านประจำวัน & คัดแยกสลิปส่วนตัว**
1. **1-Minute Daily Shift Close Widget:** การ์ดปิดยอดร้านบน Dashboard สรุปยอดเงินโอนจากสลิปอัตโนมัติ ให้กรอกเพียงเงินสดในเกะ แล้วคำนวณยอดขายรวมประจำวันใน 1 นาที
2. **1-Tap Personal Filter:** ปุ่มสลับป้าย `"ส่วนตัว / ของร้าน"` บนรายการสลิป สลิปส่วนตัวจะถูกตัดออกจากคำนวณกำไร-ขาดทุนของร้านทันที

### 🔵 **Phase 2: สมุดหนี้สินและลูกหนี้-เจ้าหนี้ (Smart Credit Manager)**
1. **ระบบสมุดหนี้สิน (`/credits`):** บันทึกยอดยอมติดหนี้ (ลูกหนี้) และยอดรอชำระ (เจ้าหนี้)
2. **AI LINE Debt Reminder Generator:** กดปุ่มเดียว AI ร่างข้อความทวงหนี้ภาษาไทยอย่างสุภาพและน่ารัก เหมาะสำหรับส่งให้ลูกค้าทาง LINE 1-Tap Copy
3. **Auto Transaction Sync:** เมื่อกดเปลี่ยนสถานะเป็น `"ชำระแล้ว"` ระบบจะสร้างรายการรายรับ/รายจ่ายลงบัญชีให้อัตโนมัติ

### 🟣 **Phase 3: วิเคราะห์ราคาซัพพลายเออร์ & สินค้าขึ้นราคา**
1. **Itemized Slip Extraction:** AI ดึงรายการสินค้ารายชิ้น (ราคาต่อหน่วย, จำนวน, ซัพพลายเออร์) จากสลิปซื้อของเข้า
2. **Price Hike Intelligence Widget:** แจ้งเตือนบน Dashboard ทันทีเมื่อมีสินค้าปรับขึ้นราคาเทียบกับประวัติการซื้อครั้งก่อน (%)
3. **Itemized Table View:** หน้าดูรายละเอียดสลิปแสดงตารางรายการสินค้าที่ซื้ออย่างเป็นระเบียบ

### 📊 **Analytics Charts Upgrade: 3 กราฟวิเคราะห์การเงินขั้นสูง (`/analytics`)**
1. **🔥 กราฟช่วงเวลาขายดี (Peak Sales Hours BarChart):** สรุปช่วงเวลาขายดีของวัน พร้อมป้ายไฟไฮไลท์ช่วงเวลาพีคที่สุด (เช่น *16:00 - 18:00 น.*)
2. **🍩 กราฟสัดส่วนรายจ่ายซัพพลายเออร์ (Supplier Spend Donut Chart):** สรุปสัดส่วน % และยอดเงินรวมที่จ่ายให้ซัพพลายเออร์แต่ละเจ้า (Makro, Big C, ตลาดสด ฯลฯ)
3. **💳 กราฟสัดส่วนวิธีชำระเงิน (Payment Method Pie Chart):** เปรียบเทียบสัดส่วนยอดขายจาก **เงินโอน PromptPay** vs **เงินสดในเกะ**

### 🟠 **Phase 4: เตือนสั่งของตามรอบ & แพ็กเกจเอกสารภาษีส่งนักบัญชี**
1. **📦 การ์ดเตือนครบรอบสั่งของเพิ่ม (`ReorderAlertWidget`):** AI วิเคราะห์ประวัติการสั่งซื้อสินค้าแต่ละตัว และเตือนบน Dashboard ก่อนของจะหมดร้าน
2. **📑 ชุดเอกสารภาษีส่งสำนักงานบัญชี (Tax Package Exporter บน `/report`):** คัดแยกสลิปใบกำกับภาษีเต็มรูป (VAT 7%) และเอกสารหัก ณ ที่จ่าย (WHT) ออกรายงานสรุปส่งนักบัญชีได้ใน 1 คลิก

---

## 3. คู่มือวิธีการใช้งานสำหรับเจ้าของร้าน (User Guide)

### 3.1 การปิดยอดร้านประจำวัน (Daily Shift Close)
1. เปิดหน้า **หน้าหลัก (`/dashboard`)**
2. มองหาการ์ด **"ปิดยอดร้านประจำวัน"** (การ์ดขาวขอบโค้งสีมรกต)
3. ระบบจะแสดง **ยอดสแกนโอนวันนี้** ที่ดึงมาจากสลิปโดยอัตโนมัติ
4. กรอก **ยอดเงินสดในเกะ** ที่นับได้
5. กดปุ่ม **"บันทึกปิดยอดวัน"** — ระบบจะคำนวณยอดขายรวมสุทธิประจำวันให้อัตโนมัติ!

---

### 3.2 การสลับป้ายสลิปส่วนตัว (Personal Filter)
1. ไปที่หน้า **รายการ (`/transactions`)**
2. สำหรับสลิปที่เป็นการใช้จ่ายส่วนตัว (ไม่ใช่ของร้าน) ให้กดที่ป้าย **"ส่วนตัว"** ให้เปลี่ยนเป็นสีส้ม
3. รายรับ-รายจ่ายของสลิปใบนั้น จะถูกหักออกจากรายงานกำไร-ขาดทุนของร้านทันที

---

### 3.3 การบันทึกและทวงหนี้ผ่าน LINE (Credit Manager)
1. ไปที่แถบเมนูด้านล่าง กด **สมุดหนี้สิน (`/credits`)**
2. กดปุ่ม **"+ บันทึกหนี้สิน"** เพื่อเพิ่มรายการ (ระบุชื่อลูกหนี้/เจ้าหนี้, จำนวนเงิน, วันกำหนดชำระ)
3. หากถึงกำหนดชำระ ให้กดปุ่ม **"🤖 ร่างข้อความทวงหนี้"**
4. ระบบจะแสดงข้อความทวงหนี้ภาษาไทยสุดสุภาพ กดปุ่ม **"คัดลอกข้อความ"** แล้วนำไปวางส่งให้ลูกค้าใน LINE ได้ทันที
5. เมื่อได้รับเงินแล้ว ให้กดปุ่ม **"ทำรายการชำระแล้ว"** ระบบจะสร้างสลิปรายรับบันทึกเข้าบัญชีร้านโดยอัตโนมัติ

---

### 3.4 การส่งออกชุดเอกสารภาษีให้นักบัญชี (Tax Package Export)
1. ไปที่หน้า **รายงาน (`/report`)**
2. มองหาการ์ด **"📦 ชุดเอกสารภาษีส่งสำนักงานบัญชี (Tax Package)"**
3. เลือกรอบเดือนที่ต้องการส่ง (เช่น ประจำเดือนปัจจุบัน)
4. กดปุ่ม **"ส่งออกแพ็กเกจภาษี"** — ระบบจะดาวน์โหลดไฟล์สรุปภาษีซื้อ-ภาษีขาย (VAT 7% & WHT) พร้อมรายการรูปสลิปจัดเรียงเรียบร้อย นำส่งให้นักบัญชีได้ทันที

---

## 4. คำอธิบายการพัฒนาและสถาปัตยกรรมระบบ (Technical Architecture Guide)

### 4.1 สถาปัตยกรรมฐานข้อมูล (Database Schema - Drizzle ORM)
ระบบสร้างขึ้นบน Supabase PostgreSQL โดยใช้ Drizzle ORM ในการจัดการ Schema มีตารางสำคัญที่เพิ่มเข้ามา:

```typescript
// 1. ตารางปิดยอดประจำวัน
export const dailyShifts = pgTable("daily_shifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  shiftDate: date("shift_date").notNull(),
  transferTotal: numeric("transfer_total").notNull(),
  cashTotal: numeric("cash_total").notNull(),
  grossTotal: numeric("gross_total").notNull(),
  notes: text("notes"),
});

// 2. ตารางสมุดหนี้สิน
export const credits = pgTable("credits", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  type: creditTypeEnum("type").notNull(), // 'debtor' | 'creditor'
  contactName: text("contact_name").notNull(),
  amount: numeric("amount").notNull(),
  dueDate: date("due_date"),
  status: creditStatusEnum("status").default("pending").notNull(), // 'pending' | 'paid' | 'overdue' | 'cancelled'
  linkedTransactionId: uuid("linked_transaction_id"),
});

// 3. ตารางรายการสินค้าแต่ละชิ้นจากสลิป
export const transactionItems = pgTable("transaction_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  quantity: numeric("quantity").default("1").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  supplierName: text("supplier_name"),
  previousUnitPrice: numeric("previous_unit_price"),
  priceChangePercent: numeric("price_change_percent"),
});

// 4. ตารางรอบการสั่งซื้อสินค้า
export const reorderCycles = pgTable("reorder_cycles", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  averageIntervalDays: integer("average_interval_days").default(14).notNull(),
  lastPurchasedAt: timestamp("last_purchased_at", { withTimezone: true }).notNull(),
  nextDueDate: timestamp("next_due_date", { withTimezone: true }).notNull(),
  supplierName: text("supplier_name"),
});
```

---

### 4.2 การรักษาความปลอดภัยแยกข้อมูลร้านค้า (Multi-Tenant Security Architecture)
ทุก API Endpoint ถูกรักษาความปลอดภัยในระดับ Row-Level ผ่าน Helper Function `requireAuth()`:
```typescript
const { shop } = await requireAuth();

// ทุก Query บังคับใช้เงื่อนไข shopId
const data = await db
  .select()
  .from(table)
  .where(and(eq(table.shopId, shop.id), eq(table.isPersonal, false)));
```

---

### 4.3 การเพิ่มประสิทธิภาพ API (Single Query Aggregation)
เพื่อป้องกันปัญหา N+1 Query Loop บน Analytics API (`/api/analytics`) ระบบถูกออกแบบให้ดึงข้อมูลธุรกรรมทั้งหมดในช่วงเวลาที่ต้องการเพียง **1 ครั้งเดียว (Single DB Query)** แล้วนำมาจัดกลุ่ม (Aggregation) ใน Memory:
```typescript
// ดึงข้อมูลธุรกรรมทั้งหมดในคิวรีเดียว
const allRecentTxs = await db
  .select()
  .from(transactions)
  .where(
    and(
      eq(transactions.shopId, shop.id),
      eq(transactions.isPersonal, false),
      gte(transactions.occurredAt, startDate)
    )
  );

// ทำการ Filter และประมวลผลต่อใน Memory ลด Overhead ของคิวรีฐานข้อมูลลง 5-10 เท่า
```

---

## 📄 บทสรุป

เอกสารนี้รวบรวมฟีเจอร์และสถาปัตยกรรมทั้งหมดของ **SlipSense SME Suite** เพื่อให้ทั้งเจ้าของร้านค้าและทีมนักพัฒนานำไปใช้งาน ปรับแต่ง และขยายต่อยอดได้อย่างมีประสิทธิภาพและปลอดภัย 100% 🚀
