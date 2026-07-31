import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { shop } = await requireAuth();

    const [shopData] = await db
      .select({
        lineChannelSecret: shops.lineChannelSecret,
        lineAccessToken: shops.lineAccessToken,
        isLineActive: shops.isLineActive,
      })
      .from(shops)
      .where(eq(shops.id, shop.id))
      .limit(1);

    if (!shopData) {
      return apiError("Shop not found", 404);
    }

    // Only return whether they are set, not the actual secret
    return apiSuccess({
      hasChannelSecret: !!shopData.lineChannelSecret,
      hasAccessToken: !!shopData.lineAccessToken,
      isLineActive: shopData.isLineActive,
      shopId: shop.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to fetch LINE settings", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { shop } = await requireAuth();
    const data = await request.json();

    const updateData: any = {};
    if (data.lineChannelSecret !== undefined) {
      updateData.lineChannelSecret = data.lineChannelSecret || null;
    }
    if (data.lineAccessToken !== undefined) {
      updateData.lineAccessToken = data.lineAccessToken || null;
    }
    if (data.isLineActive !== undefined) {
      updateData.isLineActive = !!data.isLineActive;
    }

    if (Object.keys(updateData).length === 0) {
      return apiError("No data to update", 400);
    }

    await db.update(shops).set(updateData).where(eq(shops.id, shop.id));

    return apiSuccess({ message: "Settings updated" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Failed to update LINE settings", 500);
  }
}
