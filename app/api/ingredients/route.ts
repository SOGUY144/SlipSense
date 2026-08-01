import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ingredients } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET() {
  try {
    const { shop } = await requireAuth();

    const result = await db.query.ingredients.findMany({
      where: eq(ingredients.shopId, shop.id),
      orderBy: [asc(ingredients.name)],
    });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("GET ingredients error:", error);
    return apiError("Failed to fetch ingredients", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { shop } = await requireAuth();
    const body = await req.json();

    const { id, name, unit, costPerUnit } = body;

    if (!name || !unit || costPerUnit === undefined || costPerUnit === null) {
      return apiError("Name, unit, and costPerUnit are required", 400);
    }

    let existing;
    if (id) {
      existing = await db.query.ingredients.findFirst({
        where: and(eq(ingredients.shopId, shop.id), eq(ingredients.id, id)),
      });
    } else {
      existing = await db.query.ingredients.findFirst({
        where: and(eq(ingredients.shopId, shop.id), eq(ingredients.name, name.trim())),
      });
    }

    if (existing) {
      const [updated] = await db
        .update(ingredients)
        .set({
          name: name.trim(),
          unit: unit.trim(),
          costPerUnit: String(costPerUnit),
        })
        .where(eq(ingredients.id, existing.id))
        .returning();
      return apiSuccess(updated);
    } else {
      const [created] = await db
        .insert(ingredients)
        .values({
          shopId: shop.id,
          name: name.trim(),
          unit: unit.trim(),
          costPerUnit: String(costPerUnit),
        })
        .returning();
      return apiSuccess(created, 201);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("POST ingredients error:", error);
    return apiError("Failed to save ingredient", 500);
  }
}
