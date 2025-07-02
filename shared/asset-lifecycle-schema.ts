
import { pgTable, text, timestamp, uuid, varchar, boolean, integer, json } from "drizzle-orm/pg-core";

// Asset lifecycle states
export const assetStates = ["ordered", "received", "configured", "deployed", "active", "maintenance", "retired", "disposed"] as const;

// Asset lifecycle tracking
export const assetLifecycle = pgTable("asset_lifecycle", {
  id: uuid("id").primaryKey().defaultRandom(),
  asset_id: uuid("asset_id").notNull(), // References devices or configuration items
  state: varchar("state", { length: 20 }).notNull(),
  previous_state: varchar("previous_state", { length: 20 }),
  changed_by: uuid("changed_by").notNull(),
  change_reason: text("change_reason"),
  location_from: varchar("location_from", { length: 100 }),
  location_to: varchar("location_to", { length: 100 }),
  cost_center: varchar("cost_center", { length: 50 }),
  depreciation_method: varchar("depreciation_method", { length: 50 }),
  residual_value: integer("residual_value"), // in cents
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Asset maintenance records
export const assetMaintenance = pgTable("asset_maintenance", {
  id: uuid("id").primaryKey().defaultRandom(),
  asset_id: uuid("asset_id").notNull(),
  maintenance_type: varchar("maintenance_type", { length: 50 }).notNull(), // preventive, corrective, emergency
  vendor_id: uuid("vendor_id"),
  scheduled_date: timestamp("scheduled_date"),
  completed_date: timestamp("completed_date"),
  cost: integer("cost"), // in cents
  description: text("description"),
  next_maintenance_due: timestamp("next_maintenance_due"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Asset contracts and warranties
export const assetContracts = pgTable("asset_contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  asset_id: uuid("asset_id").notNull(),
  contract_type: varchar("contract_type", { length: 50 }).notNull(), // warranty, maintenance, lease, support
  vendor_name: varchar("vendor_name", { length: 255 }).notNull(),
  contract_number: varchar("contract_number", { length: 100 }),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  cost: integer("cost"), // in cents
  payment_frequency: varchar("payment_frequency", { length: 20 }), // monthly, yearly, one-time
  auto_renewal: boolean("auto_renewal").default(false),
  notification_days: integer("notification_days").default(30),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type AssetLifecycle = typeof assetLifecycle.$inferSelect;
export type NewAssetLifecycle = typeof assetLifecycle.$inferInsert;
export type AssetMaintenance = typeof assetMaintenance.$inferSelect;
export type NewAssetMaintenance = typeof assetMaintenance.$inferInsert;
export type AssetContract = typeof assetContracts.$inferSelect;
export type NewAssetContract = typeof assetContracts.$inferInsert;
