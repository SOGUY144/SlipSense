import { z } from "zod";

export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const fieldConfidenceSchema = z.object({
  amount: confidenceSchema.optional(),
  occurredAt: confidenceSchema.optional(),
  counterparty: confidenceSchema.optional(),
  note: confidenceSchema.optional(),
  type: confidenceSchema.optional(),
  category: confidenceSchema.optional(),
});

export const extractedSlipSchema = z.object({
  amount: z.number().positive(),
  occurredAt: z.string(),
  counterparty: z.string().optional(),
  note: z.string().optional(),
  type: z.enum(["income", "expense"]),
  category: z.string(),
  bank: z.string().optional(),
  overallConfidence: confidenceSchema,
  fieldConfidence: fieldConfidenceSchema.optional(),
});

export type ExtractedSlip = z.infer<typeof extractedSlipSchema>;

export const transactionSchema = z.object({
  slipJobId: z.string().uuid().optional(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1),
  amount: z.number().positive(),
  occurredAt: z.string(),
  counterparty: z.string().optional(),
  note: z.string().optional(),
  confidence: confidenceSchema.optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const EXPENSE_CATEGORIES = [
  "ค่าวัตถุดิบ",
  "ค่าเช่า",
  "ค่าจ้าง",
  "ค่าน้ำค่าไฟ",
  "ค่าขนส่ง",
  "ค่าใช้จ่ายอื่นๆ",
] as const;

export const INCOME_CATEGORIES = [
  "รายได้จากการขาย",
  "รายได้อื่นๆ",
] as const;

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export const onboardingSchema = z.object({
  shopName: z.string().min(1, "กรุณากรอกชื่อร้าน"),
  displayName: z.string().optional(),
});
