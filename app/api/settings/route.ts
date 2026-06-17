import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  shops,
  transactions,
  slipJobs,
  insights,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { onboardingSchema } from "@/lib/validations/schemas";

export async function GET() {
  try {
    const { shop } = await requireAuth();
    return apiSuccess({ shop });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to fetch settings", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const { shop } = await requireAuth();
    const body = await request.json();
    const parsed = onboardingSchema.parse(body);

    const [updated] = await db
      .update(shops)
      .set({ name: parsed.shopName })
      .where(eq(shops.id, shop.id))
      .returning();

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to update settings", 500);
  }
}

export async function DELETE() {
  try {
    const { shop } = await requireAuth();

    await db.delete(transactions).where(eq(transactions.shopId, shop.id));
    await db.delete(slipJobs).where(eq(slipJobs.shopId, shop.id));
    await db.delete(insights).where(eq(insights.shopId, shop.id));

    return apiSuccess({ cleared: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to clear data", 500);
  }
}
