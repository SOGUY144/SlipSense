import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateCategorySchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อหมวดหมู่"),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { shop } = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    
    const parsed = updateCategorySchema.parse(body);

    const existing = await db.query.categories.findFirst({
        where: and(eq(categories.id, id), eq(categories.shopId, shop.id))
    });

    if (!existing) {
        return apiError("Category not found", 404);
    }

    const [category] = await db.update(categories)
      .set({ name: parsed.name })
      .where(eq(categories.id, id))
      .returning();

    return apiSuccess(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.errors[0].message, 400);
    }
    return apiError("Failed to update category", 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { shop } = await requireAuth();
    const { id } = await params;

    const existing = await db.query.categories.findFirst({
        where: and(eq(categories.id, id), eq(categories.shopId, shop.id))
    });

    if (!existing) {
        return apiError("Category not found", 404);
    }

    // Soft delete
    await db.update(categories)
      .set({ isActive: false })
      .where(eq(categories.id, id));

    return apiSuccess({ success: true });
  } catch (error) {
    return apiError("Failed to delete category", 500);
  }
}
