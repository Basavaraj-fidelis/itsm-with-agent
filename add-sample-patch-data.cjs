
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function addSamplePatchData() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding sample patch data...');
    
    // Get first few devices
    const devicesResult = await client.query(`
      SELECT id, hostname FROM devices LIMIT 5
    `);
    
    if (devicesResult.rows.length === 0) {
      console.log('❌ No devices found. Please add some devices first.');
      return;
    }
    
    console.log(`📊 Found ${devicesResult.rows.length} devices`);
    
    // Sample patch definitions
    const patches = [
      {
        patch_id: 'KB5034441',
        title: 'Security Update for Windows 10 Version 22H2',
        severity: 'critical',
        category: 'security_update',
        requires_reboot: true
      },
      {
        patch_id: 'KB5034763',
        title: 'Cumulative Update for Windows 10',
        severity: 'important',
        category: 'windows_update',
        requires_reboot: true
      },
      {
        patch_id: 'OFF365-2024-01',
        title: 'Microsoft Office 365 Security Update',
        severity: 'critical',
        category: 'application_update',
        requires_reboot: false
      },
      {
        patch_id: 'EDGE-2024-01',
        title: 'Microsoft Edge Browser Update',
        severity: 'moderate',
        category: 'application_update',
        requires_reboot: false
      },
      {
        patch_id: 'NET-2024-01',
        title: '.NET Framework Security Update',
        severity: 'important',
        category: 'security_update',
        requires_reboot: true
      }
    ];
    
    // Insert patch definitions
    for (const patch of patches) {
      await client.query(`
        INSERT INTO patch_definitions (patch_id, title, severity, category, requires_reboot)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (patch_id) DO UPDATE SET
          title = EXCLUDED.title,
          severity = EXCLUDED.severity,
          category = EXCLUDED.category,
          requires_reboot = EXCLUDED.requires_reboot,
          updated_at = NOW()
      `, [patch.patch_id, patch.title, patch.severity, patch.category, patch.requires_reboot]);
    }
    
    console.log('✅ Added patch definitions');
    
    // Add patch status for each device
    for (const device of devicesResult.rows) {
      console.log(`📝 Adding patch status for device: ${device.hostname}`);
      
      for (let i = 0; i < patches.length; i++) {
        const patch = patches[i];
        // Simulate some patches installed, some missing
        const statuses = ['installed', 'missing', 'installed', 'missing', 'installed'];
        const status = statuses[i % statuses.length];
        
        await client.query(`
          INSERT INTO device_patch_status (device_id, patch_id, status, last_scan_date, install_date)
          VALUES ($1, $2, $3, NOW(), $4)
          ON CONFLICT (device_id, patch_id) DO UPDATE SET
            status = EXCLUDED.status,
            last_scan_date = NOW(),
            updated_at = NOW()
        `, [
          device.id, 
          patch.patch_id, 
          status, 
          status === 'installed' ? new Date() : null
        ]);
      }
    }
    
    console.log('✅ Added patch status records');
    
    // Verify data
    const patchCount = await client.query('SELECT COUNT(*) FROM patch_definitions');
    const statusCount = await client.query('SELECT COUNT(*) FROM device_patch_status');
    
    console.log(`📊 Total patch definitions: ${patchCount.rows[0].count}`);
    console.log(`📊 Total patch status records: ${statusCount.rows[0].count}`);
    console.log('🎉 Sample patch data added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding sample patch data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addSamplePatchData();
