
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('aivencloud.com') ? {
    rejectUnauthorized: false,
  } : false,
});

async function createPatchIndexes() {
  try {
    console.log('🔍 Creating database indexes for patch compliance...');

    // Create indexes for better query performance
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_device_patch_status_device_id ON device_patch_status(device_id);`,
      `CREATE INDEX IF NOT EXISTS idx_device_patch_status_patch_id ON device_patch_status(patch_id);`,
      `CREATE INDEX IF NOT EXISTS idx_device_patch_status_status ON device_patch_status(status);`,
      `CREATE INDEX IF NOT EXISTS idx_device_patch_status_device_status ON device_patch_status(device_id, status);`,
      `CREATE INDEX IF NOT EXISTS idx_patch_definitions_severity ON patch_definitions(severity);`,
      `CREATE INDEX IF NOT EXISTS idx_patch_definitions_category ON patch_definitions(category);`,
      `CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);`,
      `CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);`
    ];

    for (const indexQuery of indexes) {
      console.log(`Creating index: ${indexQuery}`);
      await pool.query(indexQuery);
    }

    console.log('✅ All patch compliance indexes created successfully!');

    // Test a query to make sure it works
    console.log('🧪 Testing query performance...');
    const result = await pool.query(`
      SELECT COUNT(*) as total_devices 
      FROM devices 
      WHERE status = 'online'
    `);
    console.log(`Found ${result.rows[0].total_devices} online devices`);

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    console.error('Error details:', error.message);
  } finally {
    await pool.end();
  }
}

createPatchIndexes();
