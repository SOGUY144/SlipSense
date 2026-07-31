import { db } from "@/lib/db";
import { slipJobs, transactions } from "@/lib/db/schema";
import { createClient } from "@supabase/supabase-js";
import { eq, lt, sql, notInArray } from "drizzle-orm";
import { NextResponse } from "next/server";

// This endpoint should be triggered by Vercel Cron
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1 day ago
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Find slipJobs that are older than 1 day
    const oldJobs = await db
      .select({ id: slipJobs.id, storagePath: slipJobs.storagePath })
      .from(slipJobs)
      .where(lt(slipJobs.createdAt, oneDayAgo));

    if (oldJobs.length === 0) {
      return NextResponse.json({ message: "No jobs to clean up" });
    }

    // Check which of these are actually used in transactions
    const oldJobIds = oldJobs.map((j) => j.id);
    const usedJobs = await db
      .select({ slipJobId: transactions.slipJobId })
      .from(transactions)
      .where(
        sql`${transactions.slipJobId} IN ${sql`(${sql.join(
          oldJobIds.map((id) => sql`${id}`),
          sql`, `
        )})`}`
      );

    const usedJobIds = new Set(usedJobs.map((j) => j.slipJobId));
    const orphanedJobs = oldJobs.filter((j) => !usedJobIds.has(j.id));

    if (orphanedJobs.length === 0) {
      return NextResponse.json({ message: "No orphaned jobs to clean up" });
    }

    let deletedCount = 0;
    
    // Batch delete from storage
    const storagePaths = orphanedJobs.map((j) => j.storagePath);
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("slips")
        .remove(storagePaths);
      if (storageError) {
        console.error("Storage deletion error:", storageError);
      }
    }

    // Batch delete from database
    const orphanedIds = orphanedJobs.map((j) => j.id);
    if (orphanedIds.length > 0) {
      await db
        .delete(slipJobs)
        .where(
          sql`${slipJobs.id} IN ${sql`(${sql.join(
            orphanedIds.map((id) => sql`${id}`),
            sql`, `
          )})`}`
        );
      deletedCount = orphanedIds.length;
    }

    return NextResponse.json({
      message: `Successfully cleaned up ${deletedCount} orphaned slip jobs`,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to clean up jobs" },
      { status: 500 }
    );
  }
}
