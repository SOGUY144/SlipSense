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

async function run() {
  console.log("Running Step 4: Verification...");

  const logPath = path.join(process.cwd(), "migration-audit.log");
  const logContent = fs.readFileSync(logPath, "utf8");
  const lines = logContent.trim().split("\n");
  const lastLine = lines[lines.length - 1];
  
  const match = lastLine.match(/T1 = (.*)$/);
  if (!match) throw new Error("Could not find T1 snapshot in log file");
  
  const snapshotTimeStr = match[1].trim();
  console.log(`Checking rows strictly AFTER: ${snapshotTimeStr}`);

  // Query passing the string exactly
  const res = await db.execute(sql`
    SELECT id, created_at, is_vat_registered 
    FROM transactions 
    WHERE created_at > ${snapshotTimeStr}::timestamptz
    AND is_vat_registered = true
  `);

  if (res.length === 0) {
    console.log("✅ VERIFICATION PASSED: 0 rows found. No new transactions were affected.");
  } else {
    console.log(`❌ VERIFICATION FAILED: Found ${res.length} rows!`);
    console.log(res);
  }

  process.exit(0);
}

run().catch(console.error);
