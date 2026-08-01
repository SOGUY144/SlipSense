import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  jsonb,
  pgEnum,
  primaryKey,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const slipJobStatusEnum = pgEnum("slip_job_status", [
  "processing",
  "done",
  "failed",
]);

export const transactionSourceEnum = pgEnum("transaction_source", [
  "manual",
  "line",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
]);

export const categoryTypeEnum = pgEnum("category_type", [
  "income",
  "expense",
]);

export const confidenceEnum = pgEnum("confidence_level", [
  "high",
  "medium",
  "low",
]);

export const riskLevelEnum = pgEnum("risk_level", [
  "low",
  "medium",
  "high",
]);

export const shopRoleEnum = pgEnum("shop_role", ["owner", "member"]);

export const creditTypeEnum = pgEnum("credit_type", ["debtor", "creditor"]);
export const creditStatusEnum = pgEnum("credit_status", [
  "pending",
  "paid",
  "overdue",
  "cancelled",
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  phone: text("phone"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const shops = pgTable("shops", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  preferences: jsonb("preferences"),
  lineChannelSecret: text("line_channel_secret"),
  lineAccessToken: text("line_access_token"),
  isLineActive: boolean("is_line_active").default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const shopMembers = pgTable(
  "shop_members",
  {
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: shopRoleEnum("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.shopId, table.userId] })]
);

export const slipJobs = pgTable("slip_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  status: slipJobStatusEnum("status").notNull().default("processing"),
  extractedData: jsonb("extracted_data"),
  confidence: confidenceEnum("confidence"),
  errorMessage: text("error_message"),
  transRef: text("trans_ref"),
  riskScore: integer("risk_score").default(0),
  riskLevel: riskLevelEnum("risk_level").default("low"),
  riskReasons: jsonb("risk_reasons"),
  source: transactionSourceEnum("source").default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  slipJobId: uuid("slip_job_id").references(() => slipJobs.id, {
    onDelete: "set null",
  }),
  type: transactionTypeEnum("type").notNull(),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  sender: text("sender"),
  receiver: text("receiver"),
  note: text("note"),
  metadata: jsonb("metadata"),
  confidence: confidenceEnum("confidence"),
  transRef: text("trans_ref").unique(),
  riskScore: integer("risk_score").default(0),
  riskLevel: riskLevelEnum("risk_level").default("low"),
  riskReasons: jsonb("risk_reasons"),
  taxId: text("tax_id"),
  taxInvoiceNo: text("tax_invoice_no"),
  taxInvoiceDate: timestamp("tax_invoice_date", { withTimezone: true }),
  partnerName: text("partner_name"),
  partnerAddress: text("partner_address"),
  isVatRegistered: boolean("is_vat_registered").default(false),
  source: transactionSourceEnum("source").default("manual"),
  isPersonal: boolean("is_personal").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("transactions_shop_id_idx").on(t.shopId),
  index("transactions_shop_date_idx").on(t.shopId, t.occurredAt),
  index("transactions_shop_personal_date_idx").on(t.shopId, t.isPersonal, t.occurredAt),
]);

export const dailyShifts = pgTable("daily_shifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  shiftDate: timestamp("shift_date", { withTimezone: true }).notNull(),
  transferTotal: numeric("transfer_total", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  cashTotal: numeric("cash_total", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  grossTotal: numeric("gross_total", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("daily_shifts_shop_date_idx").on(t.shopId, t.shiftDate),
]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  type: categoryTypeEnum("type").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insights = pgTable("insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const shopsRelations = relations(shops, ({ many }) => ({
  members: many(shopMembers),
  transactions: many(transactions),
  slipJobs: many(slipJobs),
  insights: many(insights),
  categories: many(categories),
  dailyShifts: many(dailyShifts),
  credits: many(credits),
  transactionItems: many(transactionItems),
  reorderCycles: many(reorderCycles),
  ingredients: many(ingredients),
  recipes: many(recipes),
}));

export const dailyShiftsRelations = relations(dailyShifts, ({ one }) => ({
  shop: one(shops, {
    fields: [dailyShifts.shopId],
    references: [shops.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one }) => ({
  shop: one(shops, {
    fields: [categories.shopId],
    references: [shops.id],
  }),
}));

export const profilesRelations = relations(profiles, ({ many }) => ({
  shopMemberships: many(shopMembers),
}));

export const shopMembersRelations = relations(shopMembers, ({ one }) => ({
  shop: one(shops, {
    fields: [shopMembers.shopId],
    references: [shops.id],
  }),
  profile: one(profiles, {
    fields: [shopMembers.userId],
    references: [profiles.id],
  }),
}));

export const slipJobsRelations = relations(slipJobs, ({ one }) => ({
  shop: one(shops, {
    fields: [slipJobs.shopId],
    references: [shops.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  shop: one(shops, {
    fields: [transactions.shopId],
    references: [shops.id],
  }),
  slipJob: one(slipJobs, {
    fields: [transactions.slipJobId],
    references: [slipJobs.id],
  }),
  credits: many(credits),
  items: many(transactionItems),
}));

export const insightsRelations = relations(insights, ({ one }) => ({
  shop: one(shops, {
    fields: [insights.shopId],
    references: [shops.id],
  }),
}));

export const billReminders = pgTable("bill_reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  dueDay: integer("due_day").notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastPaidMonth: text("last_paid_month"), // YYYY-MM
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const billRemindersRelations = relations(billReminders, ({ one }) => ({
  shop: one(shops, {
    fields: [billReminders.shopId],
    references: [shops.id],
  }),
}));

export const credits = pgTable("credits", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  type: creditTypeEnum("type").notNull(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: creditStatusEnum("status").default("pending").notNull(),
  transactionId: uuid("transaction_id").references(() => transactions.id, {
    onDelete: "set null",
  }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("credits_shop_type_status_idx").on(t.shopId, t.type, t.status),
]);

export const creditsRelations = relations(credits, ({ one }) => ({
  shop: one(shops, {
    fields: [credits.shopId],
    references: [shops.id],
  }),
  transaction: one(transactions, {
    fields: [credits.transactionId],
    references: [transactions.id],
  }),
}));

export const transactionItems = pgTable("transaction_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  supplierName: text("supplier_name"),
  previousUnitPrice: numeric("previous_unit_price", { precision: 12, scale: 2 }),
  priceChangePercent: numeric("price_change_percent", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("tx_items_shop_item_name_idx").on(t.shopId, t.itemName),
]);

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
  shop: one(shops, {
    fields: [transactionItems.shopId],
    references: [shops.id],
  }),
  transaction: one(transactions, {
    fields: [transactionItems.transactionId],
    references: [transactions.id],
  }),
}));

export const reorderCycles = pgTable("reorder_cycles", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  averageIntervalDays: integer("average_interval_days").default(14).notNull(),
  lastPurchasedAt: timestamp("last_purchased_at", { withTimezone: true }).notNull(),
  nextDueDate: timestamp("next_due_date", { withTimezone: true }).notNull(),
  supplierName: text("supplier_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("reorder_shop_due_idx").on(t.shopId, t.nextDueDate),
]);

export const reorderCyclesRelations = relations(reorderCycles, ({ one }) => ({
  shop: one(shops, {
    fields: [reorderCycles.shopId],
    references: [shops.id],
  }),
}));

export const ingredients = pgTable(
  "ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    costPerUnit: numeric("cost_per_unit", { precision: 12, scale: 4 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("ingredients_shop_id_idx").on(table.shopId)]
);

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull(),
    totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull(),
    marginPercent: numeric("margin_percent", { precision: 5, scale: 2 }).notNull(),
    category: text("category").default("อาหาร/สินค้า"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("recipes_shop_id_idx").on(table.shopId)]
);

export const recipeItems = pgTable(
  "recipe_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id").references(() => ingredients.id, { onDelete: "set null" }),
    ingredientName: text("ingredient_name").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
    unit: text("unit").notNull(),
    cost: numeric("cost", { precision: 12, scale: 2 }).notNull(),
  },
  (table) => [index("recipe_items_recipe_id_idx").on(table.recipeId)]
);

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  shop: one(shops, { fields: [recipes.shopId], references: [shops.id] }),
  items: many(recipeItems),
}));

export const recipeItemsRelations = relations(recipeItems, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeItems.recipeId], references: [recipes.id] }),
  ingredient: one(ingredients, { fields: [recipeItems.ingredientId], references: [ingredients.id] }),
}));

export type Profile = typeof profiles.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type ShopMember = typeof shopMembers.$inferSelect;
export type SlipJob = typeof slipJobs.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Insight = typeof insights.$inferSelect;
export type BillReminder = typeof billReminders.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type DailyShift = typeof dailyShifts.$inferSelect;
export type Credit = typeof credits.$inferSelect;
export type NewCredit = typeof credits.$inferInsert;
export type TransactionItem = typeof transactionItems.$inferSelect;
export type NewTransactionItem = typeof transactionItems.$inferInsert;
export type ReorderCycle = typeof reorderCycles.$inferSelect;
export type NewReorderCycle = typeof reorderCycles.$inferInsert;
export type Ingredient = typeof ingredients.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeItem = typeof recipeItems.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;
export type NewRecipe = typeof recipes.$inferInsert;
export type NewRecipeItem = typeof recipeItems.$inferInsert;
