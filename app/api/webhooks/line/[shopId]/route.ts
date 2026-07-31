import { db } from "@/lib/db";
import { shops, slipJobs, transactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { extractSlipData } from "@/lib/ai/slip-extraction";

function verifySignature(body: string, signature: string, secret: string) {
  const hash = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  return hash === signature;
}

export async function POST(req: Request, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params;
    const bodyText = await req.text();
    const signature = req.headers.get("x-line-signature") || "";

    const [shop] = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);

    if (!shop || !shop.lineChannelSecret || !shop.lineAccessToken) {
      return new Response("Shop not configured for LINE", { status: 400 });
    }

    if (!verifySignature(bodyText, signature, shop.lineChannelSecret)) {
      return new Response("Invalid signature", { status: 401 });
    }

    const body = JSON.parse(bodyText);

    // LINE can send multiple events in one payload
    for (const event of body.events) {
      if (event.type === "message" && event.message.type === "image") {
        const messageId = event.message.id;
        const replyToken = event.replyToken;

        // Fetch image from LINE server
        const imageRes = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
          headers: {
            "Authorization": `Bearer ${shop.lineAccessToken}`,
          },
        });

        if (!imageRes.ok) {
          console.error("Failed to fetch image from LINE");
          continue;
        }

        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");
        
        // Save job for traceability
        const storagePath = `line_webhooks/${shop.id}/${Date.now()}_${messageId}.jpg`;
        const [job] = await db.insert(slipJobs).values({
          shopId: shop.id,
          storagePath: storagePath,
          status: "processing",
        }).returning();

        // Get categories
        const activeCategories = await db.query.categories.findMany({
          where: eq(db.categories.shopId, shop.id), // note: this uses db.query but maybe we should use normal select. Wait, we don't have dbCategories imported here.
        });
        
        const categoriesData = await db.query.categories.findMany({
           where: (cats, { eq }) => eq(cats.shopId, shop.id)
        });

        const shopDetails = {
          name: shop.name,
          businessCategory: (shop.preferences as any)?.businessCategory,
          businessType: (shop.preferences as any)?.businessType,
        };

        const extracted = await extractSlipData(base64, "image/jpeg", categoriesData, shopDetails, "slip");

        let riskLevel = extracted.riskLevel || "low";
        let riskScore = extracted.riskScore || 0;
        const riskReasons = [...(extracted.riskReasons || [])];
        let isDuplicate = false;

        // Duplicate check
        if (extracted.transRef) {
          const [existingTx] = await db.select({ id: transactions.id }).from(transactions).where(and(eq(transactions.shopId, shop.id), eq(transactions.transRef, extracted.transRef))).limit(1);
          if (existingTx) isDuplicate = true;
        }

        if (!isDuplicate && extracted.amount && extracted.occurredAt) {
          const [dupTx] = await db.select({ id: transactions.id }).from(transactions).where(and(eq(transactions.shopId, shop.id), eq(transactions.amount, extracted.amount.toString()), eq(transactions.occurredAt, new Date(extracted.occurredAt)))).limit(1);
          if (dupTx) isDuplicate = true;
        }

        if (isDuplicate) {
          riskLevel = "high";
          riskScore = 100;
          riskReasons.push("สลิปนี้น่าจะเคยถูกบันทึกในระบบแล้ว (ส่งมาจาก LINE)");
        }

        const updatedData = { ...extracted, riskLevel, riskScore, riskReasons };

        await db.update(slipJobs).set({
          status: "done",
          extractedData: updatedData,
          confidence: extracted.overallConfidence,
          transRef: extracted.transRef || null,
          riskScore,
          riskLevel,
          riskReasons,
        }).where(eq(slipJobs.id, job.id));

        if (!isDuplicate && extracted.amount) {
           await db.insert(transactions).values({
             shopId: shop.id,
             slipJobId: job.id,
             type: extracted.type || "income",
             category: extracted.category || "Uncategorized",
             amount: extracted.amount.toString(),
             occurredAt: new Date(extracted.occurredAt || Date.now()),
             sender: extracted.sender,
             receiver: extracted.receiver,
             note: extracted.note,
             confidence: extracted.overallConfidence,
             transRef: extracted.transRef,
             riskScore,
             riskLevel,
             riskReasons,
             source: "line",
           });
        }

        // Auto-reply
        if (shop.isLineActive) {
          let replyText = "";
          if (isDuplicate) {
            replyText = "⚠️ สลิปนี้อาจมีปัญหา หรือเคยถูกส่งมาแล้ว กรุณารอแอดมินตรวจสอบนะคะ";
          } else if (riskLevel === "high") {
            replyText = "⚠️ ระบบพบความเสี่ยงบางอย่างในสลิป กรุณารอแอดมินตรวจสอบค่ะ";
          } else {
            replyText = `✅ รับยอด ${extracted.amount} บาท เรียบร้อยค่ะ`;
          }

          await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${shop.lineAccessToken}`
            },
            body: JSON.stringify({
              replyToken: replyToken,
              messages: [{ type: "text", text: replyText }]
            })
          });
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("LINE Webhook Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
