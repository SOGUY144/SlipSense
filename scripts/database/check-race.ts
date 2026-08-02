import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function run() {
  const T1 = '2026-07-02T16:19:59.526Z';
  
  console.log(`Checking for race condition victims (created_at > '${T1}' AND is_vat_registered = true)...`);
  
  const res = await db.execute(sql`
    SELECT id, created_at, is_vat_registered 
    FROM transactions 
    WHERE created_at > ${T1} 
    AND is_vat_registered = true
  `);

  if (res.length === 0) {
    console.log("✅ GOOD NEWS: 0 rows found. No new transactions were accidentally modified by the fix script.");
  } else {
    console.log(`❌ WARNING: Found ${res.length} rows that were modified incorrectly!`);
    console.log(res);
  }

  process.exit(0);
}

run().catch(console.error);
