import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { recipes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { shop } = await requireAuth();
    const { id } = await params;

    const existing = await db.query.recipes.findFirst({
      where: and(eq(recipes.id, id), eq(recipes.shopId, shop.id)),
    });

    if (!existing) {
      return apiError("Recipe not found", 404);
    }

    await db.delete(recipes).where(eq(recipes.id, id));

    return apiSuccess({ success: true, message: "Recipe deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("DELETE recipe error:", error);
    return apiError("Failed to delete recipe", 500);
  }
}
