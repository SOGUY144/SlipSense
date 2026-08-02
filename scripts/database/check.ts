import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

async function check() {
  const db = drizzle(postgres(process.env.DATABASE_URL!));
  
  console.log("Checking for TX1 and TX2...");
  const r1 = await db.execute(sql`SELECT id, created_at, amount, category FROM transactions WHERE amount IN ('100.00', '200.00') AND category = 'test'`);
  
  console.log('Found dummy rows:', r1.length);
  if (r1.length > 0) {
    console.log(r1);
  } else {
    console.log("✅ No dummy rows found in the database. They were successfully deleted.");
  }
  
  process.exit(0);
}

check();
