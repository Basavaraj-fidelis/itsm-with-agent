
import { pgTable, text, serial, timestamp, json, numeric, uuid, boolean, varchar, jsonb, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Core system tables
export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostname: text("hostname").notNull().unique(),
  assigned_user: text("assigned_user"),
  os_name: text("os_name"),
  os_version: text("os_version"),
  ip_address: text("ip_address"),
  status: text("status").default("offline"),
  last_seen: timestamp("last_seen"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

export const device_reports = pgTable("device_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  device_id: uuid("device_id").references(() => devices.id).notNull(),
  collected_at: timestamp("collected_at").defaultNow(),
  cpu_usage: numeric("cpu_usage"),
  memory_usage: numeric("memory_usage"),
  disk_usage: numeric("disk_usage"),
  network_io: numeric("network_io"),
  raw_data: json("raw_data").notNull()
});

// User management
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  password_hash: varchar("password_hash", { length: 255 }),
  department: varchar("department", { length: 100 }),
  manager_email: varchar("manager_email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  location: varchar("location", { length: 100 }),
  is_active: boolean("is_active").default(true),
  last_login: timestamp("last_login"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// Ticket management
export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticket_number: varchar("ticket_number", { length: 50 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("new"),
  priority: varchar("priority", { length: 50 }).notNull().default("medium"),
  category: varchar("category", { length: 100 }),
  requester_email: varchar("requester_email", { length: 255 }).notNull(),
  assigned_to: varchar("assigned_to", { length: 255 }),
  impact: varchar("impact", { length: 50 }),
  urgency: varchar("urgency", { length: 50 }),
  due_date: timestamp("due_date"),
  resolved_at: timestamp("resolved_at"),
  closed_at: timestamp("closed_at"),
  sla_response_due: timestamp("sla_response_due"),
  sla_resolution_due: timestamp("sla_resolution_due"),
  sla_breached: boolean("sla_breached").default(false),
  first_response_at: timestamp("first_response_at"),
  tags: jsonb("tags").default([]),
  metadata: jsonb("metadata").default({}),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// Alerts and monitoring
export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  device_id: uuid("device_id").references(() => devices.id).notNull(),
  category: text("category").notNull(),
  severity: text("severity").notNull(),
  message: text("message").notNull(),
  metadata: json("metadata"),
  triggered_at: timestamp("triggered_at").defaultNow(),
  resolved_at: timestamp("resolved_at"),
  is_active: boolean("is_active").default(true)
});

// Knowledge base
export const knowledge_articles = pgTable("knowledge_articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  tags: jsonb("tags").default([]),
  author_email: varchar("author_email", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("draft"),
  view_count: integer("view_count").default(0),
  helpful_count: integer("helpful_count").default(0),
  not_helpful_count: integer("not_helpful_count").default(0),
  is_public: boolean("is_public").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// SLA management
export const sla_policies = pgTable("sla_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  ticket_type: varchar("ticket_type", { length: 50 }),
  priority: varchar("priority", { length: 50 }),
  response_time_minutes: integer("response_time_minutes").notNull(),
  resolution_time_minutes: integer("resolution_time_minutes").notNull(),
  business_hours_only: boolean("business_hours_only").default(true),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// Common schemas and types
export const ticketStatusEnum = z.enum([
  "new", "assigned", "in_progress", "pending", "on_hold", 
  "resolved", "closed", "cancelled"
]);

export const priorityEnum = z.enum(["low", "medium", "high", "critical"]);

export const ticketTypeEnum = z.enum(["request", "incident", "problem", "change"]);

export const userRoleEnum = z.enum([
  "user", "technician", "senior_technician", "manager", "admin"
]);

// Insert schemas
export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  ticket_number: true,
  created_at: true,
  updated_at: true
});

// Types
export type Device = typeof devices.$inferSelect;
export type User = typeof users.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type KnowledgeArticle = typeof knowledge_articles.$inferSelect;
export type SLAPolicy = typeof sla_policies.$inferSelect;

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
