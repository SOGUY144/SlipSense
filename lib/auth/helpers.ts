import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { shopMembers, shops, profiles, categories } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { supabase, user };
}

export async function getUserShop(userId: string) {
  const membership = await db.query.shopMembers.findFirst({
    where: eq(shopMembers.userId, userId),
    with: { shop: true },
  });

  return membership?.shop ?? null;
}

export async function ensureUserOnboarded(
  userId: string,
  phone?: string | null,
  shopName?: string
) {
  const existingProfile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });

  if (!existingProfile) {
    await db.insert(profiles).values({
      id: userId,
      phone: phone ?? null,
      displayName: shopName ?? "ร้านของฉัน",
    });
  }

  const existingShop = await getUserShop(userId);
  if (existingShop) {
    return existingShop;
  }

  const [shop] = await db
    .insert(shops)
    .values({ name: shopName ?? "ร้านของฉัน" })
    .returning();

  await db.insert(shopMembers).values({
    shopId: shop.id,
    userId,
    role: "owner",
  });

  const defaultExpenses = [
    "ค่าอาหาร", "ค่าเดินทาง", "ค่าเช่า", "ค่าน้ำค่าไฟ", "ค่าเน็ต/โทรศัพท์", 
    "ช้อปปิ้ง", "ของใช้ส่วนตัว", "ความบันเทิง/สตรีมมิ่ง", "สังสรรค์", 
    "ค่ารักษาพยาบาล", "ให้ครอบครัว", "ผ่อนรถ/น้ำมัน", "จ่ายหนี้/บัตรเครดิต", 
    "กาแฟ/คาเฟ่", "เสื้อผ้า/เครื่องแต่งกาย", "สัตว์เลี้ยง", "ทำบุญ"
  ];
  const defaultIncomes = [
    "เงินเดือน", "โบนัส", "รายได้พิเศษ/ฟรีแลนซ์", "ขายของออนไลน์", 
    "ปันผล/ดอกเบี้ย", "เงินให้ฟรี/แต๊ะเอีย", "เงินคืน/Cashback", "รายได้อื่นๆ"
  ];

  await db.insert(categories).values([
    ...defaultIncomes.map(name => ({ shopId: shop.id, type: "income" as const, name })),
    ...defaultExpenses.map(name => ({ shopId: shop.id, type: "expense" as const, name }))
  ]);

  return shop;
}

export async function requireAuth() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    throw new Error("Unauthorized");
  }

  const shop = await ensureUserOnboarded(
    auth.user.id,
    auth.user.phone,
    auth.user.user_metadata?.shop_name as string | undefined
  );

  return { ...auth, shop };
}
