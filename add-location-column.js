
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addLocationColumns() {
  try {
    console.log('Adding location columns to device_reports table...');
    
    // Add location columns to device_reports table
    await pool.query(`
      ALTER TABLE device_reports 
      ADD COLUMN IF NOT EXISTS location_data JSONB,
      ADD COLUMN IF NOT EXISTS public_ip TEXT,
      ADD COLUMN IF NOT EXISTS location_city TEXT,
      ADD COLUMN IF NOT EXISTS location_country TEXT,
      ADD COLUMN IF NOT EXISTS location_coordinates TEXT;
    `);
    
    console.log('✅ Location columns added successfully');
    
    // Create index for faster location queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_device_reports_location_city 
      ON device_reports(location_city);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_device_reports_public_ip 
      ON device_reports(public_ip);
    `);
    
    console.log('✅ Location indexes created successfully');
    
  } catch (error) {
    console.error('❌ Error adding location columns:', error);
  } finally {
    await pool.end();
  }
}

addLocationColumns();
