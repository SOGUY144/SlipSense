import { requireAuth } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { db } from "@/lib/db";
import { credits } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { shop } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as "debtor" | "creditor" | null;

    const conditions = [eq(credits.shopId, shop.id)];
    if (type === "debtor" || type === "creditor") {
      conditions.push(eq(credits.type, type));
    }

    const list = await db
      .select()
      .from(credits)
      .where(and(...conditions))
      .orderBy(desc(credits.createdAt));

    return apiSuccess(list);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("GET credits error:", error);
    return apiError("Failed to fetch credits", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { shop } = await requireAuth();
    const body = await req.json();

    const { type, contactName, contactPhone, amount, description, dueDate } = body;

    if (!type || !contactName || amount === undefined || amount === null || amount === "") {
      return apiError("Missing required fields", 400);
    }

    if (type !== "debtor" && type !== "creditor") {
      return apiError("Invalid credit type", 400);
    }

    const [created] = await db
      .insert(credits)
      .values({
        shopId: shop.id,
        type,
        contactName,
        contactPhone: contactPhone || null,
        amount: String(amount),
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "pending",
      })
      .returning();

    return apiSuccess(created, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("POST credits error:", error);
    return apiError("Failed to create credit record", 500);
  }
}
