import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function run() {
  console.log("Applying manual schema changes...");
  
  await db.execute(sql`
    ALTER TABLE transactions 
    ADD COLUMN IF NOT EXISTS tax_id text,
    ADD COLUMN IF NOT EXISTS tax_invoice_no text,
    ADD COLUMN IF NOT EXISTS tax_invoice_date timestamp with time zone,
    ADD COLUMN IF NOT EXISTS partner_name text,
    ADD COLUMN IF NOT EXISTS partner_address text,
    ADD COLUMN IF NOT EXISTS is_vat_registered boolean DEFAULT false;
  `);
  
  console.log("Schema changes applied.");
  console.log("Updating existing transactions to is_vat_registered = true...");
  
  await db.execute(sql`
    UPDATE transactions 
    SET is_vat_registered = true 
    WHERE created_at <= '2026-07-02T16:19:59.526Z';
  `);
  
  console.log("Migration completed successfully.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
