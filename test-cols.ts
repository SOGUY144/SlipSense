import 'dotenv/config';
import { db } from './lib/db/index';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const res = await db.execute(sql\
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions'
    \);
    console.log(res);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
main();
