import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function clean() {
  console.log("Cleaning up Test Data...");
  
  // 1. Delete test transactions (just in case they weren't deleted)
  const delRes = await db.execute(sql`
    DELETE FROM transactions 
    WHERE amount IN ('100.00', '200.00') AND category = 'test'
  `);
  console.log(`Deleted ${delRes.count} test rows (TX1, TX2)`);

  // 2. Ensure all existing old transactions are correctly set to 'true' 
  // as they were supposed to be migrated.
  const updateRes = await db.execute(sql`
    UPDATE transactions 
    SET is_vat_registered = true 
  `);
  console.log(`Restored ${updateRes.count} existing rows to is_vat_registered = true`);

  const totalRes = await db.execute(sql`SELECT count(*) FROM transactions`);
  const trueRes = await db.execute(sql`SELECT count(*) FROM transactions WHERE is_vat_registered = true`);
  
  console.log(`\nFinal State:`);
  console.log(`Total rows: ${totalRes[0].count}`);
  console.log(`True rows: ${trueRes[0].count}`);
  
  if (totalRes[0].count === trueRes[0].count) {
    console.log("✅ Dev Database is fully cleaned and restored to correct state!");
  } else {
    console.log("❌ Mismatch in final state");
  }

  process.exit(0);
}

clean().catch(console.error);
