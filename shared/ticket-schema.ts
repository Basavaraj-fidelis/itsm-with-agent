import { pgTable, text, timestamp, integer, json, uuid, varchar, boolean } from "drizzle-orm/pg-core";

// Ticket types and statuses
export const ticketTypes = ["request", "incident", "problem", "change"] as const;
export const ticketPriorities = ["low", "medium", "high", "critical"] as const;
export const ticketStatuses = ["new", "assigned", "in_progress", "pending", "on_hold", "resolved", "closed", "cancelled"] as const;

// Main tickets table
export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticket_number: varchar("ticket_number", { length: 20 }).unique().notNull(),
  type: varchar("type", { length: 20 }).notNull(), // request, incident, problem, change
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),
  status: varchar("status", { length: 20 }).notNull().default("new"),

  // Assignment
  requester_email: varchar("requester_email", { length: 255 }).notNull(),
  requester_phone: varchar("requester_phone", { length: 20 }),
  requester_name: varchar("requester_name", { length: 255 }),
  assigned_to: varchar("assigned_to", { length: 255 }),
  assigned_group: varchar("assigned_group", { length: 100 }),
  source: varchar("source", { length: 50 }).default("web"), // web, email, phone, portal
  contact_method: varchar("contact_method", { length: 20 }).default("email"), // email, phone, chat

  // Related entities
  device_id: uuid("device_id"),
  related_tickets: json("related_tickets").$type<string[]>().default([]),

  // Workflow specific fields
  impact: varchar("impact", { length: 20 }).default("medium"), // low, medium, high, critical
  urgency: varchar("urgency", { length: 20 }).default("medium"), // low, medium, high, critical
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),

  // Change management specific
  change_type: varchar("change_type", { length: 50 }), // standard, emergency, normal
  risk_level: varchar("risk_level", { length: 20 }), // low, medium, high
  approval_status: varchar("approval_status", { length: 20 }), // pending, approved, rejected
  implementation_plan: text("implementation_plan"),
  rollback_plan: text("rollback_plan"),
  scheduled_start: timestamp("scheduled_start"),
  scheduled_end: timestamp("scheduled_end"),

  // Problem management specific
  root_cause: text("root_cause"),
  workaround: text("workaround"),
  known_error: boolean("known_error").default(false),

  // Metadata
  tags: json("tags").$type<string[]>().default([]),
  custom_fields: json("custom_fields").$type<Record<string, any>>().default({}),
  related_article_ids: json("related_article_ids").$type<string[]>().default([]),

  // SLA fields
  sla_policy_id: uuid("sla_policy_id"), // Reference to SLA policy
  sla_policy: varchar("sla_policy", { length: 100 }),
  sla_response_time: integer("sla_response_time"), // in minutes
  sla_resolution_time: integer("sla_resolution_time"), // in minutes
  sla_response_due: timestamp("sla_response_due"),
  sla_resolution_due: timestamp("sla_resolution_due"),
  response_due_at: timestamp("response_due_at"), // Alternative naming
  resolve_due_at: timestamp("resolve_due_at"), // Alternative naming
  first_response_at: timestamp("first_response_at"),
  resolve_actual_at: timestamp("resolve_actual_at"),
  sla_breached: boolean("sla_breached").default(false),
  sla_response_breached: boolean("sla_response_breached").default(false),
  sla_resolution_breached: boolean("sla_resolution_breached").default(false),
  
  // SLA Pause/Resume tracking
  sla_paused: boolean("sla_paused").default(false),
  sla_pause_reason: text("sla_pause_reason"),
  sla_paused_at: timestamp("sla_paused_at"),
  sla_resumed_at: timestamp("sla_resumed_at"),
  sla_total_paused_time: integer("sla_total_paused_time").default(0), // in minutes
  
  // SLA Escalation tracking
  escalation_reason: text("escalation_reason"),
  escalation_level: integer("escalation_level").default(0),
  last_escalation_at: timestamp("last_escalation_at"),
  escalated_at: timestamp("escalated_at"), // Alternative naming for compatibility

  // Business Impact
  business_service: varchar("business_service", { length: 100 }),
  affected_users_count: integer("affected_users_count").default(1),
  financial_impact: varchar("financial_impact", { length: 20 }), // low, medium, high, critical
  
  // Closure Information
  closure_code: varchar("closure_code", { length: 50 }),
  closure_notes: text("closure_notes"),
  customer_satisfaction: integer("customer_satisfaction"), // 1-5 rating
  
  // Missing ITSM fields
  escalation_level: integer("escalation_level").default(0),
  escalation_reason: text("escalation_reason"),
  escalated_at: timestamp("escalated_at"),
  time_spent_minutes: integer("time_spent_minutes").default(0),
  billing_code: varchar("billing_code", { length: 50 }),
  external_reference: varchar("external_reference", { length: 100 }),
  vendor_ticket_id: varchar("vendor_ticket_id", { length: 100 }),
  parent_ticket_id: uuid("parent_ticket_id"),
  duplicate_of_ticket_id: uuid("duplicate_of_ticket_id"),
  merged_into_ticket_id: uuid("merged_into_ticket_id"),
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  resolved_at: timestamp("resolved_at"),
  closed_at: timestamp("closed_at"),
  due_date: timestamp("due_date"),
});

// Ticket comments/updates
export const ticketComments = pgTable("ticket_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticket_id: uuid("ticket_id").notNull(),
  author_email: varchar("author_email", { length: 255 }).notNull(),
  comment: text("comment").notNull(),
  is_internal: boolean("is_internal").default(false),
  attachments: json("attachments").$type<string[]>().default([]),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Ticket attachments
export const ticketAttachments = pgTable("ticket_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticket_id: uuid("ticket_id").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  file_size: integer("file_size"),
  mime_type: varchar("mime_type", { length: 100 }),
  uploaded_by: varchar("uploaded_by", { length: 255 }).notNull(),
  uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
});

// Ticket workflow/approval
export const ticketApprovals = pgTable("ticket_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticket_id: uuid("ticket_id").notNull(),
  approver_email: varchar("approver_email", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // pending, approved, rejected
  comments: text("comments"),
  approved_at: timestamp("approved_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Knowledge base articles
export const knowledgeBase = pgTable("knowledge_base", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  tags: json("tags").$type<string[]>().default([]),
  author_email: varchar("author_email", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("draft"), // draft, published, archived
  views: integer("views").default(0),
  helpful_votes: integer("helpful_votes").default(0),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TicketComment = typeof ticketComments.$inferSelect;
export type NewTicketComment = typeof ticketComments.$inferInsert;
export type TicketAttachment = typeof ticketAttachments.$inferSelect;
export type NewTicketAttachment = typeof ticketAttachments.$inferInsert;
export type TicketApproval = typeof ticketApprovals.$inferSelect;
export type NewTicketApproval = typeof ticketApprovals.$inferInsert;
export type KnowledgeBaseArticle = typeof knowledgeBase.$inferSelect;
export type NewKnowledgeBaseArticle = typeof knowledgeBase.$inferInsert;