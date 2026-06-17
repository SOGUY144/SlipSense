import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { shop } = await requireAuth();

    const shopData = await db.query.shops.findFirst({
      where: eq(shops.id, shop.id),
    });

    return NextResponse.json({ preferences: shopData?.preferences || null });
  } catch (error: any) {
    console.error("GET /api/preferences error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { shop } = await requireAuth();
    const json = await req.json();

    await db
      .update(shops)
      .set({ preferences: json })
      .where(eq(shops.id, shop.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/preferences error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
