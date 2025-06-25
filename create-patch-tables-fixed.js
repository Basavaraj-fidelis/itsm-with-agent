
import pkg from 'pg';
const { Pool } = pkg;

async function createPatchTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('aivencloud.com') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔧 Dropping existing patch tables...');
    
    // Drop existing tables in correct order (foreign keys first)
    await pool.query('DROP TABLE IF EXISTS patch_deployment_results CASCADE');
    await pool.query('DROP TABLE IF EXISTS device_patch_status CASCADE');
    await pool.query('DROP TABLE IF EXISTS patch_deployments CASCADE');
    await pool.query('DROP TABLE IF EXISTS compliance_policies CASCADE');
    await pool.query('DROP TABLE IF EXISTS patch_definitions CASCADE');

    console.log('📊 Creating patch compliance tables...');

    // Create patch definitions table
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

    // Create device patch status table with proper UUID reference
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

    // Create patch deployments table
    await pool.query(`
      CREATE TABLE patch_deployments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        target_patches TEXT[], -- Array of patch IDs
        target_devices UUID[], -- Array of device IDs as UUIDs
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

    // Create compliance policies table
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

    // Create patch deployment results table
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

    // Create indexes for better performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_device_patch_status_device_id ON device_patch_status(device_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_device_patch_status_patch_id ON device_patch_status(patch_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_device_patch_status_status ON device_patch_status(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_patch_definitions_severity ON patch_definitions(severity)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_patch_definitions_category ON patch_definitions(category)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_patch_deployments_status ON patch_deployments(status)`);

    console.log('✅ Patch compliance tables created successfully!');

    // Insert sample patch definitions
    console.log('📝 Adding sample patch definitions...');
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
      ON CONFLICT (patch_id) DO NOTHING
    `);

    // Get devices and add sample patch status
    const devicesResult = await pool.query('SELECT id FROM devices ORDER BY created_at LIMIT 10');
    const devices = devicesResult.rows;

    if (devices.length > 0) {
      console.log(`📝 Adding patch status for ${devices.length} devices...`);
      
      const patches = ['KB5021233', 'KB5020030', 'KB5019157', 'KB5018482', 'KB5017308', 'KB5016887', 'KB5015878', 'KB5014699', 'KB5013942', 'KB5012599'];
      const statuses = ['installed', 'missing', 'installed', 'missing', 'installed', 'failed', 'installed', 'pending', 'installed', 'missing'];

      for (const device of devices) {
        for (let i = 0; i < patches.length; i++) {
          await pool.query(`
            INSERT INTO device_patch_status (device_id, patch_id, status, last_scan_date) 
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (device_id, patch_id) DO NOTHING
          `, [device.id, patches[i], statuses[i % statuses.length]]);
        }
      }
    }

    // Get final counts
    const patchDefCount = await pool.query('SELECT COUNT(*) as count FROM patch_definitions');
    const patchStatusCount = await pool.query('SELECT COUNT(*) as count FROM device_patch_status');

    console.log('✅ Sample patch data added successfully!');
    console.log(`📊 Total patch definitions: ${patchDefCount.rows[0].count}`);
    console.log(`📊 Total patch status records: ${patchStatusCount.rows[0].count}`);
    console.log('🎉 Patch compliance system is ready!');

  } catch (error) {
    console.error('❌ Error creating patch tables:', error);
    console.error('Error details:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createPatchTables().catch(console.error);
}

export default createPatchTables;
