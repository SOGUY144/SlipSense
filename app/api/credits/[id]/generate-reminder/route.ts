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
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Generate reminder error:", error);
    return apiError("Failed to generate reminder", 500);
  }
}
