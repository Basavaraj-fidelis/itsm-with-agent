
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('aivencloud.com') ? {
    rejectUnauthorized: false,
  } : false,
});

async function testPatchData() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Testing Patch Compliance Data...\n');
    
    // Test devices
    const devicesResult = await client.query(`
      SELECT id, hostname, status, os_name, os_version 
      FROM devices 
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('📱 DEVICES:');
    devicesResult.rows.forEach(device => {
      console.log(`  ${device.hostname} (${device.id}) - ${device.status} - ${device.os_name}`);
    });
    console.log(`Total devices: ${devicesResult.rows.length}\n`);
    
    // Test patch definitions
    const patchDefResult = await client.query(`
      SELECT patch_id, title, severity, category 
      FROM patch_definitions 
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('📋 PATCH DEFINITIONS:');
    patchDefResult.rows.forEach(patch => {
      console.log(`  ${patch.patch_id} - ${patch.title} [${patch.severity}]`);
    });
    console.log(`Total patch definitions: ${patchDefResult.rows.length}\n`);
    
    // Test device patch status
    const patchStatusResult = await client.query(`
      SELECT dps.device_id, d.hostname, dps.patch_id, pd.title, dps.status, pd.severity
      FROM device_patch_status dps
      LEFT JOIN devices d ON dps.device_id = d.id
      LEFT JOIN patch_definitions pd ON dps.patch_id = pd.patch_id
      ORDER BY dps.created_at DESC
      LIMIT 10
    `);
    
    console.log('📊 DEVICE PATCH STATUS:');
    patchStatusResult.rows.forEach(status => {
      console.log(`  ${status.hostname || 'Unknown'} - ${status.patch_id} - ${status.status} [${status.severity || 'unknown'}]`);
    });
    console.log(`Total patch status records: ${patchStatusResult.rows.length}\n`);
    
    // Test summary query (same as service uses)
    if (devicesResult.rows.length > 0) {
      const deviceId = devicesResult.rows[0].id;
      console.log(`🔍 TESTING SUMMARY QUERY FOR DEVICE: ${devicesResult.rows[0].hostname} (${deviceId})`);
      
      const summaryResult = await client.query(`
        SELECT 
          COUNT(*) as total_patches,
          COUNT(CASE WHEN dps.status = 'installed' THEN 1 END) as installed_patches,
          COUNT(CASE WHEN dps.status = 'missing' AND COALESCE(pd.severity, 'moderate') = 'critical' THEN 1 END) as missing_critical,
          COUNT(CASE WHEN dps.status = 'missing' AND COALESCE(pd.severity, 'moderate') = 'important' THEN 1 END) as missing_important,
          COUNT(CASE WHEN dps.status = 'failed' THEN 1 END) as failed_patches,
          MAX(dps.last_scan_date) as last_scan
        FROM device_patch_status dps
        LEFT JOIN patch_definitions pd ON dps.patch_id = pd.patch_id
        WHERE dps.device_id::text = $1
      `, [deviceId]);
      
      console.log('Summary result:', summaryResult.rows[0]);
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing patch data:', error);
    console.error('Error details:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testPatchData();
