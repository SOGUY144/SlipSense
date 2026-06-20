import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  extractedSlipSchema,
  type ExtractedSlip,
} from "@/lib/validations/schemas";

const SLIP_EXTRACTION_PROMPT = `คุณเป็น AI ผู้เชี่ยวชาญในการอ่านสลิปโอนเงินธนาคารไทย (PromptPay, KBank, SCB, Krungthai, BBL, TTB, ฯลฯ)

วิเคราะห์รูปสลิปและส่งคืนข้อมูลตามโครงสร้างที่กำหนด
หมวดหมู่รายรับ: "รายได้จากการขาย", "รายได้อื่นๆ"
หมวดหมู่รายจ่าย: "ค่าวัตถุดิบ", "ค่าเช่า", "ค่าจ้าง", "ค่าน้ำค่าไฟ", "ค่าขนส่ง", "ค่าใช้จ่ายอื่นๆ"

กฎ:
- ถ้าเงินเข้าบัญชีร้าน = income, เงินออกจากบัญชี = expense
- ถ้าอ่านไม่ชัด ให้ confidence ต่ำและเดาอย่างสมเหตุสมผล`;

const INSIGHT_PROMPT = `คุณเป็นที่ปรึกษาการเงินสำหรับร้าน SME ไทย
วิเคราะห์ข้อมูลการเงินต่อไปนี้และให้คำแนะนำ 2-3 ข้อ 
กฎสำคัญ: 
- ตอบให้สั้น กระชับ ตรงประเด็นที่สุด (ข้อละไม่เกิน 1-2 บรรทัด)
- ใช้ตัวเลขจริงจากข้อมูลประกอบ ห้ามตอบกว้างๆ
- อ่านแล้วเข้าใจง่าย นำไปทำตามได้ทันที
ตอบเป็นภาษาไทย`;

async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const is503 = error?.status === 503 || error?.message?.includes("Service Unavailable") || error?.message?.includes("503");
      const is429 = error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Too Many Requests");
      const isRetryable = is503 || is429;
      
      if (!isRetryable || i === maxRetries - 1) throw error;
      
      // Exponential backoff + jitter
      const delay = 1000 * Math.pow(2, i) + Math.random() * 500;
      console.log(`[AI Retry] API busy, retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

const aiSlipSchema = z.object({
  amount: z.number(),
  occurredAt: z.string(),
  counterparty: z.string().nullable(),
  note: z.string().nullable(),
  type: z.enum(["income", "expense"]),
  category: z.string(),
  bank: z.string().nullable(),
  overallConfidence: z.enum(["high", "medium", "low"]),
  fieldConfidence: z.object({
    amount: z.enum(["high", "medium", "low"]).nullable(),
    occurredAt: z.enum(["high", "medium", "low"]).nullable(),
    counterparty: z.enum(["high", "medium", "low"]).nullable(),
    note: z.enum(["high", "medium", "low"]).nullable(),
    type: z.enum(["high", "medium", "low"]).nullable(),
    category: z.enum(["high", "medium", "low"]).nullable(),
  }).nullable(),
});

export async function extractSlipData(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ExtractedSlip> {
  return callWithRetry(async () => {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: aiSlipSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SLIP_EXTRACTION_PROMPT },
            { type: "image", image: `data:${mediaType};base64,${imageBase64}` }
          ]
        }
      ]
    });
    
    return {
      amount: object.amount,
      occurredAt: object.occurredAt,
      type: object.type,
      category: object.category,
      counterparty: object.counterparty || undefined,
      note: object.note || undefined,
      bank: object.bank || undefined,
      overallConfidence: object.overallConfidence,
      fieldConfidence: object.fieldConfidence ? {
        amount: object.fieldConfidence.amount || undefined,
        occurredAt: object.fieldConfidence.occurredAt || undefined,
        counterparty: object.fieldConfidence.counterparty || undefined,
        note: object.fieldConfidence.note || undefined,
        type: object.fieldConfidence.type || undefined,
        category: object.fieldConfidence.category || undefined,
      } : undefined,
    };
  });
}

export interface InsightResult {
  content: string;
  metadata?: Record<string, unknown>;
}

export async function generateInsights(
  financialSummary: string
): Promise<InsightResult[]> {
  return callWithRetry(async () => {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      output: "array",
      schema: z.object({
        content: z.string(),
        metadata: z.object({
          category: z.string().nullable(),
          urgency: z.enum(["high", "medium", "low"]).nullable()
        }).nullable(),
      }),
      prompt: INSIGHT_PROMPT + "\n\nข้อมูลการเงิน:\n" + financialSummary,
    });
    return object as InsightResult[];
  });
}

export function getMediaType(
  mimeType: string
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(mimeType)) {
    return mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  }
  return "image/jpeg";
}
