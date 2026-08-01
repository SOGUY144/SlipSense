import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { recipes, recipeItems, ingredients } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  try {
    const { shop } = await requireAuth();

    const list = await db.query.recipes.findMany({
      where: eq(recipes.shopId, shop.id),
      with: {
        items: true,
      },
      orderBy: [desc(recipes.createdAt)],
    });

    const formatted = list.map((recipe) => ({
      ...recipe,
      recipeItems: recipe.items,
    }));

    return apiSuccess(formatted);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("GET recipes error:", error);
    return apiError("Failed to fetch recipes", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { shop } = await requireAuth();
    const body = await req.json();

    const { name, sellingPrice, category, items } = body;

    if (!name || sellingPrice === undefined || !Array.isArray(items)) {
      return apiError("Name, sellingPrice, and items array are required", 400);
    }

    const priceNum = Number(sellingPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      return apiError("Invalid selling price", 400);
    }

    let totalCost = 0;
    const processedItems: Array<{
      ingredientId?: string | null;
      ingredientName: string;
      quantity: number;
      unit: string;
      cost: number;
    }> = [];

    for (const item of items) {
      const { ingredientId, ingredientName, quantity, unit, unitCost, cost } = item;
      const qtyNum = Number(quantity);
      const unitCostNum = Number(unitCost || 0);

      if (isNaN(qtyNum) || qtyNum <= 0) {
        return apiError("จำนวนวัตถุดิบต้องเป็นตัวเลขมากกว่า 0", 400);
      }

      const itemCost = cost !== undefined ? Number(cost) : qtyNum * unitCostNum;
      if (isNaN(itemCost) || itemCost < 0) {
        return apiError("ต้นทุนวัตถุดิบไม่ถูกต้อง", 400);
      }

      totalCost += itemCost;
      processedItems.push({
        ingredientId: ingredientId || null,
        ingredientName: ingredientName || "วัตถุดิบ",
        quantity: qtyNum,
        unit: unit || "หน่วย",
        cost: itemCost,
      });
    }

    const marginPercent = priceNum > 0 ? ((priceNum - totalCost) / priceNum) * 100 : 0;

    const result = await db.transaction(async (tx) => {
      const itemInserts = [];

      for (const pItem of processedItems) {
        let ingId = pItem.ingredientId;

        if (!ingId && pItem.ingredientName) {
          const existingIng = await tx.query.ingredients.findFirst({
            where: and(eq(ingredients.shopId, shop.id), eq(ingredients.name, pItem.ingredientName.trim())),
          });

          if (existingIng) {
            ingId = existingIng.id;
          } else {
            const unitCost = pItem.quantity > 0 ? pItem.cost / pItem.quantity : 0;
            const [newIng] = await tx
              .insert(ingredients)
              .values({
                shopId: shop.id,
                name: pItem.ingredientName.trim(),
                unit: pItem.unit,
                costPerUnit: String(unitCost),
              })
              .returning();
            ingId = newIng.id;
          }
        }

        itemInserts.push({
          ingredientId: ingId || null,
          ingredientName: pItem.ingredientName,
          quantity: String(pItem.quantity),
          unit: pItem.unit,
          cost: String(pItem.cost),
        });
      }

      const [newRecipe] = await tx
        .insert(recipes)
        .values({
          shopId: shop.id,
          name: name.trim(),
          category: category || "อาหาร/สินค้า",
          sellingPrice: String(priceNum),
          totalCost: String(totalCost),
          marginPercent: String(marginPercent),
        })
        .returning();

      const createdItems = await tx
        .insert(recipeItems)
        .values(
          itemInserts.map((itemData) => ({
            recipeId: newRecipe.id,
            ...itemData,
          }))
        )
        .returning();

      return {
        ...newRecipe,
        items: createdItems,
        recipeItems: createdItems,
      };
    });

    return apiSuccess(result, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("POST recipes error:", error);
    return apiError("Failed to create recipe", 500);
  }
}
