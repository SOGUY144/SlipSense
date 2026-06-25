import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  extractedSlipSchema,
  type ExtractedSlip,
} from "@/lib/validations/schemas";

export function buildSlipExtractionPrompt(
  categories: {type: string, name: string}[],
  shopDetails?: { name: string, ownerName?: string }
): string {
  const incomeCats = categories.filter(c => c.type === 'income').map(c => `"${c.name}"`).join(', ');
  const expenseCats = categories.filter(c => c.type === 'expense').map(c => `"${c.name}"`).join(', ');

  const shopRule = shopDetails 
    ? `\n\nกฎเด็ดขาด (Override Rule) สำหรับแยกรายรับ/รายจ่ายของร้านนี้:\n   - ร้านนี้ชื่อ "${shopDetails.name}"${shopDetails.ownerName ? ` และเจ้าของร้านชื่อ "${shopDetails.ownerName}"` : ""}\n   - สำคัญมาก: ให้เช็คชื่อผู้โอน (Sender) และผู้รับ (Receiver) ก่อนเสมอ!\n   - ถ้าชื่อ "ผู้โอน (Sender)" มีคำที่ตรงกับชื่อร้านหรือชื่อเจ้าของ ให้บังคับว่าสลิปนี้เป็น "รายจ่าย" (expense) ทันที 100%\n   - ถ้าชื่อ "ผู้รับ (Receiver)" มีคำที่ตรงกับชื่อร้านหรือชื่อเจ้าของ ให้บังคับว่าสลิปนี้เป็น "รายรับ" (income) ทันที 100%`
    : "";

  return `คุณเป็น AI ผู้เชี่ยวชาญในการอ่านสลิปโอนเงินธนาคารไทย และใบเสร็จ/บิลซื้อของ (Receipt/Bill)

วิเคราะห์รูปภาพและส่งคืนข้อมูลตามโครงสร้างที่กำหนด
หมวดหมู่รายรับที่อนุญาตให้ใช้: ${incomeCats || "รายได้จากการขาย, รายได้อื่นๆ"}
หมวดหมู่รายจ่ายที่อนุญาตให้ใช้: ${expenseCats || "ค่าวัตถุดิบ, ค่าเช่า, ค่าใช้จ่ายอื่นๆ"}

กฎ:
1. การแยกแยะประเภท:${shopRule}
   - กรณีทั่วไป (ถ้าชื่อไม่ตรงกับกฎด้านบน):
     - ถ้าเป็น "สลิปโอนเงินเข้า" = income
     - ถ้าเป็น "สลิปโอนเงินออก" หรือ "ใบเสร็จ/บิลซื้อของ" = expense
2. กรณีเป็น สลิปโอนเงินเข้า/ออก (Bank Slip):
   - ดึง "ชื่อผู้โอน / จาก" (Sender) ไปใส่ในช่อง sender
   - ดึง "ชื่อผู้รับเงิน / ไปยัง" (Receiver) ไปใส่ในช่อง receiver
3. กรณีเป็น ใบเสร็จ/บิลซื้อของ (Receipt/Bill):
   - ดึง "ชื่อร้านค้า/ซัพพลายเออร์" ไปใส่ในช่อง receiver (เพราะเราเป็นคนจ่าย) และให้ sender ว่างไว้
   - ยอดรวมทั้งหมด (Total/Grand Total) ไปใส่ในช่อง amount
   - หมวดหมู่ (category): หากบิลมีสินค้าหลายหมวดปนกัน ให้ประเมินว่าสินค้าหมวดใดมีมูลค่ารวมสูงที่สุดในบิลนั้น แล้วจัดบิลเข้าหมวดหมู่นั้น หากก้ำกึ่งแยกยากให้จัดเข้า "ค่าใช้จ่ายอื่นๆ"
   - ให้ดึงรายการสินค้าหลักๆ 1-3 รายการแรก (พร้อมจำนวนและราคา) ไปสรุปไว้ในช่อง note อัตโนมัติ (เช่น "เนื้อหมู 500฿, ผักสด 200฿")
4. การอ่านวันที่ (สำคัญมาก):
   - วันที่และเวลา (occurredAt) ให้ดึงจากภาพโดยตรงและแปลงเป็นรูปแบบ YYYY-MM-DDThh:mm:ss เท่านั้น (ไม่ต้องเติม Z ต่อท้าย และห้ามแปลง Timezone เด็ดขาด)
   - แปลงเดือนภาษาไทยให้ถูกต้อง (ม.ค.=01, ... ธ.ค.=12)
   - ปี พ.ศ. ให้ลบด้วย 543 เพื่อเป็นปี ค.ศ.
   - ตัวอย่าง: "07 มิ.ย. 2569 - 19:04" ต้องส่งค่าเป็น "2026-06-07T19:04:00" เท่านั้น (ห้ามแปลง 19:04 เป็น 12:04 หรืออะไรทั้งสิ้น)
5. ถ้าอ่านส่วนใดไม่ชัด ให้ confidence ของฟิลด์นั้นต่ำและเดาอย่างสมเหตุสมผล`;
}

export interface FinancialFacts {
  income: number;
  expense: number;
  profit: number;
  profitChangePct: number;
  topCategory: string | null;
  topCategoryAmount: number;
  topCategoryChangePct: number | null;
  monthsOfData: number;
  preferencesText: string;
}

