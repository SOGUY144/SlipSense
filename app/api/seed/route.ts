import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

const DEMO_TRANSACTIONS = [
  {
    type: "income" as const,
    category: "รายได้จากการขาย",
    amount: "8500.00",
    counterparty: "ลูกค้า Walk-in",
    note: "ยอดขายวันเสาร์",
    daysAgo: 1,
  },
  {
    type: "expense" as const,
    category: "ค่าวัตถุดิบ",
    amount: "3200.00",
    counterparty: "ตลาดสดเจริญกรุง",
    note: "ซื้อผัก เนื้อ ของสด",
    daysAgo: 2,
  },
  {
    type: "income" as const,
    category: "รายได้จากการขาย",
    amount: "12300.00",
    counterparty: "ลูกค้า Walk-in",
    note: "ยอดขายวันศุกร์",
    daysAgo: 3,
  },
  {
    type: "expense" as const,
    category: "ค่าเช่า",
    amount: "8000.00",
    counterparty: "เจ้าของตึก",
    note: "ค่าเช่าร้านเดือนนี้",
    daysAgo: 5,
  },
  {
    type: "expense" as const,
    category: "ค่าน้ำค่าไฟ",
    amount: "1850.00",
    counterparty: "การไฟฟ้านครหลวง",
    note: "ค่าไฟเดือนนี้",
    daysAgo: 7,
  },
  {
    type: "income" as const,
    category: "รายได้จากการขาย",
    amount: "9800.00",
    counterparty: "ลูกค้า Walk-in",
    note: "ยอดขายวันพฤหัส",
    daysAgo: 8,
  },
  {
    type: "expense" as const,
    category: "ค่าจ้าง",
    amount: "4500.00",
    counterparty: "พนักงาน Part-time",
    note: "ค่าจ้างสัปดาห์ที่ 2",
    daysAgo: 10,
  },
  {
    type: "expense" as const,
    category: "ค่าขนส่ง",
    amount: "650.00",
    counterparty: "Flash Express",
    note: "ค่าส่งของ",
    daysAgo: 12,
  },
  {
    type: "income" as const,
    category: "รายได้อื่นๆ",
    amount: "2000.00",
    counterparty: "ลูกค้าประจำ",
    note: "มัดจำสั่งของ",
    daysAgo: 15,
  },
  {
    type: "expense" as const,
    category: "ค่าวัตถุดิบ",
    amount: "2800.00",
    counterparty: "ตลาดสดเจริญกรุง",
    note: "ซื้อของสด",
    daysAgo: 18,
  },
  {
    type: "income" as const,
    category: "รายได้จากการขาย",
    amount: "11200.00",
    counterparty: "ลูกค้า Walk-in",
    note: "ยอดขายสุดสัปดาห์",
    daysAgo: 22,
  },
  {
    type: "expense" as const,
    category: "ค่าใช้จ่ายอื่นๆ",
    amount: "1200.00",
    counterparty: "ร้านเครื่องเขียน",
    note: "ซื้อถุง กล่อง สติกเกอร์",
    daysAgo: 25,
  },
  {
    type: "income" as const,
    category: "รายได้จากการขาย",
    amount: "7600.00",
    counterparty: "ลูกค้า Walk-in",
    note: "ยอดขายวันจันทร์",
    daysAgo: 28,
  },
  {
    type: "expense" as const,
    category: "ค่าวัตถุดิบ",
    amount: "3500.00",
    counterparty: "ตลาดสดเจริญกรุง",
    note: "ซื้อวัตถุดิบสัปดาห์",
    daysAgo: 32,
  },
  {
    type: "income" as const,
    category: "รายได้จากการขาย",
    amount: "10500.00",
    counterparty: "ลูกค้า Walk-in",
    note: "ยอดขายสุดสัปดาห์",
    daysAgo: 35,
  },
];

export async function POST() {
  try {
    const { shop } = await requireAuth();

    const now = new Date();
    const values = DEMO_TRANSACTIONS.map((tx) => {
      const occurredAt = new Date(now);
      occurredAt.setDate(occurredAt.getDate() - tx.daysAgo);
      return {
        shopId: shop.id,
        type: tx.type,
        category: tx.category,
        amount: tx.amount,
        occurredAt,
        counterparty: tx.counterparty,
        note: tx.note,
        confidence: "high" as const,
      };
    });

    const inserted = await db.insert(transactions).values(values).returning();

    return apiSuccess({
      message: `เพิ่มข้อมูลตัวอย่าง ${inserted.length} รายการแล้ว`,
      count: inserted.length,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to seed demo data", 500);
  }
}
