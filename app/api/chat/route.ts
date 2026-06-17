import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError } from "@/lib/api/response";

export async function POST(req: Request) {
  try {
    const { shop } = await requireAuth();
    const { messages } = await req.json();

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY || "",
    });

    const txs = await db
      .select()
      .from(transactions)
      .where(eq(transactions.shopId, shop.id))
      .orderBy(desc(transactions.occurredAt))
      .limit(100);

    let contextData = "ไม่มีประวัติการทำธุรกรรม";
    if (txs.length > 0) {
      contextData = txs
        .map((t) => {
          const date = new Intl.DateTimeFormat("th-TH", {
            dateStyle: "short",
          }).format(t.occurredAt);
          const typeStr = t.type === "income" ? "รายรับ" : "รายจ่าย";
          return `- ${date} | ${typeStr} | ${t.category} | ${t.amount} บาท | รายละเอียด: ${t.counterparty || "-"} / ${t.note || "-"}`;
        })
        .join("\n");
    }

    const systemPrompt = `คุณคือ "SlipSense AI" ผู้ช่วยทางการเงินและบัญชีประจำร้าน "${shop.name}"
หน้าที่ของคุณคือช่วยวิเคราะห์ ตอบคำถาม และให้คำแนะนำทางการเงินจากข้อมูลธุรกรรมของร้าน
ตอบด้วยภาษาที่เป็นมิตร เข้าใจง่าย เป็นภาษาไทย

ข้อมูลธุรกรรมล่าสุดของร้าน (สูงสุด 100 รายการ):
${contextData}

ถ้าผู้ใช้ถามข้อมูลที่ไม่มีในประวัติ ให้ตอบไปตามตรงว่าไม่มีข้อมูล`;

    // Sanitize messages for Gemini (must alternate user/model)
    const sanitizedMessages = [];
    for (const msg of messages) {
      if (sanitizedMessages.length > 0 && sanitizedMessages[sanitizedMessages.length - 1].role === msg.role) {
        sanitizedMessages.pop();
      }
      sanitizedMessages.push(msg);
    }

    const result = await streamText({
      model: google("gemini-flash-latest"),
      system: systemPrompt,
      messages: sanitizedMessages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API Error:", error);
    require('fs').writeFileSync('c:/Users/Asus/OneDrive/Desktop/SlipSense/scratch-error.log', String(error) + '\n' + (error?.stack || ''));
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to process chat", 500);
  }
}
