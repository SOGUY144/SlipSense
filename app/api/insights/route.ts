import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, insights } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { generateInsights } from "@/lib/ai/slip-extraction";

export async function GET() {
  try {
    const { shop } = await requireAuth();

    const latest = await db
      .select()
      .from(insights)
      .where(eq(insights.shopId, shop.id))
      .orderBy(desc(insights.generatedAt))
      .limit(3);

    return apiSuccess(latest);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to fetch insights", 500);
  }
}

export async function POST() {
  try {
    const { shop } = await requireAuth();

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const txs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.shopId, shop.id),
          gte(transactions.occurredAt, threeMonthsAgo),
          lte(transactions.occurredAt, now)
        )
      );

    if (txs.length < 3) {
      return apiError("ต้องมีธุรกรรมอย่างน้อย 3 รายการก่อนสร้างคำแนะนำ", 400);
    }

    const categoryTotals = new Map<string, number>();
    let totalIncome = 0;
    let totalExpense = 0;

    txs.forEach((t) => {
      const amount = parseFloat(t.amount);
      if (t.type === "income") {
        totalIncome += amount;
      } else {
        totalExpense += amount;
        categoryTotals.set(
          t.category,
          (categoryTotals.get(t.category) ?? 0) + amount
        );
      }
    });

    let prefsText = "";
    const prefs = shop.preferences as any;
    if (prefs) {
      prefsText = `
โปรไฟล์พฤติกรรมผู้ใช้ (สำคัญมาก! ใช้อ้างอิงการให้คำแนะนำ):
- เป้าหมายงบใช้จ่ายต่อวัน: ${prefs.dailyBudget} บาท
- โซนที่พักอาศัย/ค่าครองชีพ: ${prefs.location}
- สถานะครอบครัว/ภาระ: ${prefs.familyStatus}
- ลักษณะอาชีพ/รายได้: ${prefs.jobStatus}
      `.trim();
    }

    const summary = `
ร้าน: ${shop.name}
รายรับรวม 3 เดือน: ฿${totalIncome.toLocaleString()}
รายจ่ายรวม 3 เดือน: ฿${totalExpense.toLocaleString()}
กำไร: ฿${(totalIncome - totalExpense).toLocaleString()}
หมวดค่าใช้จ่าย:
${Array.from(categoryTotals.entries())
  .map(([cat, amt]) => `- ${cat}: ฿${amt.toLocaleString()}`)
  .join("\n")}
จำนวนธุรกรรม: ${txs.length} รายการ

${prefsText}
    `.trim();

    const generated = await generateInsights(summary);

    const inserted = await db
      .insert(insights)
      .values(
        generated.map((g) => ({
          shopId: shop.id,
          content: g.content,
          metadata: g.metadata ?? null,
        }))
      )
      .returning();

    return apiSuccess(inserted, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to generate insights", 500);
  }
}
