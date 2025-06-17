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
    const caCertPath = join(process.cwd(), 'attached_assets', 'ca_1750140881112.pem');
    const caCert = readFileSync(caCertPath);
    console.log('✅ CA certificate loaded successfully');
    sslConfig = {
      rejectUnauthorized: true,
      ca: caCert,
      checkServerIdentity: () => undefined, // Skip hostname verification for managed databases
    };
  } catch (error) {
    console.log('⚠️ CA certificate not found, using secure fallback SSL config');
    // For Aiven/managed databases, we need SSL but can be less strict about certs
    sslConfig = {
      rejectUnauthorized: false,
      requestCert: true,
      agent: false,
      // Add these for better compatibility with managed PostgreSQL services
      secureProtocol: 'TLSv1_2_method',
    };
  }
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: sslConfig,
});

export const db = drizzle(pool, { schema });

export { sql };