export function buildFactsBlock(f: FinancialFacts): string {
  return [
    `รายรับเดือนนี้: ${f.income.toLocaleString()} บาท`,
    `รายจ่ายเดือนนี้: ${f.expense.toLocaleString()} บาท`,
    `กำไรสุทธิ: ${f.profit.toLocaleString()} บาท`,
    `กำไรเปลี่ยนจากเดือนก่อน: ${f.profitChangePct > 0 ? "+" : ""}${f.profitChangePct.toFixed(1)}%`,
    f.topCategory
      ? `หมวดค่าใช้จ่ายสูงสุด: ${f.topCategory} (${f.topCategoryAmount.toLocaleString()} บาท${
          f.topCategoryChangePct !== null
            ? `, เปลี่ยน ${f.topCategoryChangePct > 0 ? "+" : ""}${f.topCategoryChangePct.toFixed(1)}% จากเดือนก่อน`
            : ""
        })`
      : "ยังไม่มีข้อมูลหมวดค่าใช้จ่าย",
    `จำนวนเดือนที่มีข้อมูล: ${f.monthsOfData} เดือน`,
    `\n${f.preferencesText}`
  ].join("\n");
}

const INSIGHT_PROMPT = `คุณคือ "SlipSense AI" ที่ปรึกษาการเงินสำหรับร้านค้า SME ไทย

กฎเหล็ก (ห้ามฝ่าฝืน):
1. ใช้ตัวเลขที่ให้มาเท่านั้น ห้ามสร้างหรือเดาตัวเลขที่ไม่มีในข้อมูล
2. ถ้ามีข้อมูลน้อยกว่า 2 เดือน ห้ามพูดถึง "เทรนด์" หรือ "เปลี่ยนแปลง" ให้พูดถึงสถานะปัจจุบันแทน
3. ตอบสั้น กระชับ ข้อละไม่เกิน 1-2 บรรทัด ห้ามเกริ่นนำ
4. ในชุดคำแนะนำ ต้องมีอย่างน้อย 1 ข้อเป็น "ความเสี่ยงที่ต้องระวัง" และ 1 ข้อเป็น "โอกาสที่ควรทำต่อ" ห้ามเป็นด้านลบทั้งหมดหรือบวกทั้งหมด
5. แอคชั่นต้องเจาะจงและทำได้จริงภายในเดือนนี้ ห้ามแนะนำกว้างๆ เช่น "ควรประหยัดมากขึ้น"
6. คำแนะนำต้องสอดคล้องกับ "โปรไฟล์พฤติกรรมผู้ใช้" (ถ้ามี)

ตัวอย่างคำตอบที่ดี (ใช้เป็นแนวทางสไตล์และความยาว):
{
  "content": "ค่าวัตถุดิบกินไป 38% ของรายจ่ายทั้งหมด สูงกว่าค่าเฉลี่ยร้านขนาดนี้ที่ 25-30% ลองเทียบราคา 2 ซัพพลายเออร์ใหม่ภายในสัปดาห์นี้",
  "metadata": { "category": "ค่าวัตถุดิบ", "urgency": "high" }
}

ตอบเป็นภาษาไทย ใช้ตัวเลขจากข้อมูลที่ให้มาเท่านั้น`;

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
  sender: z.string().nullable(),
  receiver: z.string().nullable(),
  note: z.string().nullable(),
  type: z.enum(["income", "expense"]),
  category: z.string(),
  bank: z.string().nullable(),
  overallConfidence: z.enum(["high", "medium", "low"]),
  fieldConfidence: z.object({
    amount: z.enum(["high", "medium", "low"]).nullable(),
    occurredAt: z.enum(["high", "medium", "low"]).nullable(),
    sender: z.enum(["high", "medium", "low"]).nullable(),
    receiver: z.enum(["high", "medium", "low"]).nullable(),
    note: z.enum(["high", "medium", "low"]).nullable(),
    type: z.enum(["high", "medium", "low"]).nullable(),
    category: z.enum(["high", "medium", "low"]).nullable(),
  }).nullable(),
});

export async function extractSlipData(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  categories: {type: string, name: string}[] = [],
  shopDetails?: { name: string, ownerName?: string }
): Promise<ExtractedSlip> {
  return callWithRetry(async () => {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: aiSlipSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildSlipExtractionPrompt(categories, shopDetails) },
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
      sender: object.sender || undefined,
      receiver: object.receiver || undefined,
      note: object.note || undefined,
      bank: object.bank || undefined,
      overallConfidence: object.overallConfidence,
      fieldConfidence: object.fieldConfidence ? {
        amount: object.fieldConfidence.amount || undefined,
        occurredAt: object.fieldConfidence.occurredAt || undefined,
        sender: object.fieldConfidence.sender || undefined,
        receiver: object.fieldConfidence.receiver || undefined,
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
  facts: FinancialFacts
): Promise<InsightResult[]> {
  return callWithRetry(async () => {
    const factsBlock = buildFactsBlock(facts);
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
      prompt: INSIGHT_PROMPT + "\n\nข้อมูลการเงินจริง:\n" + factsBlock,
      temperature: 0.4,
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
