
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb?sslmode=require";

let sslConfig = false;
if (!DATABASE_URL.includes('localhost') && !DATABASE_URL.includes('127.0.0.1')) {
  try {
    const caCert = fs.readFileSync(path.join(process.cwd(), 'attached_assets', 'ca_1750140881112.pem'));
    sslConfig = {
      rejectUnauthorized: true,
      ca: caCert,
    };
    console.log('📋 Using CA certificate for secure connection');
  } catch (error) {
    console.log('⚠️  CA certificate not found, using fallback SSL config');
    sslConfig = {
      rejectUnauthorized: false,
      requestCert: false,
      agent: false
    };
  }
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: sslConfig,
});

async function testConnection() {
  try {
    console.log('🔗 Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, COUNT(*) as user_count FROM users');
    console.log('✅ Database connection successful!');
    console.log('📊 Current time:', result.rows[0].current_time);
    console.log('👥 User count:', result.rows[0].user_count);
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔍 Error code:', error.code);
    process.exit(1);
  }
}

testConnection();
