
import { pgTable, text, timestamp, uuid, varchar, boolean, integer, json } from "drizzle-orm/pg-core";

// Service Catalog
export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  service_type: varchar("service_type", { length: 50 }).default("business"), // business, technical, infrastructure
  owner_id: uuid("owner_id"),
  service_level: varchar("service_level", { length: 20 }).default("standard"), // basic, standard, premium
  cost: integer("cost"), // monthly cost in cents
  approval_required: boolean("approval_required").default(false),
  auto_approval: boolean("auto_approval").default(false),
  sla_policy_id: uuid("sla_policy_id"),
  is_active: boolean("is_active").default(true),
  request_form_fields: json("request_form_fields").$type<any[]>().default([]),
  fulfillment_instructions: text("fulfillment_instructions"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Service Requests
export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticket_id: uuid("ticket_id").notNull(),
  service_id: uuid("service_id").notNull().references(() => services.id),
  requested_for: varchar("requested_for", { length: 255 }),
  business_justification: text("business_justification"),
  delivery_instructions: text("delivery_instructions"),
  approval_status: varchar("approval_status", { length: 20 }).default("pending"), // pending, approved, rejected
  approved_by: varchar("approved_by", { length: 255 }),
  approved_at: timestamp("approved_at"),
  form_data: json("form_data").$type<Record<string, any>>().default({}),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type NewServiceRequest = typeof serviceRequests.$inferInsert;
