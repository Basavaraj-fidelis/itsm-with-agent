
import { pgTable, text, timestamp, uuid, varchar, boolean, integer, json } from "drizzle-orm/pg-core";

// Change Advisory Board
export const changeAdvisoryBoard = pgTable("change_advisory_board", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  chairperson_id: uuid("chairperson_id").notNull(),
  members: json("members").$type<string[]>().default([]),
  meeting_frequency: varchar("meeting_frequency", { length: 50 }),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Change Windows (maintenance windows)
export const changeWindows = pgTable("change_windows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  window_type: varchar("window_type", { length: 20 }).notNull(), // standard, emergency, maintenance
  start_time: varchar("start_time", { length: 5 }).notNull(), // HH:MM
  end_time: varchar("end_time", { length: 5 }).notNull(), // HH:MM
  days_of_week: varchar("days_of_week", { length: 20 }).notNull(), // 1,2,3,4,5
  blackout_dates: json("blackout_dates").$type<string[]>().default([]),
  approval_required: boolean("approval_required").default(true),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Release Management
export const releases = pgTable("releases", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  description: text("description"),
  release_type: varchar("release_type", { length: 20 }).notNull(), // major, minor, patch, hotfix
  planned_date: timestamp("planned_date"),
  actual_date: timestamp("actual_date"),
  status: varchar("status", { length: 20 }).default("planned"), // planned, in_progress, completed, cancelled
  release_manager_id: uuid("release_manager_id").notNull(),
  environment: varchar("environment", { length: 50 }), // dev, test, staging, production
  rollback_plan: text("rollback_plan"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Change Impact Assessment
export const changeImpactAssessment = pgTable("change_impact_assessment", {
  id: uuid("id").primaryKey().defaultRandom(),
  change_ticket_id: uuid("change_ticket_id").notNull(),
  affected_systems: json("affected_systems").$type<string[]>().default([]),
  affected_users_count: integer("affected_users_count").default(0),
  business_impact: varchar("business_impact", { length: 20 }).notNull(),
  technical_complexity: varchar("technical_complexity", { length: 20 }).notNull(),
  estimated_effort_hours: integer("estimated_effort_hours"),
  resource_requirements: json("resource_requirements").$type<Record<string, any>>().default({}),
  dependencies: json("dependencies").$type<string[]>().default([]),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type ChangeAdvisoryBoard = typeof changeAdvisoryBoard.$inferSelect;
export type NewChangeAdvisoryBoard = typeof changeAdvisoryBoard.$inferInsert;
export type ChangeWindow = typeof changeWindows.$inferSelect;
export type NewChangeWindow = typeof changeWindows.$inferInsert;
export type Release = typeof releases.$inferSelect;
export type NewRelease = typeof releases.$inferInsert;
export type ChangeImpactAssessment = typeof changeImpactAssessment.$inferSelect;
export type NewChangeImpactAssessment = typeof changeImpactAssessment.$inferInsert;
