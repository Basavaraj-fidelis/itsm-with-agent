
import { pgTable, text, timestamp, uuid, varchar, boolean, integer, json } from "drizzle-orm/pg-core";

// User roles enum
export const userRoles = ["admin", "technician", "end_user", "manager"] as const;

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  username: varchar("username", { length: 100 }).unique().notNull(),
  first_name: varchar("first_name", { length: 100 }),
  last_name: varchar("last_name", { length: 100 }),
  password_hash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("end_user"),
  department_id: uuid("department_id"),
  manager_id: uuid("manager_id"),
  phone: varchar("phone", { length: 20 }),
  employee_id: varchar("employee_id", { length: 50 }),
  job_title: varchar("job_title", { length: 100 }),
  location: varchar("location", { length: 100 }),
  profile_picture: text("profile_picture"),
  permissions: json("permissions").$type<string[]>().default([]),
  preferences: json("preferences").$type<Record<string, any>>().default({}),
  is_active: boolean("is_active").default(true),
  is_locked: boolean("is_locked").default(false),
  password_reset_required: boolean("password_reset_required").default(false),
  failed_login_attempts: integer("failed_login_attempts").default(0),
  last_login: timestamp("last_login"),
  last_password_change: timestamp("last_password_change"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Departments table
export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  manager_id: uuid("manager_id"),
  budget: integer("budget"),
  cost_center: varchar("cost_center", { length: 50 }),
  location: varchar("location", { length: 100 }),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// User sessions table
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// User activity tracking
export const userActivity = pgTable("user_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => users.id),
  activity_type: varchar("activity_type", { length: 50 }).notNull(), // login, logout, password_change, etc.
  description: text("description"),
  ip_address: varchar("ip_address", { length: 45 }),
  user_agent: text("user_agent"),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
