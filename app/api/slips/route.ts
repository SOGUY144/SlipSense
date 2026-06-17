import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { slipJobs } from "@/lib/db/schema";
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

    try {
      const base64 = buffer.toString("base64");
      const extracted = await extractSlipData(
        base64,
        getMediaType(file.type)
      );

      const [updatedJob] = await db
        .update(slipJobs)
        .set({
          status: "done",
          extractedData: extracted,
          confidence: extracted.overallConfidence,
        })
        .where(eq(slipJobs.id, job.id))
        .returning();

      const { data: signedUrl } = await supabase.storage
        .from("slips")
        .createSignedUrl(storagePath, 3600);

      return apiSuccess({
        job: updatedJob,
        extracted,
        imageUrl: signedUrl?.signedUrl,
      }, 201);
    } catch (aiError) {
      console.error("AI Error =>", aiError);
      const message =
        aiError instanceof Error ? aiError.message : "AI processing failed";

      await db
        .update(slipJobs)
        .set({ status: "failed", errorMessage: message })
        .where(eq(slipJobs.id, job.id));

      return apiError(message, 500);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to process slip", 500);
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
