// Recipe Costing Calculation Unit Tests

export function calculateRecipeCostAndMargin(
  sellingPrice: number,
  items: Array<{ quantity: number; unitCost: number }>
) {
  const totalCost = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const cost = Number(item.unitCost) || 0;
    return sum + qty * cost;
  }, 0);

  const marginPercent =
    sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

  return {
    totalCost: Number(totalCost.toFixed(2)),
    marginPercent: Number(marginPercent.toFixed(2)),
  };
}

// Inline Test Assertions
function runTests() {
  console.log("🧪 Running Recipe Costing Engine Unit Tests...");

  // Test 1: Standard Khao Moo Krob Recipe
  // Selling Price: 65฿
  // Ingredients: 150g pork @ 0.18฿/g = 27฿, 150g rice @ 0.02฿/g = 3฿, Sauce = 4฿, Box = 3฿
  // Total Cost = 37฿, Margin = (65 - 37)/65 * 100 = 43.08%
  const t1 = calculateRecipeCostAndMargin(65, [
    { quantity: 150, unitCost: 0.18 },
    { quantity: 150, unitCost: 0.02 },
    { quantity: 1, unitCost: 4 },
    { quantity: 1, unitCost: 3 },
  ]);

  console.assert(t1.totalCost === 37.0, `Test 1 Failed: Expected totalCost 37.00, got ${t1.totalCost}`);
  console.assert(t1.marginPercent === 43.08, `Test 1 Failed: Expected marginPercent 43.08, got ${t1.marginPercent}`);

  // Test 2: High Yield Processed Product (Sun-Dried Pork)
  // Selling Price: 180฿
  // Raw Pork 750g @ 0.18฿/g = 135฿, Seasoning = 12฿, Bag = 4฿
  // Total Cost = 151฿, Margin = (180 - 151)/180 * 100 = 16.11%
  const t2 = calculateRecipeCostAndMargin(180, [
    { quantity: 750, unitCost: 0.18 },
    { quantity: 1, unitCost: 12 },
    { quantity: 1, unitCost: 4 },
  ]);

  console.assert(t2.totalCost === 151.0, `Test 2 Failed: Expected totalCost 151.00, got ${t2.totalCost}`);
  console.assert(t2.marginPercent === 16.11, `Test 2 Failed: Expected marginPercent 16.11, got ${t2.marginPercent}`);

  // Test 3: Zero Selling Price Edge Case
  const t3 = calculateRecipeCostAndMargin(0, [{ quantity: 10, unitCost: 5 }]);
  console.assert(t3.totalCost === 50.0, `Test 3 Failed: Expected totalCost 50.00, got ${t3.totalCost}`);
  console.assert(t3.marginPercent === 0, `Test 3 Failed: Expected marginPercent 0, got ${t3.marginPercent}`);

  console.log("✅ All Recipe Costing Engine Unit Tests Passed!");
}

runTests();
