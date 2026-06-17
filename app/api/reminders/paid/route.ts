import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { billReminders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const markPaidSchema = z.object({
  id: z.string().uuid(),
  paidMonth: z.string().nullable(), // YYYY-MM
});

export async function POST(req: Request) {
  try {
    const { shop } = await requireAuth();
    const json = await req.json();

    const { id, paidMonth } = markPaidSchema.parse(json);

    await db
      .update(billReminders)
      .set({ lastPaidMonth: paidMonth })
      .where(and(eq(billReminders.id, id), eq(billReminders.shopId, shop.id)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/reminders/paid error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
