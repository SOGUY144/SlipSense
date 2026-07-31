import { db } from './lib/db/index';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    await db.execute(sql`CREATE INDEX IF NOT EXISTS transactions_shop_id_idx ON transactions (shop_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS transactions_shop_date_idx ON transactions (shop_id, occurred_at);`);
    console.log('Indexes added successfully.');
  } catch (err: any) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

migrate();
