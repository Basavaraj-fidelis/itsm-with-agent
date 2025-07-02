
import { pgTable, text, timestamp, uuid, varchar, boolean, integer } from "drizzle-orm/pg-core";

// Known Errors database
export const knownErrors = pgTable("known_errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  problem_ticket_id: uuid("problem_ticket_id").notNull(),
  error_code: varchar("error_code", { length: 50 }).unique(),
  symptoms: text("symptoms").notNull(),
  root_cause: text("root_cause").notNull(),
  workaround: text("workaround"),
  permanent_fix: text("permanent_fix"),
  affected_cis: text("affected_cis"), // Configuration Items
  frequency: varchar("frequency", { length: 20 }), // rare, occasional, frequent, constant
  business_impact: varchar("business_impact", { length: 20 }),
  fix_priority: varchar("fix_priority", { length: 20 }),
  status: varchar("status", { length: 20 }).default("active"), // active, resolved, obsolete
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Incident-Problem relationships
export const incidentProblemLinks = pgTable("incident_problem_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  incident_ticket_id: uuid("incident_ticket_id").notNull(),
  problem_ticket_id: uuid("problem_ticket_id").notNull(),
  relationship_type: varchar("relationship_type", { length: 20 }).notNull(), // caused_by, related_to, duplicate_of
  confidence_level: varchar("confidence_level", { length: 20 }), // low, medium, high, confirmed
  created_by: uuid("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type KnownError = typeof knownErrors.$inferSelect;
export type NewKnownError = typeof knownErrors.$inferInsert;
export type IncidentProblemLink = typeof incidentProblemLinks.$inferSelect;
export type NewIncidentProblemLink = typeof incidentProblemLinks.$inferInsert;
