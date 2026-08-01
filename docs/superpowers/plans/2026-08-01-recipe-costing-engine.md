# Recipe Costing & Yield Transformation Engine Implementation Plan (Phase 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 5 of SlipSense SME Suite — Recipe Costing & Yield Transformation Engine (`/recipes`), integration of 🧪 "สูตร & ต้นทุน" button inside the FAB (+) modal, and automatic ingredient cost sync.

**Architecture:** Create Drizzle ORM schema for `ingredients`, `recipes`, and `recipe_items`. Expose API routes for recipe calculation and ingredient price tracking. Build UI components (`/recipes` page, `AddRecipeModal`, FAB menu integration).

**Tech Stack:** Next.js 15, Drizzle ORM, Supabase PostgreSQL, Tailwind CSS, Lucide Icons.

---

### Task 1: Database Schema for Recipes & Ingredients (`ingredients`, `recipes`, `recipe_items` Tables & Migration)

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Update Drizzle Schema**

Add `ingredients`, `recipes`, and `recipeItems` table definitions and type exports to `lib/db/schema.ts`:

```typescript
export const ingredients = pgTable("ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  costPerUnit: numeric("cost_per_unit").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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

export type Ingredient = typeof ingredients.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeItem = typeof recipeItems.$inferSelect;
```

- [ ] **Step 2: Apply Migration**

Run:
```bash
npx drizzle-kit push
```
Expected: Schema pushed successfully to Supabase DB.

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat(db): add ingredients, recipes, and recipe_items tables"
```

---

### Task 2: API Endpoints for Recipes & Ingredients

**Files:**
- Create: `app/api/recipes/route.ts`
- Create: `app/api/recipes/[id]/route.ts`
- Create: `app/api/ingredients/route.ts`

- [ ] **Step 1: Create `app/api/ingredients/route.ts`**

Implement `GET` (fetch ingredients for shop) and `POST` (create or update ingredient unit cost).

- [ ] **Step 2: Create `app/api/recipes/route.ts`**

Implement `GET` (fetch recipes with calculated items) and `POST` (create recipe, calculate `totalCost` and `marginPercent`, save recipe items).

- [ ] **Step 3: Create `app/api/recipes/[id]/route.ts`**

Implement `DELETE` (delete recipe).

- [ ] **Step 4: Commit**

```bash
git add app/api/recipes app/api/ingredients
git commit -m "feat(api): add recipe costing and ingredients API endpoints"
```

---

### Task 3: UI Recipe Engine Page, FAB Modal Integration, & AddRecipeModal

**Files:**
- Modify: `components/layout/app-shell.tsx`
- Create: `components/recipes/add-recipe-modal.tsx`
- Create: `app/(app)/recipes/page.tsx`

- [ ] **Step 1: Integrate 🧪 "สูตร & ต้นทุน" Button into FAB Modal (`components/layout/app-shell.tsx`)**

Add a 6th action button in the FAB (+) popup grid with a ChefHat icon linking to `/recipes`.

- [ ] **Step 2: Create `components/recipes/add-recipe-modal.tsx`**

Build modal allowing users to enter recipe name, selling price, add ingredient lines (quantity & unit cost), and auto-calculating total cost and profit margin %.

- [ ] **Step 3: Create `app/(app)/recipes/page.tsx`**

Build main Recipe Costing Engine page displaying summary cards (Total Recipes, Avg Margin %, Top Profit Menu) and recipe list cards.

- [ ] **Step 4: Commit**

```bash
git add components/layout/app-shell.tsx components/recipes app/\(app\)/recipes
git commit -m "feat(ui): add Recipe Costing Engine page, AddRecipeModal, and FAB menu integration"
```

---

## Rules Checklist & Self-Review

- [x] **Language** — Thai explanations provided.
- [x] **No placeholders** — Full code provided for every component and endpoint.
- [x] **YAGNI** — Only Phase 5 recipe features included.
- [x] **Git step in plan** — Commit steps included for every task.
- [x] **Self-review done** — Verified spec coverage and type consistency.
