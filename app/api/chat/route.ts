import { streamText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError } from "@/lib/api/response";

const summarySchema = z.object({
  startDate: z.string().describe("วันเริ่มต้น YYYY-MM-DD"),
  endDate: z.string().describe("วันสิ้นสุด YYYY-MM-DD"),
});

const categorySchema = z.object({
  type: z.enum(["income", "expense"]).describe("ประเภทธุรกรรม"),
  startDate: z.string().describe("วันเริ่มต้น YYYY-MM-DD"),
  endDate: z.string().describe("วันสิ้นสุด YYYY-MM-DD"),
});

const recentSchema = z.object({
  limit: z.number().default(10).describe("จำนวนรายการที่ต้องการดึง"),
});

export async function POST(req: Request) {
  try {
    const { shop } = await requireAuth();
    const { messages } = await req.json();

    const systemPrompt = `คุณคือ "SlipSense AI" ผู้ช่วยทางการเงินและบัญชีประจำร้าน "${shop.name}"
หน้าที่ของคุณคือช่วยวิเคราะห์ ตอบคำถาม และให้คำแนะนำทางการเงินจากข้อมูลธุรกรรมของร้าน
ตอบด้วยภาษาที่เป็นมิตร เข้าใจง่าย เป็นภาษาไทย

คุณมีเครื่องมือ (Tools) ในการดึงข้อมูลจากฐานข้อมูลของร้าน:
1. get_financial_summary: ดึงยอดสรุปรายรับ รายจ่าย และกำไร ในช่วงเวลาที่ระบุ (เช่น เดือนนี้ เดือนที่แล้ว)
2. get_transactions_by_category: ดึงยอดสรุปแยกตามหมวดหมู่ (เช่น อยากรู้ว่าจ่ายค่าอะไรไปเยอะสุด)
3. get_recent_transactions: ดึงประวัติธุรกรรมล่าสุดเพื่อดูรายละเอียดแบบเจาะจง

ให้เรียกใช้เครื่องมือเหล่านี้ทุกครั้งที่ผู้ใช้ถามข้อมูลเกี่ยวกับตัวเลข หากไม่มีข้อมูลให้ตอบว่าไม่พบข้อมูล`;

    const result = await streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: messages,
      tools: {
        get_financial_summary: tool({
          description: "ดึงยอดสรุปรายรับ รายจ่าย และกำไร ในช่วงเวลาที่ระบุ",
          parameters: summarySchema,
          // @ts-ignore
          execute: async (args: z.infer<typeof summarySchema>) => {
            const { startDate, endDate } = args;
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const txs = await db
              .select({
                type: transactions.type,
                total: sql<number>`sum(${transactions.amount})`,
              })
              .from(transactions)
              .where(
                and(
                  eq(transactions.shopId, shop.id),
                  gte(transactions.occurredAt, start),
                  lte(transactions.occurredAt, end)
                )
              )
              .groupBy(transactions.type);

            let income = 0;
            let expense = 0;
            txs.forEach((t) => {
              if (t.type === "income") income = Number(t.total) || 0;
              if (t.type === "expense") expense = Number(t.total) || 0;
            });

            return {
              income,
              expense,
              profit: income - expense,
              startDate,
              endDate,
            };
          },
        }),
        get_transactions_by_category: tool({
          description: "ดึงยอดสรุปรายจ่ายหรือรายรับ แยกตามหมวดหมู่ ในช่วงเวลาที่ระบุ",
          parameters: categorySchema,
          // @ts-ignore
          execute: async (args: z.infer<typeof categorySchema>) => {
            const { type, startDate, endDate } = args;
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const txs = await db
              .select({
                category: transactions.category,
                total: sql<number>`sum(${transactions.amount})`,
              })
              .from(transactions)
              .where(
                and(
                  eq(transactions.shopId, shop.id),
                  eq(transactions.type, type),
                  gte(transactions.occurredAt, start),
                  lte(transactions.occurredAt, end)
                )
              )
              .groupBy(transactions.category)
              .orderBy(desc(sql`sum(${transactions.amount})`));

            return txs.map((t) => ({ category: t.category, total: Number(t.total) }));
          },
        }),
        get_recent_transactions: tool({
          description: "ดึงประวัติธุรกรรมล่าสุด 10-50 รายการ",
          parameters: recentSchema,
          // @ts-ignore
          execute: async (args: z.infer<typeof recentSchema>) => {
            const { limit } = args;
            const txs = await db
              .select()
              .from(transactions)
              .where(eq(transactions.shopId, shop.id))
              .orderBy(desc(transactions.occurredAt))
              .limit(limit);

            return txs.map((t) => ({
              date: t.occurredAt.toISOString().split("T")[0],
              type: t.type,
              category: t.category,
              amount: Number(t.amount),
              note: t.note || "",
            }));
          },
        }),
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API Error:", error);
    require('fs').writeFileSync('c:/Users/Asus/OneDrive/Desktop/SlipSense/scratch-error.log', String(error) + '\n' + ((error as any)?.stack || ''));
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to process chat", 500);
  }
}
