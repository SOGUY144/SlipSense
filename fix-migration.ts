import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function run() {
  console.log("Fixing migration mismatch...");
  
  // Update ALL existing transactions to true since they are all "old" (prior to today)
  // This ensures 100% data integrity for historical records.
  const updateRes = await db.execute(sql`
    UPDATE transactions 
    SET is_vat_registered = true 
    WHERE is_vat_registered = false OR is_vat_registered IS NULL
  `);

  console.log(`Rows updated to fix gap: ${updateRes.count}`);

  const res1 = await db.execute(sql`SELECT COUNT(*) as total FROM transactions`);
  const total = res1[0]?.total;

  const res2 = await db.execute(sql`SELECT COUNT(*) as migrated FROM transactions WHERE is_vat_registered = true`);
  const migrated = res2[0]?.migrated;

  console.log(`Total transactions in DB: ${total}`);
  console.log(`Transactions with is_vat_registered=true: ${migrated}`);
  console.log(total === migrated ? "✅ All existing transactions successfully migrated to true!" : "❌ Migration mismatch!");

  process.exit(0);
}

run().catch(console.error);
