# Design Spec: Phase 5 — Recipe Costing & Yield Transformation Engine

## 1. Overview & Goal
Phase 5 introduces a specialized **Recipe Costing & Yield Transformation Engine** for Thai food stalls, cafes, bakeries, and retail/processing SMEs. It calculates exact raw material cost per portion (Cost per Portion), profit margin %, and alerts shop owners whenever rising raw material costs (from OCR purchase slips) erode product margins.

---

## 2. User Experience (UX / UI Design)

### A. FAB Menu Button Integration (`components/layout/app-shell.tsx`)
- Added **🧪 "สูตร & ต้นทุน"** quick action button to the FAB (+) popup modal.
- Clicking the button directly opens `/recipes` (Recipe & Costing Engine).

### B. Recipe & Costing Engine Page (`app/(app)/recipes/page.tsx`)
- **Summary Cards:** Total Active Recipes, Average Profit Margin %, Top Profitable Menu.
- **Recipe Creator Modal:** Add recipe name, selling price, list of ingredients (quantity & unit), and auto-calculated total cost + margin %.
- **Yield Loss Support:** Enter raw material weight before processing (e.g. 750g fresh pork -> 500g sun-dried pork) to calculate true yield cost.

### C. Cost Increase Alert Widget (`components/dashboard/recipe-cost-alert-widget.tsx`)
- Appears on Dashboard when raw material prices rise in purchase slips:
  - *"⚠️ หมูสามชั้นปรับขึ้นราคา ทำให้ต้นทุน ข้าวหมูกรอบ เพิ่มขึ้นจาก ฿37 เป็น ฿42 (กำไรเหลือ 35%)"*

---

## 3. Database Schema (`lib/db/schema.ts`)

```typescript
// 1. Ingredients Table
export const ingredients = pgTable("ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  costPerUnit: numeric("cost_per_unit").notNull(),
  lastUpdatedFromTransactionId: uuid("last_updated_from_transaction_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 2. Recipes Table
export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sellingPrice: numeric("selling_price").notNull(),
  totalCost: numeric("total_cost").notNull(),
  marginPercent: numeric("margin_percent").notNull(),
  category: text("category").default("อาหาร/สินค้า"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 3. Recipe Items Table
export const recipeItems = pgTable("recipe_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  ingredientId: uuid("ingredient_id").references(() => ingredients.id, { onDelete: "set null" }),
  ingredientName: text("ingredient_name").notNull(),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull(),
  cost: numeric("cost").notNull(),
});
```

---

## 4. API Endpoints

1. `GET /api/recipes` & `POST /api/recipes`
2. `GET /api/ingredients` & `POST /api/ingredients`
3. `GET /api/recipes/alerts`

---

## 5. Verification & Testing Strategy
1. **DB Migration:** Run `npx drizzle-kit push`.
2. **TypeScript & Build Verification:** Run `npx tsc --noEmit` and `npm run build`.
3. **UI Verification:** Test FAB (+) button link to `/recipes`, recipe creation, and cost margin calculation.
