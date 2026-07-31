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
  console.log("Running Step 3: Updating old transactions...");

  // 1. Read the exact timestamp from the log file
  const logPath = path.join(process.cwd(), "migration-audit.log");
  const logContent = fs.readFileSync(logPath, "utf8");
  
  // Find the last snapshot line
  const lines = logContent.trim().split("\n");
  const lastLine = lines[lines.length - 1];
  
  // Example line: [2026-07-31T06:45:14.751Z] MIGRATION SNAPSHOT T1 = 2026-07-31 06:45:14.751820+00
  const match = lastLine.match(/T1 = (.*)$/);
  if (!match) {
    throw new Error("Could not find T1 snapshot in log file");
  }
  
  const snapshotTimeStr = match[1].trim();
  console.log(`Using exact Raw Timestamp from log: ${snapshotTimeStr}`);

  // 2. Pass it DIRECTLY to the query as a string. Do NOT convert to Date().
  // By passing it as a bound parameter (string), Postgres will interpret it 
  // with full microsecond precision exactly as it generated it.
  const updateRes = await db.execute(sql`
    UPDATE transactions 
    SET is_vat_registered = true 
    WHERE created_at <= ${snapshotTimeStr}::timestamptz
    AND (is_vat_registered = false OR is_vat_registered IS NULL)
  `);

  console.log(`✅ Update complete. Rows affected: ${updateRes.count}`);

  process.exit(0);
}

run().catch(console.error);
