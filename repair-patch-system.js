
import pkg from 'pg';
const { Pool } = pkg;

async function repairPatchSystem() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('aivencloud.com') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔧 Repairing Patch Compliance System...');
    
    // Drop and recreate all patch tables with proper structure
    console.log('\n1. Dropping existing patch tables...');
    await pool.query('DROP TABLE IF EXISTS patch_deployment_results CASCADE');
    await pool.query('DROP TABLE IF EXISTS device_patch_status CASCADE');
    await pool.query('DROP TABLE IF EXISTS patch_deployments CASCADE');
    await pool.query('DROP TABLE IF EXISTS compliance_policies CASCADE');
    await pool.query('DROP TABLE IF EXISTS patch_definitions CASCADE');
    
    console.log('\n2. Creating patch definitions table...');
    await pool.query(`
      CREATE TABLE patch_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patch_id VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(500),
        description TEXT,
        severity VARCHAR(50) DEFAULT 'moderate' CHECK (severity IN ('critical', 'important', 'moderate', 'low')),
        category VARCHAR(100) DEFAULT 'windows_update',
        vendor VARCHAR(100),
        product VARCHAR(100),
        kb_article VARCHAR(50),
        release_date TIMESTAMP,
        requires_reboot BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('\n3. Creating device patch status table...');
    await pool.query(`
      CREATE TABLE device_patch_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        patch_id VARCHAR(255) NOT NULL REFERENCES patch_definitions(patch_id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'unknown' CHECK (status IN ('not_applicable', 'missing', 'installed', 'failed', 'pending')),
        install_date TIMESTAMP,
        last_scan_date TIMESTAMP DEFAULT NOW(),
        error_message TEXT,
        deployment_id UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(device_id, patch_id)
      )
    `);
    
    console.log('\n4. Creating patch deployments table...');
    await pool.query(`
      CREATE TABLE patch_deployments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        target_patches TEXT[], 
        target_devices UUID[], 
        schedule_type VARCHAR(50) DEFAULT 'immediate' CHECK (schedule_type IN ('immediate', 'scheduled', 'maintenance_window')),
        scheduled_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
        created_by VARCHAR(255),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('\n5. Creating compliance policies table...');
    await pool.query(`
      CREATE TABLE compliance_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        policy_type VARCHAR(50) DEFAULT 'security_updates',
        max_days_missing INTEGER DEFAULT 30,
        severity_levels TEXT[] DEFAULT ARRAY['critical', 'important'],
        auto_remediate BOOLEAN DEFAULT FALSE,
        notification_threshold INTEGER DEFAULT 7,
        is_active BOOLEAN DEFAULT TRUE,
        created_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('\n6. Creating patch deployment results table...');
    await pool.query(`
      CREATE TABLE patch_deployment_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deployment_id UUID NOT NULL REFERENCES patch_deployments(id) ON DELETE CASCADE,
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        patch_id VARCHAR(255) NOT NULL REFERENCES patch_definitions(patch_id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'skipped')),
        error_message TEXT,
        install_duration_seconds INTEGER,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('\n7. Creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_device_patch_status_device_id ON device_patch_status(device_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_device_patch_status_patch_id ON device_patch_status(patch_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_device_patch_status_status ON device_patch_status(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_patch_definitions_severity ON patch_definitions(severity)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_patch_definitions_category ON patch_definitions(category)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_patch_deployments_status ON patch_deployments(status)');
    
    console.log('\n8. Inserting sample patch definitions...');
    await pool.query(`
      INSERT INTO patch_definitions (patch_id, title, severity, category, requires_reboot, description) VALUES
      ('KB5021233', 'Security Update for Windows 10 (KB5021233)', 'critical', 'security_update', true, 'Critical security update addressing multiple vulnerabilities'),
      ('KB5020030', 'Cumulative Update for Windows 10 (KB5020030)', 'important', 'windows_update', true, 'Monthly cumulative update with security and quality fixes'),
      ('KB5019157', 'Microsoft Office Security Update (KB5019157)', 'important', 'application_update', false, 'Security update for Microsoft Office applications'),
      ('KB5018482', 'Security Update for Microsoft Edge (KB5018482)', 'critical', 'security_update', false, 'Critical security update for Microsoft Edge browser'),
      ('KB5017308', '.NET Framework Security Update (KB5017308)', 'moderate', 'security_update', false, 'Security update for .NET Framework components'),
      ('KB5016887', 'Windows Defender Update (KB5016887)', 'important', 'security_update', false, 'Windows Defender antimalware update'),
      ('KB5015878', 'Adobe Flash Player Update (KB5015878)', 'critical', 'application_update', false, 'Critical security update for Adobe Flash Player'),
      ('KB5014699', 'SQL Server Security Update (KB5014699)', 'important', 'application_update', true, 'Security update for SQL Server components'),
      ('KB5013942', 'Internet Explorer Security Update (KB5013942)', 'moderate', 'security_update', false, 'Security update for Internet Explorer'),
      ('KB5012599', 'Windows Media Player Update (KB5012599)', 'low', 'application_update', false, 'Feature update for Windows Media Player')
    `);
    
    console.log('\n9. Adding sample patch status data...');
    const devicesResult = await pool.query('SELECT id FROM devices ORDER BY created_at LIMIT 10');
    const devices = devicesResult.rows;
    
    if (devices.length > 0) {
      const patches = ['KB5021233', 'KB5020030', 'KB5019157', 'KB5018482', 'KB5017308', 'KB5016887', 'KB5015878', 'KB5014699', 'KB5013942', 'KB5012599'];
      const statuses = ['installed', 'missing', 'installed', 'missing', 'installed', 'failed', 'installed', 'pending', 'installed', 'missing'];
      
      for (const device of devices) {
        for (let i = 0; i < patches.length; i++) {
          await pool.query(`
            INSERT INTO device_patch_status (device_id, patch_id, status, last_scan_date) 
            VALUES ($1, $2, $3, NOW())
          `, [device.id, patches[i], statuses[i % statuses.length]]);
        }
      }
      console.log(`✅ Added patch status for ${devices.length} devices`);
    }
    
    // Final verification
    console.log('\n10. Verifying repair...');
    const verification = await pool.query(`
      SELECT 
        d.hostname,
        COUNT(dps.patch_id) as total_patches,
        COUNT(CASE WHEN dps.status = 'installed' THEN 1 END) as installed,
        COUNT(CASE WHEN dps.status = 'missing' THEN 1 END) as missing
      FROM devices d
      LEFT JOIN device_patch_status dps ON d.id = dps.device_id
      WHERE d.status = 'online'
      GROUP BY d.id, d.hostname
      LIMIT 5
    `);
    
    console.log('✅ Verification results:');
    verification.rows.forEach(row => {
      console.log(`  ${row.hostname}: ${row.total_patches} total, ${row.installed} installed, ${row.missing} missing`);
    });
    
    console.log('\n🎉 Patch compliance system repaired successfully!');
    
  } catch (error) {
    console.error('❌ Repair failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run repair
repairPatchSystem().catch(console.error);
