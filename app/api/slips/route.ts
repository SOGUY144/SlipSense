import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { slipJobs, transactions, categories as dbCategories } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  extractSlipData,
  getMediaType,
} from "@/lib/ai/slip-extraction";

export async function POST(request: Request) {
  try {
    const { supabase, user, shop } = await requireAuth();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const uploadType = formData.get("uploadType") as "slip" | "bill" | null || "slip";

    if (!file) {
      return apiError("No file uploaded", 400);
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return apiError("Invalid file type. Use JPEG, PNG, or WebP.");
    }

    // Map MIME type to safe extension
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };
    const ext = mimeMap[file.type] || 'jpg';
    
    // Secure filename generation
    const storagePath = `${user.id}/${shop.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("slips")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return apiError(`Upload failed: ${uploadError.message}`, 500);
    }

    const [job] = await db
      .insert(slipJobs)
      .values({
        shopId: shop.id,
        storagePath,
        status: "processing",
      })
      .returning();


    const base64 = buffer.toString("base64");
    const mediaType = getMediaType(file.type);
    const activeCategories = await db.query.categories.findMany({
      where: eq(dbCategories.shopId, shop.id),
    });

    // Process in background
    processSlipInBackground(job.id, base64, mediaType, activeCategories, {
      name: shop.name,
      ownerName: (user as any).displayName || (user as any).name || undefined,
      businessCategory: (shop.preferences as any)?.businessCategory || undefined,
      businessType: (shop.preferences as any)?.businessType || undefined,
      description: (shop.preferences as any)?.description || undefined,
    }, uploadType).catch(console.error);

    return apiSuccess({
      job,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to process slip", 500);
  }
}

async function processSlipInBackground(
  jobId: string, 
  base64: string, 
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  categories: {type: string, name: string}[],
  shopDetails: { name: string, ownerName?: string, businessCategory?: string, businessType?: string, description?: string },
  uploadType: "slip" | "bill" = "slip"
) {
  try {
    const extracted = await extractSlipData(base64, mediaType, categories, shopDetails, uploadType);

    let riskLevel = extracted.riskLevel || "low";
    let riskScore = extracted.riskScore || 0;
    const riskReasons = [...(extracted.riskReasons || [])];

    const [job] = await db
      .select({ shopId: slipJobs.shopId })
      .from(slipJobs)
      .where(eq(slipJobs.id, jobId))
      .limit(1);

    if (extracted.transRef && job) {
      const [existingTx] = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.shopId, job.shopId),
            eq(transactions.transRef, extracted.transRef)
          )
        )
        .limit(1);

      if (existingTx) {
        riskLevel = "high";
        riskScore = 100;
        if (!riskReasons.includes("สลิปนี้เคยถูกบันทึกในระบบแล้ว")) {
          riskReasons.push("สลิปนี้เคยถูกบันทึกในระบบแล้ว");
        }
      }
    }

    const updatedExtractedData = {
      ...extracted,
      riskLevel,
      riskScore,
      riskReasons,
    };

    await db
      .update(slipJobs)
      .set({
        status: "done",
        extractedData: updatedExtractedData,
        confidence: extracted.overallConfidence,
        transRef: extracted.transRef || null,
        riskScore: riskScore,
        riskLevel: riskLevel,
        riskReasons: riskReasons,
      })
      .where(eq(slipJobs.id, jobId));
      
  } catch (aiError) {
    console.error("AI Background Error =>", aiError);
    let message = aiError instanceof Error ? aiError.message : "AI processing failed";
    
    if (message.includes("503") || message.includes("429") || message.includes("Service Unavailable")) {
      message = "ระบบ AI หนาแน่นชั่วคราว กรุณากดลองใหม่อีกครั้ง";
    }

    await db
      .update(slipJobs)
      .set({ status: "failed", errorMessage: message })
      .where(eq(slipJobs.id, jobId));
  }
}

export async function GET() {
  try {
    const { shop } = await requireAuth();

    const jobs = await db
      .select()
      .from(slipJobs)
      .where(eq(slipJobs.shopId, shop.id))
      .orderBy(desc(slipJobs.createdAt));

    return apiSuccess(jobs);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to fetch slip jobs", 500);
  }
}
