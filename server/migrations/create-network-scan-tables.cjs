
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { sql } = require('drizzle-orm');

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL?.trim();

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("aivencloud.com") ? { rejectUnauthorized: false } : false
});

const db = drizzle(pool);

async function createNetworkScanTables() {
  try {
    console.log('Creating network scan tables...');

    // Create network_scan_sessions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS network_scan_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(100) NOT NULL UNIQUE,
        initiated_by VARCHAR(255) NOT NULL,
        started_at TIMESTAMP DEFAULT NOW() NOT NULL,
        completed_at TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'running',
        total_discovered DECIMAL(10,0) DEFAULT 0,
        subnets_scanned JSONB DEFAULT '[]'::jsonb,
        scanning_agents JSONB DEFAULT '[]'::jsonb,
        scan_config JSONB DEFAULT '{}'::jsonb,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create network_scan_results table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS network_scan_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(100) NOT NULL,
        device_id VARCHAR(100),
        ip_address VARCHAR(45) NOT NULL,
        hostname VARCHAR(255),
        os VARCHAR(100),
        mac_address VARCHAR(17),
        status VARCHAR(20) NOT NULL,
        last_seen TIMESTAMP NOT NULL,
        subnet VARCHAR(50) NOT NULL,
        device_type VARCHAR(100),
        ports_open JSONB DEFAULT '[]'::jsonb,
        response_time DECIMAL(10,2),
        discovery_method VARCHAR(50),
        agent_id VARCHAR(100),
        scan_metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create network_topology table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS network_topology (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_device_id VARCHAR(100) NOT NULL,
        target_ip VARCHAR(45) NOT NULL,
        target_hostname VARCHAR(255),
        connection_type VARCHAR(50),
        hop_count DECIMAL(3,0) DEFAULT 1,
        latency_ms DECIMAL(10,2),
        discovered_at TIMESTAMP DEFAULT NOW() NOT NULL,
        last_verified TIMESTAMP DEFAULT NOW() NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL
      )
    `);

    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_network_scan_sessions_session_id 
      ON network_scan_sessions(session_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_network_scan_results_session_id 
      ON network_scan_results(session_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_network_scan_results_ip_address 
      ON network_scan_results(ip_address)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_network_topology_source_device 
      ON network_topology(source_device_id)
    `);

    console.log('Network scan tables created successfully!');
    
  } catch (error) {
    console.error('Error creating network scan tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createNetworkScanTables().catch(console.error);
