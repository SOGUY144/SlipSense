import { db } from './lib/db/index';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    const enumCheck = await db.execute(sql`
      SELECT 1 FROM pg_type WHERE typname = 'risk_level';
    `);
    
    if (enumCheck.length === 0) {
      await db.execute(sql`CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');`);
      console.log('Created risk_level enum');
    } else {
      console.log('Enum risk_level already exists');
    }

    // Add columns to slip_jobs
    await db.execute(sql`ALTER TABLE slip_jobs ADD COLUMN IF NOT EXISTS trans_ref text;`);
    await db.execute(sql`ALTER TABLE slip_jobs ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE slip_jobs ADD COLUMN IF NOT EXISTS risk_level risk_level DEFAULT 'low';`);
    await db.execute(sql`ALTER TABLE slip_jobs ADD COLUMN IF NOT EXISTS risk_reasons jsonb;`);

    // Add columns to transactions
    await db.execute(sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS trans_ref text;`);
    await db.execute(sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS risk_level risk_level DEFAULT 'low';`);
    await db.execute(sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS risk_reasons jsonb;`);

    console.log('Schema migration completed successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

migrate();
