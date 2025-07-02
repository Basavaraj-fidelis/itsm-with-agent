
import { pgTable, text, timestamp, uuid, varchar, boolean, integer, json } from "drizzle-orm/pg-core";

// Vendors/Suppliers
export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  vendor_code: varchar("vendor_code", { length: 50 }).unique(),
  vendor_type: varchar("vendor_type", { length: 50 }), // hardware, software, service, consulting
  contact_person: varchar("contact_person", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  website: varchar("website", { length: 255 }),
  tax_id: varchar("tax_id", { length: 50 }),
  payment_terms: varchar("payment_terms", { length: 100 }),
  preferred_payment_method: varchar("preferred_payment_method", { length: 50 }),
  credit_rating: varchar("credit_rating", { length: 10 }),
  is_approved: boolean("is_approved").default(false),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Vendor Contracts
export const vendorContracts = pgTable("vendor_contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendor_id: uuid("vendor_id").notNull().references(() => vendors.id),
  contract_number: varchar("contract_number", { length: 100 }).notNull(),
  contract_type: varchar("contract_type", { length: 50 }), // service, maintenance, software_license, hardware_purchase
  description: text("description"),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  contract_value: integer("contract_value"), // in cents
  currency: varchar("currency", { length: 3 }).default("USD"),
  payment_schedule: varchar("payment_schedule", { length: 50 }),
  renewal_terms: text("renewal_terms"),
  termination_clauses: text("termination_clauses"),
  sla_terms: text("sla_terms"),
  penalty_clauses: text("penalty_clauses"),
  status: varchar("status", { length: 20 }).default("active"), // active, expired, terminated, suspended
  contract_manager_id: uuid("contract_manager_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Vendor Performance Metrics
export const vendorPerformance = pgTable("vendor_performance", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendor_id: uuid("vendor_id").notNull().references(() => vendors.id),
  evaluation_period: varchar("evaluation_period", { length: 20 }), // monthly, quarterly, yearly
  evaluation_date: timestamp("evaluation_date").notNull(),
  quality_score: integer("quality_score"), // 1-10
  delivery_score: integer("delivery_score"), // 1-10
  support_score: integer("support_score"), // 1-10
  cost_effectiveness: integer("cost_effectiveness"), // 1-10
  overall_score: integer("overall_score"), // 1-10
  comments: text("comments"),
  evaluated_by: uuid("evaluated_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
export type VendorContract = typeof vendorContracts.$inferSelect;
export type NewVendorContract = typeof vendorContracts.$inferInsert;
export type VendorPerformance = typeof vendorPerformance.$inferSelect;
export type NewVendorPerformance = typeof vendorPerformance.$inferInsert;
