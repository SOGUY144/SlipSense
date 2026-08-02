import { db } from "./lib/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Running LINE migration...");
    try { await db.execute(sql`CREATE TYPE "transaction_source" AS ENUM ('manual', 'line');`); } catch(e) {}
    try { await db.execute(sql`ALTER TABLE "shops" ADD COLUMN "line_channel_secret" text;`); } catch(e) {}
    try { await db.execute(sql`ALTER TABLE "shops" ADD COLUMN "line_access_token" text;`); } catch(e) {}
    try { await db.execute(sql`ALTER TABLE "shops" ADD COLUMN "is_line_active" boolean DEFAULT false;`); } catch(e) {}
    try { await db.execute(sql`ALTER TABLE "transactions" ADD COLUMN "source" "transaction_source" DEFAULT 'manual';`); } catch(e) {}
    console.log("Migration complete.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();
