
import pkg from 'pg';
const { Pool } = pkg;

async function createPatchTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Creating patch compliance tables...');

    // Create patch definitions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patch_definitions (
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

    // Create device patch status table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_patch_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        patch_id VARCHAR(255) NOT NULL,
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
      CREATE TABLE IF NOT EXISTS patch_deployments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        target_patches TEXT[], -- Array of patch IDs
        target_devices TEXT[], -- Array of device IDs
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
      CREATE TABLE IF NOT EXISTS compliance_policies (
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
      CREATE TABLE IF NOT EXISTS patch_deployment_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deployment_id UUID NOT NULL REFERENCES patch_deployments(id) ON DELETE CASCADE,
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        patch_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'skipped')),
        error_message TEXT,
        install_duration_seconds INTEGER,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_device_patch_status_device_id ON device_patch_status(device_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_device_patch_status_patch_id ON device_patch_status(patch_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_device_patch_status_status ON device_patch_status(status);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_patch_definitions_severity ON patch_definitions(severity);
    `);

    console.log('✅ Patch compliance tables created successfully!');

    // Insert some sample data
    console.log('Inserting sample patch data...');
    
    // Insert sample patches
    await pool.query(`
      INSERT INTO patch_definitions (patch_id, title, severity, category, requires_reboot) VALUES
      ('KB5021233', 'Security Update for Windows 10 (KB5021233)', 'critical', 'security_update', true),
      ('KB5020030', 'Cumulative Update for Windows 10 (KB5020030)', 'important', 'windows_update', true),
      ('KB5019157', 'Microsoft Office Security Update (KB5019157)', 'important', 'application_update', false),
      ('KB5018482', 'Security Update for Microsoft Edge (KB5018482)', 'critical', 'security_update', false),
      ('KB5017308', 'NET Framework Security Update (KB5017308)', 'moderate', 'security_update', false)
      ON CONFLICT (patch_id) DO NOTHING
    `);

    console.log('✅ Sample patch data inserted!');

  } catch (error) {
    console.error('Error creating patch tables:', error);
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
