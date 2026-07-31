import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  extractedSlipSchema,
  type ExtractedSlip,
} from "@/lib/validations/schemas";

export function buildSlipExtractionPrompt(
  categories: {type: string, name: string}[],
  shopDetails?: { name: string, ownerName?: string, businessCategory?: string, businessType?: string, description?: string },
  uploadType: "slip" | "bill" = "slip"
): string {
  const incomeCats = categories.filter(c => c.type === 'income').map(c => `"${c.name}"`).join(', ');
  const expenseCats = categories.filter(c => c.type === 'expense').map(c => `"${c.name}"`).join(', ');

  let shopRule = "";
  if (shopDetails) {
    shopRule = `\n\nข้อมูลบริบทของธุรกิจและกฎพิเศษ (สำคัญมาก):\n   - ร้านนี้ชื่อ "${shopDetails.name}"${shopDetails.ownerName ? ` และเจ้าของร้านชื่อ "${shopDetails.ownerName}"` : ""}`;
    if (shopDetails.businessCategory || shopDetails.businessType) {
      shopRule += `\n   - ประเภทธุรกิจ: "${[shopDetails.businessCategory, shopDetails.businessType].filter(Boolean).join(" - ")}" (ใช้ข้อมูลนี้เป็นบริบทหลักในการตีความว่ารายจ่ายไหนเกี่ยวข้องกับธุรกิจ)`;
    }
    if (shopDetails.description) {
      shopRule += `\n   - กฎเฉพาะของร้านนี้: "${shopDetails.description}" (ต้องปฏิบัติตามกฎนี้อย่างเคร่งครัด)`;
    }
    if (uploadType === "slip") {
      shopRule += `\n   - กฎสแกนชื่อ: ให้เช็คชื่อผู้โอน (Sender) และผู้รับ (Receiver) ก่อนเสมอ!
   - ถ้าชื่อ "ผู้โอน (Sender)" มีคำที่ตรงกับชื่อร้านหรือชื่อเจ้าของ ให้บังคับว่าสลิปนี้เป็น "รายจ่าย" (expense) ทันที 100%
   - ถ้าชื่อ "ผู้รับ (Receiver)" มีคำที่ตรงกับชื่อร้านหรือชื่อเจ้าของ ให้บังคับว่าสลิปนี้เป็น "รายรับ" (income) ทันที 100%`;
    }
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentYearBuddhist = currentYear + 543;

  if (uploadType === "bill") {
    return `คุณเป็น AI ผู้เชี่ยวชาญในการอ่านใบเสร็จ/บิลซื้อของ (Receipt/Bill)

วิเคราะห์รูปภาพและส่งคืนข้อมูลตามโครงสร้างที่กำหนด
หมวดหมู่รายรับที่อนุญาตให้ใช้: ${incomeCats || "รายได้จากการขาย, รายได้อื่นๆ"}
หมวดหมู่รายจ่ายที่อนุญาตให้ใช้: ${expenseCats || "ค่าวัตถุดิบ, ค่าเช่า, ค่าใช้จ่ายอื่นๆ"}

กฎสำหรับการอ่านบิล (Receipt/Bill):
1. การแยกแยะประเภท:${shopRule}
   - บิลซื้อของส่วนใหญ่ถือเป็น "รายจ่าย" (expense) ยกเว้นเป็นใบเสร็จรับเงินที่ร้านเราออกให้ลูกค้า (income)
2. ข้อมูลร้านค้าและบิล:
   - ดึง "ชื่อร้านค้า/ซัพพลายเออร์ที่ออกบิล" ไปใส่ในช่อง receiver (เพราะเราเป็นคนจ่าย) และให้ sender ว่างไว้
   - ยอดรวมทั้งหมด (Total/Grand Total) ไปใส่ในช่อง amount
   - ถ้ามีระบุ โต๊ะ (Table) ให้ใส่ใน metadata.tableNumber
   - ถ้ามีระบุ รหัสบิล (Tran ID / Receipt ID / Bill No) ให้ใส่ใน metadata.receiptNumber
3. การดึงรายการสินค้า (Line Items):
   - แยกรายการสินค้าแต่ละชิ้น (name), จำนวน (quantity), และราคารวมต่อรายการ (price) ไปใส่ใน metadata.lineItems อย่างละเอียดทุกรายการ
   - ถ้าระบุส่วนลด (Discount) ให้ใส่ใน metadata.discount
   - ถ้าระบุภาษี (Tax/VAT) ให้ใส่ใน metadata.tax และยอดก่อนภาษีใส่ใน metadata.subTotal
4. หมวดหมู่ (category):
   - ประเมินจากรายการสินค้าหลักในบิลว่าเข้าข่ายหมวดหมู่ไหน หากก้ำกึ่งให้ใช้ "ค่าใช้จ่ายอื่นๆ"
5. การอ่านวันที่:
   - วันนี้คือวันที่ ${now.toISOString().split('T')[0]} ปีปัจจุบันคือ ค.ศ. ${currentYear} (พ.ศ. ${currentYearBuddhist})
   - แปลงวันที่และเวลาไปเป็น YYYY-MM-DDThh:mm:ss
6. ถ้าอ่านส่วนใดไม่ชัด ให้ confidence ของฟิลด์นั้นต่ำ`;
  }

  return `คุณเป็น AI ผู้เชี่ยวชาญในการอ่านสลิปโอนเงินธนาคารไทย และใบเสร็จ/บิลซื้อของ (Receipt/Bill)

วิเคราะห์รูปภาพและส่งคืนข้อมูลตามโครงสร้างที่กำหนด
หมวดหมู่รายรับที่อนุญาตให้ใช้: ${incomeCats || "รายได้จากการขาย, รายได้อื่นๆ"}
หมวดหมู่รายจ่ายที่อนุญาตให้ใช้: ${expenseCats || "ค่าวัตถุดิบ, ค่าเช่า, ค่าใช้จ่ายอื่นๆ"}

กฎ:
1. การแยกแยะประเภท:${shopRule}
   - กรณีทั่วไป:
     - ถ้าเป็น "สลิปโอนเงินเข้า" = income
     - ถ้าเป็น "สลิปโอนเงินออก" = expense
2. กรณีสลิปโอนเงิน:
   - ดึง "ชื่อผู้โอน / จาก" (Sender) ไปใส่ในช่อง sender
   - ดึง "ชื่อผู้รับเงิน / ไปยัง" (Receiver) ไปใส่ในช่อง receiver
   - ดึง "เลขรหัสอ้างอิงธุรกรรม / เลขที่รายการ / Transaction Ref / Ref No." บนสลิป ไปใส่ในช่อง transRef (หากมี)
3. การตรวจความสมบูรณ์และร่องรอยการแก้ไขภาพ (Risk Assessment):
   - ประเมินว่าสลิปนี้ดูเป็นสลิปจริงหรือน่าสงสัย (เช่น ฟอนต์ไม่สม่ำเสมอ, แนวบรรทัดเบี้ยวผิดปกติ, ร่องรอยตัดต่อตัวเลข)
   - หากปกติ ให้ riskLevel = "low", riskScore = 0, riskReasons = []
   - หากน่าสงสัย ให้ riskLevel = "medium" หรือ "high", riskScore = 50-100, และระบุเหตุผลใน riskReasons
4. กรณีใบเสร็จ:
   - ดึงชื่อร้านค้าไปใส่ใน receiver, ยอดรวมใน amount
5. การอ่านวันที่ (สำคัญมาก):
   - วันนี้คือวันที่ ${now.toISOString().split('T')[0]} ปีปัจจุบันคือ ค.ศ. ${currentYear} (พ.ศ. ${currentYearBuddhist}) หากสลิปไม่ระบุปี ให้ตีความว่าเป็นปีปัจจุบันเสมอ
   - วันที่และเวลา (occurredAt) ให้ดึงจากภาพโดยตรงและแปลงเป็นรูปแบบ YYYY-MM-DDThh:mm:ss เท่านั้น (ไม่ต้องเติม Z ต่อท้าย และห้ามแปลง Timezone เด็ดขาด)
   - แปลงเดือนภาษาไทยให้ถูกต้อง (ม.ค.=01, ... ธ.ค.=12)
   - ปี พ.ศ. ให้ลบด้วย 543 เพื่อเป็นปี ค.ศ. (เช่น 2569 ต้องแปลงเป็น ${currentYear})
   - ระวังรูปแบบปี 2 หลัก! สลิปมักเขียนแค่ "69" ซึ่งหมายถึง พ.ศ. 2569 (ค.ศ. ${currentYear}) ห้ามแปลงเป็น 1969 หรือ 2069 เด็ดขาด
   - ตัวอย่าง: "07 มิ.ย. 69 19:04" -> "${currentYear}-06-07T19:04:00"
   - ตัวอย่าง: "26/06/69" -> "${currentYear}-06-26T00:00:00"
6. ถ้าอ่านส่วนใดไม่ชัด ให้ confidence ของฟิลด์นั้นต่ำและเดาอย่างสมเหตุสมผล`;
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

const INSIGHT_PROMPT = `คุณคือ "SlipSense AI" นักวิเคราะห์การเงินระดับอาวุโส (Senior Financial Analyst) ที่เชี่ยวชาญการให้คำปรึกษาธุรกิจและบุคคลทั่วไป

คุณต้องวิเคราะห์ข้อมูลการเงินและส่งผลลัพธ์กลับมาเป็น Array ที่มีข้อมูล **3 ข้อถ้วน** ตามโครงสร้างนี้:

ข้อ 1: ภาพรวมสถานะการเงิน (metadata.type = "summary")
- สรุปตัวเลขทางการเงินแบบเจาะลึก (กำไรสุทธิ, การเปลี่ยนแปลง)
- ประเมินสุขภาพการเงิน (Financial Health) อิงตามข้อมูลที่มี
- ภาษา: มืออาชีพ ตรงไปตรงมา กระชับ

ข้อ 2: ความเสี่ยงและจุดรั่วไหล (metadata.type = "risk")
- ระบุหมวดหมู่ที่ใช้เงินเกินความจำเป็น พร้อมอ้างอิงสัดส่วนเมื่อเทียบกับรายได้
- วิเคราะห์ความเสี่ยงที่อาจทำให้สภาพคล่องมีปัญหา
- ภาษา: ชี้เป้าอย่างแม่นยำ อ้างอิงตัวเลขจริง ไม่ใช้อารมณ์

ข้อ 3: แผนปฏิบัติการ (metadata.type = "action")
- เสนอ Action Plan ที่ระบุตัวเลขชัดเจน เช่น "ลดงบหมวด X ลง Y บาท"
- นำเป้าหมายรายวัน (Daily Budget) มาเป็นเกณฑ์อ้างอิงในการแนะนำ
- ภาษา: เด็ดขาด เป็นข้อปฏิบัติที่ทำตามได้ทันที

กฎเหล็ก:
1. ห้ามเดาตัวเลขที่ไม่มีในข้อมูลจริงเด็ดขาด
2. ใช้โทนภาษาแบบผู้เชี่ยวชาญทางการเงิน (Professional & Analytical) ลดการใช้อีโมจิฟุ่มเฟือย
3. ถ้าข้อมูลมีน้อย ให้เน้นเตือนเรื่องการเก็บข้อมูลและวิเคราะห์แนวโน้มเบื้องต้น`;

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
  metadata: z.object({
    tableNumber: z.string().nullable(),
    receiptNumber: z.string().nullable(),
    lineItems: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number()
    })).nullable(),
    subTotal: z.number().nullable(),
    tax: z.number().nullable(),
    discount: z.number().nullable()
  }).nullable(),
  transRef: z.string().nullable(),
  riskScore: z.number().nullable(),
  riskLevel: z.enum(["low", "medium", "high"]).nullable(),
  riskReasons: z.array(z.string()).nullable()
});

