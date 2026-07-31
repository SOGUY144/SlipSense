import { db } from './lib/db/index';
import { transactions } from './lib/db/schema';

async function verify() {
  try {
    const tx = await db.select({
      id: transactions.id,
      transRef: transactions.transRef,
      riskLevel: transactions.riskLevel
    }).from(transactions).limit(1);
    
    console.log('Database verification successful! Found transactions:', tx.length);
    console.log('Columns test passed.');
  } catch (err) {
    console.error('Database verification failed:', err);
  } finally {
    process.exit(0);
  }
}
verify();
