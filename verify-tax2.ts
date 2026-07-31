function runDemo() {
  console.log("--- RECONCILIATION DEMO (333, 333, 334) ---");
  
  const dummyTxs = [333, 333, 334];
  let sumSubtotal = 0;
  let sumTax = 0;
  let sumTotal = 0;
  let rows: any[] = [];

  dummyTxs.forEach((amt) => {
    const subtotal = Math.round((amt / 1.07) * 100) / 100;
    const tax = Math.round((amt - subtotal) * 100) / 100;
    sumSubtotal += subtotal;
    sumTax += tax;
    sumTotal += amt;
    rows.push({ amt, subtotal, tax });
  });

  console.log("1. Row by Row (Before any adjustment):");
  rows.forEach((r, i) => console.log(`Row ${i+1}: Total=${r.amt}, Subtotal=${r.subtotal}, Tax=${r.tax}`));

  let finalSumSubtotal = Math.round(sumSubtotal * 100) / 100; 
  let finalSumTax = Math.round(sumTax * 100) / 100; 
  const finalSumTotal = Math.round(sumTotal * 100) / 100; 

  console.log(`\n2. Aggregate Sums (Row-by-Row):`);
  console.log(`Sum of Subtotals: ${finalSumSubtotal}`);
  console.log(`Sum of Taxes: ${finalSumTax}`);
  console.log(`Sum of Totals: ${finalSumTotal}`);

  // What if we calculate Tax based on Grand Total?
  const aggregateExpectedSubtotal = Math.round((finalSumTotal / 1.07) * 100) / 100;
  const aggregateExpectedTax = Math.round((finalSumTotal - aggregateExpectedSubtotal) * 100) / 100;
  
  console.log(`\n3. What if calculated from Grand Total (1000)?`);
  console.log(`Expected Subtotal (1000/1.07): ${aggregateExpectedSubtotal}`);
  console.log(`Expected Tax (1000 - Subtotal): ${aggregateExpectedTax}`);
  
  const taxDiff = Math.round((aggregateExpectedTax - finalSumTax) * 100) / 100;
  console.log(`Difference in Tax (Aggregate vs Row-by-Row): ${taxDiff}`);

  if (taxDiff !== 0) {
    console.log(`\n4. Applying Reconciliation to Last Row...`);
    const lastRow = rows[rows.length - 1];
    console.log(`Old Last Row Tax: ${lastRow.tax}`);
    
    // Adjust last row tax
    lastRow.tax = Math.round((lastRow.tax + taxDiff) * 100) / 100;
    // We must also adjust subtotal so the row still sums to its total (334)
    lastRow.subtotal = Math.round((lastRow.amt - lastRow.tax) * 100) / 100;
    
    console.log(`New Last Row Tax: ${lastRow.tax}`);
    console.log(`New Last Row Subtotal: ${lastRow.subtotal}`);
    
    // Recalculate sums
    finalSumTax = Math.round((finalSumTax + taxDiff) * 100) / 100;
    finalSumSubtotal = Math.round((finalSumSubtotal - taxDiff) * 100) / 100;
    
    console.log(`\n5. Final Adjusted Sums:`);
    console.log(`Adjusted Sum of Subtotals: ${finalSumSubtotal}`);
    console.log(`Adjusted Sum of Taxes: ${finalSumTax}`);
    console.log(`Matches Grand Total calculation perfectly!`);
  }
}

runDemo();
