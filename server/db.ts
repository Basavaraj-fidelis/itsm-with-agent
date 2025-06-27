import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "@shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in environment variables");
  console.log("📋 Available environment variables:", Object.keys(process.env).filter(key => key.includes('DATABASE')));
  throw new Error(
    "DATABASE_URL must be set. Please provision a PostgreSQL database in Replit.",
  );
}

console.log("🔗 Using database URL:", DATABASE_URL.replace(/:[^:@]*@/, ':***@')); // Hide password in logs

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('aivencloud.com') ? {
    rejectUnauthorized: false,
  } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  query_timeout: 5000,
  statement_timeout: 5000,
  max: 10,
  application_name: 'itsm-patch-compliance',
});

export const db = drizzle(pool, { schema });

export { sql };
