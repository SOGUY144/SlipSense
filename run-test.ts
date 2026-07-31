import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function runTest() {
  console.log("--- 🚀 FULL MICROSECOND PRECISION TEST ---");

  console.log("\n0. RESETTING ENVIRONMENT");
  const resetRes = await db.execute(sql`UPDATE transactions SET is_vat_registered = false`);
  console.log(`Reset ${resetRes.count} existing transactions to is_vat_registered = false`);

  console.log("\n1. RUNNING STEP 1 (Snapshot)");
  const snapRes = await db.execute(sql`SELECT CURRENT_TIMESTAMP::text AS snapshot_time`);
  const snapshotTimeStr = snapRes[0].snapshot_time as string;
  console.log(`Raw Postgres Snapshot: ${snapshotTimeStr}`);
  
  // Write to log simulating Step 1
  const logPath = path.join(process.cwd(), "migration-audit.log");
  const logContent = `[${new Date().toISOString()}] MIGRATION SNAPSHOT T1 = ${snapshotTimeStr}\n`;
  fs.appendFileSync(logPath, logContent, "utf8");

  console.log("\n2. SIMULATING RACE CONDITION (Injecting boundary transactions)");
  
  // We need to insert dummy transactions. Let's just insert something minimal.
  // We will insert 2 transactions.
  // One with exact same microsecond as snapshot.
  // One with +1 millisecond into the future.
  
  const shopRes = await db.execute(sql`SELECT id FROM shops LIMIT 1`);
  const shopId = shopRes[0]?.id;
  if (!shopId) throw new Error("No shop found");

  // A. Exactly at Snapshot time
  const insert1 = await db.execute(sql`
    INSERT INTO transactions (id, shop_id, amount, type, category, occurred_at, created_at, is_vat_registered)
    VALUES (gen_random_uuid(), ${shopId}, '100', 'income', 'test', CURRENT_TIMESTAMP, ${snapshotTimeStr}::timestamptz, false)
    RETURNING id
  `);
  console.log(`Inserted TX1 (Boundary Match) with created_at = ${snapshotTimeStr}`);

  // B. 1 millisecond AFTER Snapshot time
  // Postgres supports INTERVAL addition. Let's add 1 millisecond.
  const insert2 = await db.execute(sql`
    INSERT INTO transactions (id, shop_id, amount, type, category, occurred_at, created_at, is_vat_registered)
    VALUES (gen_random_uuid(), ${shopId}, '200', 'income', 'test', CURRENT_TIMESTAMP, ${snapshotTimeStr}::timestamptz + interval '1 millisecond', false)
    RETURNING id, created_at::text as created_time
  `);
  console.log(`Inserted TX2 (Future Leak Test) with created_at = ${insert2[0].created_time}`);
  
  const tx2Id = insert2[0].id;

  console.log("\n3. RUNNING STEP 3 (Update with raw string)");
  const updateRes = await db.execute(sql`
    UPDATE transactions 
    SET is_vat_registered = true 
    WHERE created_at <= ${snapshotTimeStr}::timestamptz
    AND (is_vat_registered = false OR is_vat_registered IS NULL)
  `);
  console.log(`Rows affected: ${updateRes.count} (Should be existing + TX1)`);

  console.log("\n4. RUNNING STEP 4 (Verify no future leaks)");
  const verifyRes = await db.execute(sql`
    SELECT id, created_at::text, is_vat_registered 
    FROM transactions 
    WHERE created_at > ${snapshotTimeStr}::timestamptz
    AND is_vat_registered = true
  `);
  
  if (verifyRes.length === 0) {
    console.log("✅ VERIFICATION PASSED: 0 rows found. No new transactions were affected.");
  } else {
    console.log(`❌ VERIFICATION FAILED: Found ${verifyRes.length} rows!`);
    console.log(verifyRes);
  }

  console.log("\n5. EXTRA VERIFICATION (Check TX2 Status)");
  const tx2Check = await db.execute(sql`SELECT is_vat_registered FROM transactions WHERE id = ${tx2Id}`);
  console.log(`TX2 is_vat_registered = ${tx2Check[0]?.is_vat_registered} (Should be false!)`);
  
  if (tx2Check[0]?.is_vat_registered === false) {
    console.log("✅ TX2 successfully excluded! Logic works perfectly.");
  } else {
    console.log("❌ TX2 was modified incorrectly.");
  }
  
  // Cleanup dummy rows to not pollute the dev DB for the user
  console.log("\nCleaning up dummy transactions...");
  await db.execute(sql`DELETE FROM transactions WHERE amount IN ('100.00', '200.00') AND category = 'test'`);

  process.exit(0);
}

runTest().catch(console.error);
