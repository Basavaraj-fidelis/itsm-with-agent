
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('aivencloud.com') ? {
    rejectUnauthorized: false,
  } : false,
});

async function debugPatchQueries() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging patch compliance queries...');
    
    // Check devices
    console.log('\n📱 Checking devices...');
    const devicesResult = await client.query(`
      SELECT id, hostname, status, last_seen 
      FROM devices 
      ORDER BY last_seen DESC 
      LIMIT 5
    `);
    console.log(`Found ${devicesResult.rows.length} devices:`);
    devicesResult.rows.forEach(d => {
      console.log(`  - ${d.hostname} (${d.id}) - ${d.status}`);
    });
    
    // Check patch definitions
    console.log('\n📋 Checking patch definitions...');
    const patchDefsResult = await client.query(`
      SELECT COUNT(*) as count, severity, category
      FROM patch_definitions 
      GROUP BY severity, category
      ORDER BY severity, category
    `);
    console.log('Patch definitions by category:');
    patchDefsResult.rows.forEach(p => {
      console.log(`  - ${p.category} (${p.severity}): ${p.count} patches`);
    });
    
    // Check device patch status
    console.log('\n🔧 Checking device patch status...');
    const statusResult = await client.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT device_id) as unique_devices,
        COUNT(DISTINCT patch_id) as unique_patches,
        status,
        COUNT(*) as count
      FROM device_patch_status 
      GROUP BY status
      ORDER BY status
    `);
    console.log('Patch status distribution:');
    statusResult.rows.forEach(s => {
      console.log(`  - ${s.status}: ${s.count} records`);
    });
    
    // Test the actual query from the service
    if (devicesResult.rows.length > 0) {
      const testDevice = devicesResult.rows[0];
      console.log(`\n🧪 Testing query for device: ${testDevice.hostname} (${testDevice.id})`);
      
      const testResult = await client.query(`
        SELECT 
          COUNT(*) as total_patches,
          COUNT(CASE WHEN dps.status = 'installed' THEN 1 END) as installed_patches,
          COUNT(CASE WHEN dps.status = 'missing' AND COALESCE(pd.severity, 'moderate') = 'critical' THEN 1 END) as missing_critical,
          COUNT(CASE WHEN dps.status = 'missing' AND COALESCE(pd.severity, 'moderate') = 'important' THEN 1 END) as missing_important,
          COUNT(CASE WHEN dps.status = 'failed' THEN 1 END) as failed_patches,
          MAX(dps.last_scan_date) as last_scan
        FROM device_patch_status dps
        LEFT JOIN patch_definitions pd ON dps.patch_id = pd.patch_id
        WHERE dps.device_id = $1
      `, [testDevice.id]);
      
      const stats = testResult.rows[0];
      console.log('Query results:');
      console.log(`  - Total patches: ${stats.total_patches}`);
      console.log(`  - Installed: ${stats.installed_patches}`);
      console.log(`  - Missing critical: ${stats.missing_critical}`);
      console.log(`  - Missing important: ${stats.missing_important}`);
      console.log(`  - Failed: ${stats.failed_patches}`);
      console.log(`  - Last scan: ${stats.last_scan}`);
      
      if (stats.total_patches == 0) {
        console.log('\n❌ No patch records found for this device!');
        console.log('This explains why the dashboard shows all zeros.');
        
        // Check if patch data exists at all
        const anyPatchData = await client.query(`
          SELECT COUNT(*) as count FROM device_patch_status WHERE device_id = $1
        `, [testDevice.id]);
        
        console.log(`Device has ${anyPatchData.rows[0].count} patch records total.`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging queries:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

debugPatchQueries();
