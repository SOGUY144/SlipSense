import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { billReminders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const reminderSchema = z.object({
  title: z.string().min(1),
  amount: z.number().nullable().optional(),
  dueDay: z.number().min(1).max(31),
  category: z.string().min(1),
});

const saveRemindersSchema = z.object({
  reminders: z.array(reminderSchema),
});

export async function GET(req: Request) {
  try {
    const { shop } = await requireAuth();

    const reminders = await db.query.billReminders.findMany({
      where: eq(billReminders.shopId, shop.id),
      orderBy: (reminders, { asc }) => [asc(reminders.dueDay)],
    });

    return NextResponse.json(reminders);
  } catch (error: any) {
    console.error("GET /api/reminders error:", error);
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

    const { reminders } = saveRemindersSchema.parse(json);

    await db.delete(billReminders).where(eq(billReminders.shopId, shop.id));

    if (reminders.length > 0) {
      await db.insert(billReminders).values(
        reminders.map((r) => ({
          shopId: shop.id,
          title: r.title,
          amount: r.amount?.toString() || null,
          dueDay: r.dueDay,
          category: r.category,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/reminders error:", error);
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
