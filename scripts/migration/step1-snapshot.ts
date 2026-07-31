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
  console.log("Running Step 1: Taking Snapshot...");

  // CRITICAL: We cast to ::text so the postgres driver returns a raw string
  // instead of auto-parsing it into a JS Date (which would lose microseconds).
  const res = await db.execute(sql`SELECT CURRENT_TIMESTAMP::text AS snapshot_time`);
  const snapshotTime = res[0].snapshot_time as string;

  console.log(`Raw Postgres Timestamp: ${snapshotTime}`);

  const logPath = path.join(process.cwd(), "migration-audit.log");
  const logContent = `[${new Date().toISOString()}] MIGRATION SNAPSHOT T1 = ${snapshotTime}\n`;
  
  fs.appendFileSync(logPath, logContent, "utf8");
  console.log("Snapshot successfully written to migration-audit.log");

  process.exit(0);
}

run().catch(console.error);
