
import { Pool } from 'pg';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function populatePatchData() {
  let client;
  try {
    console.log('🔗 Connecting to database...');
    client = await pool.connect();
    console.log('✅ Database connection successful!');

    // Get online devices
    const devicesResult = await client.query(`
      SELECT id, hostname FROM devices WHERE status = 'online'
    `);
    
    const devices = devicesResult.rows;
    console.log(`📱 Found ${devices.length} online devices`);

    if (devices.length === 0) {
      console.log('❌ No online devices found. Cannot populate patch data.');
      return;
    }

    // Clear existing patch data
    console.log('🧹 Clearing existing patch data...');
    await client.query('DELETE FROM device_patch_status');
    await client.query('DELETE FROM patch_definitions');

    // Insert comprehensive patch definitions
    console.log('📋 Inserting patch definitions...');
    const patches = [
      // Critical Security Patches
      { id: 'KB5032190', title: 'Security Update for Windows 10 Version 22H2 (KB5032190)', severity: 'critical', category: 'security_update', reboot: true },
      { id: 'KB5031455', title: 'Security Update for .NET Framework (KB5031455)', severity: 'critical', category: 'security_update', reboot: false },
      { id: 'KB5032189', title: 'Cumulative Security Update for Microsoft Edge (KB5032189)', severity: 'critical', category: 'security_update', reboot: false },
      { id: 'KB5031354', title: 'Security Update for Windows Defender (KB5031354)', severity: 'critical', category: 'security_update', reboot: false },
      { id: 'KB5032007', title: 'Security Update for Remote Desktop Client (KB5032007)', severity: 'critical', category: 'security_update', reboot: true },
      
      // Important Security Patches
      { id: 'KB5031361', title: 'Security Update for Windows Media Player (KB5031361)', severity: 'important', category: 'security_update', reboot: false },
      { id: 'KB5032008', title: 'Security Update for Internet Explorer (KB5032008)', severity: 'important', category: 'security_update', reboot: true },
      { id: 'KB5031358', title: 'Security Update for Windows PowerShell (KB5031358)', severity: 'important', category: 'security_update', reboot: false },
      
      // Application Updates
      { id: 'OFF2021-20231114', title: 'Microsoft Office 2021 Security Update - November 2023', severity: 'important', category: 'application_update', reboot: false },
      { id: 'TEAMS-1.6.00', title: 'Microsoft Teams Desktop App Update v1.6.00', severity: 'moderate', category: 'application_update', reboot: false },
      { id: 'OUTLOOK-16.0.16827', title: 'Microsoft Outlook Security Update 16.0.16827', severity: 'important', category: 'application_update', reboot: false },
      { id: 'EXCEL-16.0.16827', title: 'Microsoft Excel Feature Update 16.0.16827', severity: 'low', category: 'application_update', reboot: false },
      
      // Windows Updates
      { id: 'KB5032288', title: 'Windows 10 Feature Update 22H2', severity: 'moderate', category: 'windows_update', reboot: true },
      { id: 'KB5032006', title: 'Windows Update for Windows Subsystem for Linux', severity: 'low', category: 'windows_update', reboot: false },
      { id: 'KB5031362', title: 'Windows 10 Quality Update - November 2023', severity: 'moderate', category: 'windows_update', reboot: true }
    ];

    for (const patch of patches) {
      await client.query(`
        INSERT INTO patch_definitions (patch_id, title, severity, category, requires_reboot, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (patch_id) DO NOTHING
      `, [
        patch.id,
        patch.title,
        patch.severity,
        patch.category,
        patch.reboot,
        `${patch.title} - Auto-generated patch definition`
      ]);
    }

    console.log(`✅ Inserted ${patches.length} patch definitions`);

    // Insert patch status for each device
    console.log('💾 Inserting device patch status...');
    let totalPatches = 0;

    for (const device of devices) {
      console.log(`Processing patches for device: ${device.hostname}`);
      
      for (const patch of patches) {
        // Simulate realistic patch status distribution
        let status = 'installed';
        let installDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within last 30 days
        
        // Some patches are missing based on category and severity
        if (patch.category === 'application_update' && Math.random() < 0.3) {
          status = 'missing';
          installDate = null;
        } else if (patch.severity === 'critical' && Math.random() < 0.1) {
          status = 'missing';
          installDate = null;
        } else if (patch.severity === 'important' && Math.random() < 0.15) {
          status = 'missing';
          installDate = null;
        } else if (Math.random() < 0.05) {
          status = 'failed';
          installDate = null;
        }

        await client.query(`
          INSERT INTO device_patch_status (device_id, patch_id, status, install_date, last_scan_date)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (device_id, patch_id) DO UPDATE SET
            status = EXCLUDED.status,
            install_date = EXCLUDED.install_date,
            last_scan_date = NOW()
        `, [device.id, patch.id, status, installDate]);

        totalPatches++;
      }
    }

    console.log(`✅ Inserted ${totalPatches} device patch records`);

    // Verify the data
    console.log('\n📊 Verifying patch data...');
    
    const summary = await client.query(`
      SELECT 
        COUNT(DISTINCT d.id) as total_devices,
        COUNT(dps.*) as total_patch_records,
        COUNT(CASE WHEN dps.status = 'installed' THEN 1 END) as installed_count,
        COUNT(CASE WHEN dps.status = 'missing' THEN 1 END) as missing_count,
        COUNT(CASE WHEN dps.status = 'failed' THEN 1 END) as failed_count
      FROM devices d
      LEFT JOIN device_patch_status dps ON d.id = dps.device_id
      WHERE d.status = 'online'
    `);

    const stats = summary.rows[0];
    console.log(`✅ Summary:`);
    console.log(`   • Devices: ${stats.total_devices}`);
    console.log(`   • Total patch records: ${stats.total_patch_records}`);
    console.log(`   • Installed: ${stats.installed_count}`);
    console.log(`   • Missing: ${stats.missing_count}`);
    console.log(`   • Failed: ${stats.failed_count}`);

    const compliance = ((stats.installed_count / stats.total_patch_records) * 100).toFixed(1);
    console.log(`   • Overall compliance: ${compliance}%`);

    console.log('\n🎉 Patch data population completed successfully!');

  } catch (error) {
    console.error('❌ Error populating patch data:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

populatePatchData().catch(console.error);
