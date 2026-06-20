import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createCategorySchema = z.object({
  type: z.enum(["income", "expense"]),
  name: z.string().min(1, "กรุณากรอกชื่อหมวดหมู่"),
});

export async function GET() {
  try {
    const { shop } = await requireAuth();

    const result = await db.query.categories.findMany({
      where: and(eq(categories.shopId, shop.id), eq(categories.isActive, true)),
      orderBy: (categories, { asc }) => [asc(categories.createdAt)],
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError("Failed to fetch categories", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { shop } = await requireAuth();
    const body = await req.json();
    
    const parsed = createCategorySchema.parse(body);

    const [category] = await db.insert(categories).values({
      shopId: shop.id,
      type: parsed.type,
      name: parsed.name,
    }).returning();

    return apiSuccess(category, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.errors[0].message, 400);
    }
    return apiError("Failed to create category", 500);
  }
}