/**
 * Extract structured transaction data from a slip or bill image using Google's Gemini AI.
 * 
 * @param base64Image - Base64 encoded image string
 * @param mediaType - MIME type of the image (e.g. image/jpeg)
 * @param activeCategories - List of user-defined categories to match against
 * @param shopDetails - Context about the shop (name, business type) to help AI categorize accurately
 * @param documentType - Type of document being processed ('slip' or 'bill')
 * @returns Parsed and validated transaction data including risk assessment
 */
export async function extractSlipData(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  activeCategories: { type: string; name: string }[],
  shopDetails: { name: string; ownerName?: string; businessCategory?: string; businessType?: string; description?: string },
  documentType: "slip" | "bill" = "slip"
): Promise<ExtractedSlip> {
  return callWithRetry(async () => {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: aiSlipSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildSlipExtractionPrompt(activeCategories, shopDetails, documentType) },
            { type: "image", image: `data:${mediaType};base64,${base64Image}` }
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
      metadata: object.metadata ? {
        tableNumber: object.metadata.tableNumber || undefined,
        receiptNumber: object.metadata.receiptNumber || undefined,
        lineItems: object.metadata.lineItems || undefined,
        subTotal: object.metadata.subTotal || undefined,
        tax: object.metadata.tax || undefined,
        discount: object.metadata.discount || undefined
      } : undefined,
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
      transRef: object.transRef || undefined,
      riskScore: object.riskScore ?? 0,
      riskLevel: object.riskLevel || "low",
      riskReasons: object.riskReasons || []
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
          type: z.enum(["summary", "risk", "action"]),
        }),
      }),
      prompt: INSIGHT_PROMPT + "\n\nข้อมูลการเงินจริง:\n" + factsBlock,
      temperature: 0.7,
    });
    return object as InsightResult[];
  });
}

/**
 * Helper to determine MIME type from common image file extensions or content types.
 * Maps standard image types to the subset supported by Gemini API.
 */
export function getMediaType(
  mimeType: string
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(mimeType)) {
    return mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  }
  return "image/jpeg";
}
