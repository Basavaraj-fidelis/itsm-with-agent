
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('🔗 Testing database connection for patch compliance...');
console.log('Database URL pattern:', DATABASE_URL.replace(/:[^:@]*@/, ':***@'));

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('aivencloud.com') ? {
    rejectUnauthorized: false,
  } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

async function testPatchTables() {
  let client;
  try {
    console.log('📊 Connecting to database...');
    client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test patch tables
    console.log('\n📋 Testing patch compliance tables...');
    
    const deviceCount = await client.query('SELECT COUNT(*) as count FROM devices');
    console.log(`✅ Devices table: ${deviceCount.rows[0].count} records`);
    
    try {
      const patchDefCount = await client.query('SELECT COUNT(*) as count FROM patch_definitions');
      console.log(`✅ Patch definitions table: ${patchDefCount.rows[0].count} records`);
    } catch (err) {
      console.log('❌ Patch definitions table not found:', err.message);
    }
    
    try {
      const patchStatusCount = await client.query('SELECT COUNT(*) as count FROM device_patch_status');
      console.log(`✅ Device patch status table: ${patchStatusCount.rows[0].count} records`);
    } catch (err) {
      console.log('❌ Device patch status table not found:', err.message);
    }
    
    // Test a simple join query (similar to what patch service does)
    try {
      const joinQuery = await client.query(`
        SELECT 
          d.id, d.hostname,
          COUNT(dps.patch_id) as patch_count
        FROM devices d
        LEFT JOIN device_patch_status dps ON d.id = dps.device_id
        WHERE d.status = 'online'
        GROUP BY d.id, d.hostname
        LIMIT 5
      `);
      console.log(`✅ Join query successful: ${joinQuery.rows.length} devices with patch data`);
      joinQuery.rows.forEach(row => {
        console.log(`   - ${row.hostname}: ${row.patch_count} patches`);
      });
    } catch (err) {
      console.log('❌ Join query failed:', err.message);
    }
    
    console.log('\n🎉 All database tests completed!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔍 Error code:', error.code);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Suggestion: Check if DATABASE_URL is correct');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 Suggestion: Check network connectivity');
    } else if (error.message.includes('ssl')) {
      console.log('💡 Suggestion: SSL configuration issue');
    } else if (error.message.includes('timeout')) {
      console.log('💡 Suggestion: Database is slow or connection pooling issue');
    }
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

testPatchTables();
