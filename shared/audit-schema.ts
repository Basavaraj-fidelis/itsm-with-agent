
import { pgTable, text, timestamp, uuid, varchar, json } from "drizzle-orm/pg-core";

// Audit trails for all system changes
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  table_name: varchar("table_name", { length: 100 }).notNull(),
  record_id: uuid("record_id").notNull(),
  operation: varchar("operation", { length: 10 }).notNull(), // INSERT, UPDATE, DELETE
  user_id: uuid("user_id"),
  session_id: uuid("session_id"),
  ip_address: varchar("ip_address", { length: 45 }),
  user_agent: text("user_agent"),
  old_values: json("old_values").$type<Record<string, any>>(),
  new_values: json("new_values").$type<Record<string, any>>(),
  changed_fields: json("changed_fields").$type<string[]>().default([]),
  reason: text("reason"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Compliance tracking
export const complianceRequirements = pgTable("compliance_requirements", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  framework: varchar("framework", { length: 100 }), // SOX, GDPR, HIPAA, ISO27001
  requirement_id: varchar("requirement_id", { length: 50 }),
  description: text("description"),
  control_type: varchar("control_type", { length: 50 }), // preventive, detective, corrective
  frequency: varchar("frequency", { length: 20 }), // daily, weekly, monthly, quarterly, annually
  owner_id: uuid("owner_id"),
  next_review_date: timestamp("next_review_date"),
  status: varchar("status", { length: 20 }).default("active"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type ComplianceRequirement = typeof complianceRequirements.$inferSelect;
export type NewComplianceRequirement = typeof complianceRequirements.$inferInsert;
