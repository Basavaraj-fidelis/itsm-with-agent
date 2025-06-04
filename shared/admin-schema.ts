
import { pgTable, text, serial, timestamp, json, uuid, varchar, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Groups/Teams table for better assignment workflows
export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).default("team"), // team, department, project
  parent_group_id: uuid("parent_group_id").references(() => groups.id),
  manager_id: uuid("manager_id"), // references users.id
  email: varchar("email", { length: 255 }),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// Group memberships
export const groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  group_id: uuid("group_id").references(() => groups.id).notNull(),
  user_id: uuid("user_id").notNull(), // references users.id
  role: varchar("role", { length: 20 }).default("member"), // member, lead, manager
  joined_at: timestamp("joined_at").defaultNow(),
  is_active: boolean("is_active").default(true)
});

// Audit trail for compliance tracking
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  entity_type: varchar("entity_type", { length: 50 }).notNull(), // ticket, user, device, etc.
  entity_id: uuid("entity_id").notNull(),
  action: varchar("action", { length: 20 }).notNull(), // create, update, delete, view
  user_id: uuid("user_id"), // who performed the action
  user_email: varchar("user_email", { length: 255 }),
  old_values: json("old_values"), // previous state
  new_values: json("new_values"), // new state
  changes: json("changes"), // specific field changes
  ip_address: varchar("ip_address", { length: 45 }),
  user_agent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});

// SLA Policies for centralized SLA management
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
  sla_policy_id: uuid("sla_policy_id").references(() => slaPolicies.id).notNull(),
  breach_type: varchar("breach_type", { length: 20 }).notNull(), // response, resolution
  target_time: timestamp("target_time").notNull(),
  actual_time: timestamp("actual_time"),
  breach_duration: integer("breach_duration"), // minutes over SLA
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  joined_at: true
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  timestamp: true
});

export const insertSLAPolicySchema = createInsertSchema(slaPolicies).omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const insertSLABreachSchema = createInsertSchema(slaBreaches).omit({
  id: true,
  created_at: true
});

// Types
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type SLAPolicy = typeof slaPolicies.$inferSelect;
export type InsertSLAPolicy = z.infer<typeof insertSLAPolicySchema>;
export type SLABreach = typeof slaBreaches.$inferSelect;
export type InsertSLABreach = z.infer<typeof insertSLABreachSchema>;
