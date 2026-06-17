import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  extractedSlipSchema,
  type ExtractedSlip,
} from "@/lib/validations/schemas";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenerativeAI(apiKey);
}

const SLIP_EXTRACTION_PROMPT = `คุณเป็น AI ผู้เชี่ยวชาญในการอ่านสลิปโอนเงินธนาคารไทย (PromptPay, KBank, SCB, Krungthai, BBL, TTB, ฯลฯ)

วิเคราะห์รูปสลิปและส่งคืน JSON เท่านั้น ไม่มีข้อความอื่น:

{
  "amount": <จำนวนเงินเป็นตัวเลข ไม่มี comma>,
  "occurredAt": "<ISO 8601 datetime เช่น 2026-06-16T14:30:00+07:00>",
  "counterparty": "<ชื่อผู้โอนหรือผู้รับ>",
  "note": "<หมายเหตุ/รายละเอียด ถ้ามี>",
  "type": "income" หรือ "expense",
  "category": "<หมวดหมู่>",
  "bank": "<ชื่อธนาคาร>",
  "overallConfidence": "high" | "medium" | "low",
  "fieldConfidence": {
    "amount": "high" | "medium" | "low",
    "occurredAt": "high" | "medium" | "low",
    "counterparty": "high" | "medium" | "low",
    "note": "high" | "medium" | "low",
    "type": "high" | "medium" | "low",
    "category": "high" | "medium" | "low"
  }
}

หมวดหมู่รายรับ: "รายได้จากการขาย", "รายได้อื่นๆ"
หมวดหมู่รายจ่าย: "ค่าวัตถุดิบ", "ค่าเช่า", "ค่าจ้าง", "ค่าน้ำค่าไฟ", "ค่าขนส่ง", "ค่าใช้จ่ายอื่นๆ"

กฎ:
- ถ้าเงินเข้าบัญชีร้าน = income, เงินออกจากบัญชี = expense
- ถ้าอ่านไม่ชัด ให้ confidence ต่ำและเดาอย่างสมเหตุสมผล
- ส่ง JSON อย่างเดียว ไม่มี markdown`;

const INSIGHT_PROMPT = `คุณเป็นที่ปรึกษาการเงินสำหรับเจ้าของร้าน SME ไทย
วิเคราะห์ข้อมูลการเงินต่อไปนี้และให้คำแนะนำ 2-3 ข้อที่เป็นตัวเลขจริง ไม่ใช่คำแนะนำทั่วไป
ตอบเป็นภาษาไทย ในรูปแบบ JSON array:

[
  {
    "content": "<คำแนะนำที่มีตัวเลข>",
    "metadata": { "category": "<หมวด>", "savingsAmount": <ตัวเลข> }
  }
]

ส่ง JSON array อย่างเดียว ไม่มี markdown`;

function parseJsonFromResponse(text: string): unknown {
  const cleaned = text
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned);
}

async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = 1
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 2000));
      return callWithRetry(fn, retries - 1);
    }
    throw error;
  }
}

export async function extractSlipData(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ExtractedSlip> {
  return callWithRetry(async () => {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent([
      SLIP_EXTRACTION_PROMPT,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mediaType,
        },
      },
    ]);

    const responseText = result.response.text();
    if (!responseText) {
      throw new Error("No text response from AI");
    }

    const parsed = parseJsonFromResponse(responseText);
    return extractedSlipSchema.parse(parsed);
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
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent([
      INSIGHT_PROMPT + "\n\nข้อมูลการเงิน:\n" + financialSummary
    ]);

    const responseText = result.response.text();
    if (!responseText) {
      throw new Error("No text response from AI");
    }

    const parsed = parseJsonFromResponse(responseText);
    if (!Array.isArray(parsed)) {
      throw new Error("Expected array of insights");
    }

    return parsed as InsightResult[];
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
