import { inArray, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { slipJobs } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { supabase, shop } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return apiError("No IDs provided", 400);
    }

    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length === 0) {
      return apiError("No valid IDs provided", 400);
    }

    const jobs = await db.query.slipJobs.findMany({
      where: and(eq(slipJobs.shopId, shop.id), inArray(slipJobs.id, ids)),
    });

    // Get signed URLs for all jobs
    const results = await Promise.all(
      jobs.map(async (job) => {
        const { data } = await supabase.storage
          .from("slips")
          .createSignedUrl(job.storagePath, 3600);
        return {
          job,
          imageUrl: data?.signedUrl ?? "",
        };
      })
    );

    return apiSuccess(results);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to fetch jobs", 500);
  }
}
