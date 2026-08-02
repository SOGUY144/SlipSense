require('dotenv').config({ path: '.env.local' });
const pg = require('postgres')(process.env.DATABASE_URL);

async function migrate() {
  try {
    // Check if enum exists first
    const enumCheck = await pg\
      SELECT 1 FROM pg_type WHERE typname = 'risk_level';
    \;
    if (enumCheck.length === 0) {
      await pg\CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');\;
      console.log('Created risk_level enum');
    }

    // Add columns to slip_jobs
    await pg.unsafe(\ALTER TABLE slip_jobs ADD COLUMN IF NOT EXISTS trans_ref text;\);
    await pg.unsafe(\ALTER TABLE slip_jobs ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;\);
    await pg.unsafe(\ALTER TABLE slip_jobs ADD COLUMN IF NOT EXISTS risk_level risk_level DEFAULT 'low';\);
    await pg.unsafe(\ALTER TABLE slip_jobs ADD COLUMN IF NOT EXISTS risk_reasons jsonb;\);

    // Add columns to transactions
    await pg.unsafe(\ALTER TABLE transactions ADD COLUMN IF NOT EXISTS trans_ref text;\);
    await pg.unsafe(\ALTER TABLE transactions ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;\);
    await pg.unsafe(\ALTER TABLE transactions ADD COLUMN IF NOT EXISTS risk_level risk_level DEFAULT 'low';\);
    await pg.unsafe(\ALTER TABLE transactions ADD COLUMN IF NOT EXISTS risk_reasons jsonb;\);

    console.log('Schema migration completed successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
migrate();
