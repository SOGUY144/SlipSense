import { db } from './lib/db/index';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    await db.execute(sql`ALTER TABLE slip_jobs DROP CONSTRAINT IF EXISTS slip_jobs_trans_ref_key;`);
    console.log('Constraint dropped successfully.');
  } catch (err: any) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

migrate();
