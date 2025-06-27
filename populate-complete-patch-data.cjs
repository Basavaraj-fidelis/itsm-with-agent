
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('aivencloud.com') ? {
    rejectUnauthorized: false,
  } : false,
});

async function populateCompletePatchData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Populating comprehensive patch compliance data...');
    
    // First, get all existing devices
    const devicesResult = await client.query(`
      SELECT id, hostname FROM devices ORDER BY created_at DESC
    `);
    
    console.log(`Found ${devicesResult.rows.length} devices to populate with patch data`);
    
    if (devicesResult.rows.length === 0) {
      console.log('❌ No devices found! Please ensure devices exist first.');
      return;
    }
    
    // Clear existing patch data to start fresh
    console.log('🧹 Clearing existing patch data...');
    await client.query('DELETE FROM device_patch_status');
    await client.query('DELETE FROM patch_definitions');
    
    // Insert comprehensive patch definitions
    console.log('📋 Creating patch definitions...');
    const patches = [
      // Critical Security Patches
      {
        patch_id: 'KB5021233',
        title: 'Security Update for Windows 10 Version 22H2 (KB5021233)',
        description: 'This security update includes quality improvements. Key changes include: Addresses security vulnerabilities in Windows Kernel, Remote Desktop, and Windows Graphics.',
        severity: 'critical',
        category: 'security_update',
        vendor: 'Microsoft',
        product: 'Windows 10',
        kb_article: 'KB5021233',
        requires_reboot: true
      },
      {
        patch_id: 'KB5020030',
        title: 'Security Update for Microsoft Edge (KB5020030)',
        description: 'Security update for Microsoft Edge browser addressing multiple CVEs.',
        severity: 'critical',
        category: 'security_update',
        vendor: 'Microsoft',
        product: 'Microsoft Edge',
        kb_article: 'KB5020030',
        requires_reboot: false
      },
      {
        patch_id: 'KB5019157',
        title: 'Security Update for Microsoft Office 2019 (KB5019157)',
        description: 'Security update for Microsoft Office addressing remote code execution vulnerabilities.',
        severity: 'critical',
        category: 'application_update',
        vendor: 'Microsoft',
        product: 'Microsoft Office',
        kb_article: 'KB5019157',
        requires_reboot: false
      },
      
      // Important Patches
      {
        patch_id: 'KB5018482',
        title: 'Cumulative Update for Windows 10 (KB5018482)',
        description: 'Monthly cumulative update with bug fixes and performance improvements.',
        severity: 'important',
        category: 'windows_update',
        vendor: 'Microsoft',
        product: 'Windows 10',
        kb_article: 'KB5018482',
        requires_reboot: true
      },
      {
        patch_id: 'KB5017308',
        title: '.NET Framework Security Update (KB5017308)',
        description: 'Security update for .NET Framework addressing security vulnerabilities.',
        severity: 'important',
        category: 'application_update',
        vendor: 'Microsoft',
        product: '.NET Framework',
        kb_article: 'KB5017308',
        requires_reboot: false
      },
      {
        patch_id: 'KB5016688',
        title: 'Windows Defender Antimalware Update (KB5016688)',
        description: 'Update to Windows Defender antimalware engine and definitions.',
        severity: 'important',
        category: 'security_update',
        vendor: 'Microsoft',
        product: 'Windows Defender',
        kb_article: 'KB5016688',
        requires_reboot: false
      },
      
      // Moderate Priority Patches
      {
        patch_id: 'KB5015878',
        title: 'Windows 10 Optional Update (KB5015878)',
        description: 'Optional update with additional features and improvements.',
        severity: 'moderate',
        category: 'windows_update',
        vendor: 'Microsoft',
        product: 'Windows 10',
        kb_article: 'KB5015878',
        requires_reboot: true
      },
      {
        patch_id: 'KB5014666',
        title: 'Microsoft Teams Update (KB5014666)',
        description: 'Update for Microsoft Teams with new features and bug fixes.',
        severity: 'moderate',
        category: 'application_update',
        vendor: 'Microsoft',
        product: 'Microsoft Teams',
        kb_article: 'KB5014666',
        requires_reboot: false
      },
      
      // Low Priority Patches
      {
        patch_id: 'KB5013942',
        title: 'Windows 10 Feature Update (KB5013942)',
        description: 'Feature update with new functionality and enhancements.',
        severity: 'low',
        category: 'windows_update',
        vendor: 'Microsoft',
        product: 'Windows 10',
        kb_article: 'KB5013942',
        requires_reboot: true
      },
      {
        patch_id: 'KB5012170',
        title: 'Microsoft OneDrive Update (KB5012170)',
        description: 'Update for Microsoft OneDrive client.',
        severity: 'low',
        category: 'application_update',
        vendor: 'Microsoft',
        product: 'OneDrive',
        kb_article: 'KB5012170',
        requires_reboot: false
      }
    ];
    
    // Insert patch definitions
    for (const patch of patches) {
      await client.query(`
        INSERT INTO patch_definitions (patch_id, title, description, severity, category, vendor, product, kb_article, requires_reboot, release_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '30 days')
      `, [
        patch.patch_id,
        patch.title,
        patch.description,
        patch.severity,
        patch.category,
        patch.vendor,
        patch.product,
        patch.kb_article,
        patch.requires_reboot
      ]);
    }
    
    console.log(`✅ Created ${patches.length} patch definitions`);
    
    // Create realistic patch status for each device
    console.log('💻 Creating device patch status records...');
    
    for (const device of devicesResult.rows) {
      console.log(`Processing patches for device: ${device.hostname} (${device.id})`);
      
      // Create different compliance scenarios for each device
      const deviceIndex = devicesResult.rows.indexOf(device);
      
      for (let i = 0; i < patches.length; i++) {
        const patch = patches[i];
        let status;
        let installDate = null;
        
        // Create realistic scenarios based on device and patch
        if (deviceIndex === 0) {
          // First device: mostly compliant but missing some critical patches
          if (patch.severity === 'critical' && i % 3 === 0) {
            status = 'missing';
          } else if (patch.severity === 'important' && i % 4 === 0) {
            status = 'failed';
          } else {
            status = 'installed';
            installDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
          }
        } else if (deviceIndex === 1) {
          // Second device: medium compliance with several missing patches
          if (patch.severity === 'critical' && i % 2 === 0) {
            status = 'missing';
          } else if (patch.severity === 'important' && i % 3 === 0) {
            status = 'missing';
          } else if (i % 5 === 0) {
            status = 'failed';
          } else {
            status = 'installed';
            installDate = new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000);
          }
        } else {
          // Other devices: varying compliance levels
          const random = Math.random();
          if (patch.severity === 'critical' && random < 0.2) {
            status = 'missing';
          } else if (patch.severity === 'important' && random < 0.3) {
            status = 'missing';
          } else if (random < 0.1) {
            status = 'failed';
          } else if (random < 0.15) {
            status = 'pending';
          } else {
            status = 'installed';
            installDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
          }
        }
        
        // Insert device patch status
        await client.query(`
          INSERT INTO device_patch_status (device_id, patch_id, status, install_date, last_scan_date)
          VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 hour')
        `, [device.id, patch.patch_id, status, installDate]);
      }
    }
    
    console.log('✅ Device patch status records created');
    
    // Generate summary statistics
    console.log('\n📊 Summary Statistics:');
    
    const statsResult = await client.query(`
      SELECT 
        COUNT(DISTINCT device_id) as total_devices,
        COUNT(*) as total_patch_records,
        COUNT(CASE WHEN status = 'installed' THEN 1 END) as installed_count,
        COUNT(CASE WHEN status = 'missing' THEN 1 END) as missing_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
      FROM device_patch_status
    `);
    
    const stats = statsResult.rows[0];
    console.log(`  📱 Devices: ${stats.total_devices}`);
    console.log(`  📋 Total patch records: ${stats.total_patch_records}`);
    console.log(`  ✅ Installed: ${stats.installed_count}`);
    console.log(`  ❌ Missing: ${stats.missing_count}`);
    console.log(`  🔧 Failed: ${stats.failed_count}`);
    console.log(`  ⏳ Pending: ${stats.pending_count}`);
    
    // Test the compliance calculation
    console.log('\n🧪 Testing compliance calculations...');
    
    const complianceResult = await client.query(`
      SELECT 
        d.hostname,
        COUNT(*) as total_patches,
        COUNT(CASE WHEN dps.status = 'installed' THEN 1 END) as installed_patches,
        COUNT(CASE WHEN dps.status = 'missing' AND pd.severity = 'critical' THEN 1 END) as missing_critical,
        COUNT(CASE WHEN dps.status = 'missing' AND pd.severity = 'important' THEN 1 END) as missing_important,
        ROUND(
          (COUNT(CASE WHEN dps.status = 'installed' THEN 1 END) * 100.0 / COUNT(*)), 
          1
        ) as compliance_percentage
      FROM devices d
      JOIN device_patch_status dps ON d.id = dps.device_id
      JOIN patch_definitions pd ON dps.patch_id = pd.patch_id
      GROUP BY d.id, d.hostname
      ORDER BY compliance_percentage DESC
    `);
    
    console.log('\nDevice Compliance Summary:');
    complianceResult.rows.forEach(row => {
      console.log(`  ${row.hostname}: ${row.compliance_percentage}% compliant (${row.installed_patches}/${row.total_patches} installed, ${row.missing_critical} critical missing)`);
    });
    
    console.log('\n🎉 Patch compliance data population completed successfully!');
    console.log('\n💡 Your dashboard should now show meaningful data.');
    
  } catch (error) {
    console.error('❌ Error populating patch data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

populateCompletePatchData();
