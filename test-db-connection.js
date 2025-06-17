
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1') ? false : {
    rejectUnauthorized: false, // Accept self-signed certs for Aiven
  },
});

async function testConnection() {
  try {
    console.log('🔗 Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection successful!');
    console.log('📊 Current time:', result.rows[0].current_time);
    console.log('🗄️ PostgreSQL version:', result.rows[0].pg_version);
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔍 Error code:', error.code);
    console.error('🔍 Error details:', error);
    process.exit(1);
  }
}

testConnection();
