import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { slipJobs, categories as dbCategories } from "@/lib/db/schema";
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

    if (!file) {
      return apiError("No file provided");
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return apiError("Invalid file type. Use JPEG, PNG, or WebP.");
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const storagePath = `${user.id}/${shop.id}/${Date.now()}.${ext}`;

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
      ownerName: user.displayName || undefined,
      businessCategory: (shop.preferences as any)?.businessCategory || undefined,
      businessType: (shop.preferences as any)?.businessType || undefined,
      description: (shop.preferences as any)?.description || undefined,
    }).catch(console.error);

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
  shopDetails: { name: string, ownerName?: string, businessCategory?: string, businessType?: string, description?: string }
) {
  try {
    const extracted = await extractSlipData(base64, mediaType, categories, shopDetails);

    await db
      .update(slipJobs)
      .set({
        status: "done",
        extractedData: extracted,
        confidence: extracted.overallConfidence,
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
