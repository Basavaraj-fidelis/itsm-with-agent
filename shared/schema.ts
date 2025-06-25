import { pgTable, text, serial, timestamp, json, numeric, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export const usb_devices = pgTable("usb_devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  device_id: uuid("device_id").references(() => devices.id).notNull(),
  device_identifier: text("device_identifier").notNull(), // device_id or vid:pid combo
  description: text("description"),
  vendor_id: text("vendor_id"),
  product_id: text("product_id"),
  manufacturer: text("manufacturer"),
  serial_number: text("serial_number"),
  device_class: text("device_class"),
  location: text("location"),
  speed: text("speed"),
  first_seen: timestamp("first_seen").defaultNow(),
  last_seen: timestamp("last_seen").defaultNow(),
  is_connected: boolean("is_connected").default(true),
  raw_data: json("raw_data")
});

// Report data schema (from agent)
export const reportDataSchema = z.object({
  hardware: z.record(z.any()).optional(),
  storage: z.record(z.any()).optional(),
  network: z.record(z.any()).optional(),
  software: z.array(z.record(z.any())).optional(),
  processes: z.array(z.record(z.any())).optional(),
  usb_devices: z.array(z.record(z.any())).optional(),
  os_info: z.record(z.any()).optional(),
  system_health: z.record(z.any()).optional()
});

export const deviceReportRequestSchema = z.object({
  hostname: z.string(),
  assigned_user: z.string().optional(),
  data: reportDataSchema.optional(),
  // Allow direct fields at root level (flexible format)
  hardware: z.record(z.any()).optional(),
  storage: z.record(z.any()).optional(),
  network: z.record(z.any()).optional(),
  software: z.array(z.record(z.any())).optional(),
  processes: z.array(z.record(z.any())).optional(),
  usb_devices: z.array(z.record(z.any())).optional(),
  os_info: z.record(z.any()).optional(),
  system_health: z.record(z.any()).optional()
}).passthrough(); // Allow any additional fields

// Insert schemas
export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const insertDeviceReportSchema = createInsertSchema(device_reports).omit({
  id: true,
  collected_at: true
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  triggered_at: true
});

// Types
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type DeviceReport = typeof device_reports.$inferSelect;
export type InsertDeviceReport = z.infer<typeof insertDeviceReportSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type DeviceReportRequest = z.infer<typeof deviceReportRequestSchema>;

// Additional tables needed for analytics
export const installed_software = pgTable("installed_software", {
  id: uuid("id").primaryKey().defaultRandom(),
  device_id: uuid("device_id").references(() => devices.id).notNull(),
  name: text("name").notNull(),
  version: text("version"),
  publisher: text("publisher"),
  install_date: timestamp("install_date"),
  license_key: text("license_key"),
  category: text("category"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

export const patch_management = pgTable("patch_management", {
  id: uuid("id").primaryKey().defaultRandom(),
  device_id: uuid("device_id").references(() => devices.id).notNull(),
  patch_id: text("patch_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  severity: text("severity").notNull(),
  install_date: timestamp("install_date"),
  status: text("status").default("pending"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

export const user_sessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  device_id: uuid("device_id").references(() => devices.id),
  session_start: timestamp("session_start").defaultNow(),
  session_end: timestamp("session_end"),
  duration_minutes: numeric("duration_minutes"),
  created_at: timestamp("created_at").defaultNow()
});
