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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const slipJobStatusEnum = pgEnum("slip_job_status", [
  "processing",
  "done",
  "failed",
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

export const shopRoleEnum = pgEnum("shop_role", ["owner", "member"]);

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
  counterparty: text("counterparty"),
  note: text("note"),
  confidence: confidenceEnum("confidence"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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

export const transactionsRelations = relations(transactions, ({ one }) => ({
  shop: one(shops, {
    fields: [transactions.shopId],
    references: [shops.id],
  }),
  slipJob: one(slipJobs, {
    fields: [transactions.slipJobId],
    references: [slipJobs.id],
  }),
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

export type Profile = typeof profiles.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type ShopMember = typeof shopMembers.$inferSelect;
export type SlipJob = typeof slipJobs.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Insight = typeof insights.$inferSelect;
export type BillReminder = typeof billReminders.$inferSelect;
export type Category = typeof categories.$inferSelect;
