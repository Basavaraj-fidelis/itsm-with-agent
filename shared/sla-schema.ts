
import { pgTable, text, timestamp, integer, uuid, varchar, boolean } from "drizzle-orm/pg-core";

// SLA Policies table
export const slaPolicies = pgTable("sla_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  // Conditions
  ticket_type: varchar("ticket_type", { length: 20 }), // request, incident, problem, change
  priority: varchar("priority", { length: 20 }), // low, medium, high, critical
  impact: varchar("impact", { length: 20 }), // low, medium, high, critical
  urgency: varchar("urgency", { length: 20 }), // low, medium, high, critical
  category: varchar("category", { length: 100 }),
  
  // SLA Targets (in minutes)
  response_time: integer("response_time").notNull(), // Time to first response
  resolution_time: integer("resolution_time").notNull(), // Time to resolve
  
  // Business hours
  business_hours_only: boolean("business_hours_only").default(true),
  business_start: varchar("business_start", { length: 5 }).default("09:00"), // HH:MM format
  business_end: varchar("business_end", { length: 5 }).default("17:00"), // HH:MM format
  business_days: varchar("business_days", { length: 20 }).default("1,2,3,4,5"), // 1=Monday, 7=Sunday
  
  // Status
  is_active: boolean("is_active").default(true),
  
  // Metadata
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// SLA Breaches tracking
export const slaBreaches = pgTable("sla_breaches", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticket_id: uuid("ticket_id").notNull(),
  sla_policy_id: uuid("sla_policy_id").notNull(),
  breach_type: varchar("breach_type", { length: 20 }).notNull(), // response, resolution
  target_time: timestamp("target_time").notNull(),
  actual_time: timestamp("actual_time"),
  breach_duration: integer("breach_duration"), // minutes over SLA
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type SLAPolicy = typeof slaPolicies.$inferSelect;
export type NewSLAPolicy = typeof slaPolicies.$inferInsert;
export type SLABreach = typeof slaBreaches.$inferSelect;
export type NewSLABreach = typeof slaBreaches.$inferInsert;
