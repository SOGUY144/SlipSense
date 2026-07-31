import { db } from './lib/db/index';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    await db.execute(sql`ALTER TABLE transactions ADD CONSTRAINT transactions_trans_ref_key UNIQUE (trans_ref);`);
    await db.execute(sql`ALTER TABLE slip_jobs ADD CONSTRAINT slip_jobs_trans_ref_key UNIQUE (trans_ref);`);
    console.log('Unique constraints added successfully.');
  } catch (err: any) {
    if (err.message && err.message.includes('already exists')) {
      console.log('Constraints already exist.');
    } else {
      console.error(err);
    }
  } finally {
    process.exit(0);
  }
}

migrate();
