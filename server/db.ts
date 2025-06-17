import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "@shared/schema";

// Use your specific PostgreSQL database URL
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb?sslmode=require";

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

import { readFileSync } from 'fs';
import { join } from 'path';

let sslConfig = false;
if (!DATABASE_URL.includes('localhost') && !DATABASE_URL.includes('127.0.0.1')) {
  try {
    const caCert = readFileSync(join(process.cwd(), 'attached_assets', 'ca_1750140881112.pem'));
    sslConfig = {
      rejectUnauthorized: true,
      ca: caCert,
    };
  } catch (error) {
    console.log('CA certificate not found, using fallback SSL config');
    sslConfig = {
      rejectUnauthorized: false,
      requestCert: false,
      agent: false
    };
  }
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: sslConfig,
});

export const db = drizzle(pool, { schema });

export { sql };
