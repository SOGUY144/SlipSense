import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function run() {
  console.log("--- 🕵️ ID-BASED CLEANUP VERIFICATION ---");

  // 1. Get a shop ID
  const shopRes = await db.execute(sql`SELECT id FROM shops LIMIT 1`);
  const shopId = shopRes[0]?.id;

  // 2. Insert dummy rows and CAPTURE THEIR IDs
  console.log("\n1. Inserting dummy rows (TX1, TX2)...");
  const insertRes = await db.execute(sql`
    INSERT INTO transactions (id, shop_id, amount, type, category, occurred_at, created_at, is_vat_registered)
    VALUES 
      (gen_random_uuid(), ${shopId}, '100', 'income', 'test-id-verify', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
      (gen_random_uuid(), ${shopId}, '200', 'income', 'test-id-verify', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false)
    RETURNING id
  `);
  
  const tx1Id = insertRes[0].id;
  const tx2Id = insertRes[1].id;
  console.log(`✅ Captured TX1_id: ${tx1Id}`);
  console.log(`✅ Captured TX2_id: ${tx2Id}`);

  // 3. Delete them BY ID
  console.log("\n2. Hard Deleting them by ID...");
  const deleteRes = await db.execute(sql`
    DELETE FROM transactions 
    WHERE id IN (${tx1Id}, ${tx2Id})
  `);
  console.log(`Rows deleted: ${deleteRes.count}`);

  // 4. Verify by ID (The exact query requested by user)
  console.log("\n3. Running strict ID-based verification query...");
  const verifyRes = await db.execute(sql`
    SELECT id, amount, category 
    FROM transactions 
    WHERE id IN (${tx1Id}, ${tx2Id})
  `);

  console.log(`Found rows: ${verifyRes.length}`);
  if (verifyRes.length === 0) {
    console.log("✅ PERFECT: 0 rows found. The dummy records are definitively gone.");
  } else {
    console.log("❌ ERROR: Rows still exist!");
    console.log(verifyRes);
  }

  process.exit(0);
}

run().catch(console.error);
