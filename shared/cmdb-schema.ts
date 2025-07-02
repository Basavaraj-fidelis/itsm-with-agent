
import { pgTable, text, timestamp, uuid, varchar, boolean, integer, json } from "drizzle-orm/pg-core";

// Configuration Item types
export const ciTypes = ["server", "workstation", "network_device", "software", "database", "service", "location"] as const;

// Configuration Items (CMDB)
export const configurationItems = pgTable("configuration_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  ci_type: varchar("ci_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default("active"), // active, inactive, retired
  serial_number: varchar("serial_number", { length: 100 }),
  asset_tag: varchar("asset_tag", { length: 100 }),
  model: varchar("model", { length: 100 }),
  manufacturer: varchar("manufacturer", { length: 100 }),
  version: varchar("version", { length: 50 }),
  location: varchar("location", { length: 100 }),
  owner_id: uuid("owner_id"),
  cost: integer("cost"), // in cents
  purchase_date: timestamp("purchase_date"),
  warranty_expiry: timestamp("warranty_expiry"),
  attributes: json("attributes").$type<Record<string, any>>().default({}),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// CI Relationships
export const ciRelationships = pgTable("ci_relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  parent_ci_id: uuid("parent_ci_id").notNull().references(() => configurationItems.id),
  child_ci_id: uuid("child_ci_id").notNull().references(() => configurationItems.id),
  relationship_type: varchar("relationship_type", { length: 50 }).notNull(), // depends_on, contains, connects_to, runs_on
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type ConfigurationItem = typeof configurationItems.$inferSelect;
export type NewConfigurationItem = typeof configurationItems.$inferInsert;
export type CIRelationship = typeof ciRelationships.$inferSelect;
export type NewCIRelationship = typeof ciRelationships.$inferInsert;
