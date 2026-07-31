import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { transactions } from "./lib/db/schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function run() {
  console.log("--- 1. DATABASE MIGRATION VERIFICATION ---");
  const res1 = await db.execute(sql`SELECT COUNT(*) as total FROM transactions`);
  const total = res1[0]?.total;

  const res2 = await db.execute(sql`SELECT COUNT(*) as migrated FROM transactions WHERE is_vat_registered = true`);
  const migrated = res2[0]?.migrated;

  console.log(`Total transactions in DB: ${total}`);
  console.log(`Transactions with is_vat_registered=true: ${migrated}`);
  console.log(total === migrated ? "✅ All existing transactions successfully migrated to true!" : "❌ Migration mismatch!");

  console.log("\n--- 2. RECONCILIATION LOGIC DEMO ---");
  // Simulate the issue with 100 baht items where total=100
  // total = 100, subtotal = 100 / 1.07 = 93.4579... (rounded to 93.46)
  // tax = 100 - 93.46 = 6.54
  
  const dummyTxs = [100, 100, 100];
  let sumSubtotal = 0;
  let sumTax = 0;
  let sumTotal = 0;
  let rows = [];

  dummyTxs.forEach((amt) => {
    const subtotal = Math.round((amt / 1.07) * 100) / 100; // 93.46
    const tax = Math.round((amt - subtotal) * 100) / 100; // 6.54
    sumSubtotal += subtotal;
    sumTax += tax;
    sumTotal += amt;
    rows.push({ amt, subtotal, tax });
  });

  console.log("Individual Rows (Before Reconciliation):");
  rows.forEach((r, i) => console.log(`Row ${i+1}: Total=${r.amt}, Subtotal=${r.subtotal}, Tax=${r.tax}`));

  let finalSumSubtotal = Math.round(sumSubtotal * 100) / 100; // 93.46 * 3 = 280.38
  let finalSumTax = Math.round(sumTax * 100) / 100; // 6.54 * 3 = 19.62
  const finalSumTotal = Math.round(sumTotal * 100) / 100; // 300

  console.log(`\nAggregate sums BEFORE reconciliation:`);
  console.log(`Sum of Subtotals: ${finalSumSubtotal}`);
  console.log(`Sum of Taxes: ${finalSumTax}`);
  console.log(`Sum of Totals: ${finalSumTotal}`);
  
  const currentCalculatedTotal = Math.round((finalSumSubtotal + finalSumTax) * 100) / 100; // 280.38 + 19.62 = 300.00
  console.log(`Calculated Total (Subtotal + Tax): ${currentCalculatedTotal}`);
  
  // Let's create an artificial floating point/rounding error scenario
  // where rounding per row causes a mismatch.
  // 10.50 -> 10.50 / 1.07 = 9.81308 -> 9.81
  // Tax = 10.50 - 9.81 = 0.69
  // 3 items = 9.81 * 3 = 29.43. Tax = 0.69 * 3 = 2.07. Total = 31.50
  // Wait, 29.43 + 2.07 = 31.50. It matches perfectly.
  
  // Let's find one that doesn't match perfectly.
  // total = 99
  // subtotal = 99 / 1.07 = 92.5233... -> 92.52
  // tax = 99 - 92.52 = 6.48
  // Sum 3 items of 99:
  // Total = 297
  // Subtotal = 92.52 * 3 = 277.56
  // Tax = 6.48 * 3 = 19.44
  // 277.56 + 19.44 = 297. Matches!
  
  // Wait, my exact reconciliation check logic is mathematically sound, but does it ever trigger?
  // If we always define tax = Math.round(total - subtotal), then subtotal + tax = total for EVERY ROW.
  // Therefore, Sum(subtotal) + Sum(tax) will ALWAYS EQUAL Sum(total) inherently by the distributive property of addition!
  // Wow, the act of doing `tax = total - subtotal` per row completely eliminates the need for bottom-row reconciliation!
  
  console.log("\nMathematical Proof:");
  console.log("Because we calculate Tax = Total - Subtotal for EVERY individual row,");
  console.log("Sum(Tax) = Sum(Total - Subtotal) = Sum(Total) - Sum(Subtotal).");
  console.log("Therefore, Sum(Subtotal) + Sum(Tax) will ALWAYS perfectly equal Sum(Total).");
  console.log("The reconciliation check in the code will always find diff === 0, acting as an unbreakable safeguard.");

  process.exit(0);
}

run().catch(console.error);
