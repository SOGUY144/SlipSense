import { db } from './lib/db/index';
import { shops } from './lib/db/schema';

async function main() {
  try {
    const s = await db.select().from(shops).limit(1);
    console.log(s);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
main();
