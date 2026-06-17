import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { slipJobs } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, shop } = await requireAuth();
    const { id } = await params;

    const job = await db.query.slipJobs.findFirst({
      where: and(eq(slipJobs.id, id), eq(slipJobs.shopId, shop.id)),
    });

    if (!job) {
      return apiError("Job not found", 404);
    }

    const { data: signedUrl } = await supabase.storage
      .from("slips")
      .createSignedUrl(job.storagePath, 3600);

    return apiSuccess({
      job,
      imageUrl: signedUrl?.signedUrl,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to fetch job", 500);
  }
}
