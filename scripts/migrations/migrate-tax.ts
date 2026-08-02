import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { transactions } from "./lib/db/schema";
import * as fs from "fs";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function run() {
  console.log("1. Backing up transactions table...");
  const allTxs = await db.select().from(transactions);
  fs.writeFileSync(
    "transactions-backup.json",
    JSON.stringify(allTxs, null, 2)
  );
  console.log(`Backup completed: ${allTxs.length} records saved to transactions-backup.json`);

  console.log("2. Taking snapshot of max created_at (T1)...");
  const result = await db.execute(sql`SELECT MAX(created_at) as t1 FROM transactions`);
  const t1 = result[0]?.t1;
  
  if (!t1) {
    console.log("No transactions found. T1 is null.");
    process.exit(0);
  }

  const t1ISO = new Date(t1 as string).toISOString();
  console.log(`Snapshot T1: ${t1ISO}`);

  const logEntry = `[${new Date().toISOString()}] MIGRATION SNAPSHOT T1 = ${t1ISO}\n`;
  fs.appendFileSync("migration-audit.log", logEntry);
  console.log("Appended to migration-audit.log");

  process.exit(0);
}

run().catch(console.error);
