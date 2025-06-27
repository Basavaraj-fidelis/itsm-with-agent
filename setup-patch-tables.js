
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('🔗 Connecting to database...');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function setupPatchTables() {
  try {
    console.log('Creating patch compliance tables...');

    // Create patch_definitions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patch_definitions (
        id SERIAL PRIMARY KEY,
        patch_id VARCHAR(255) UNIQUE NOT NULL,
        title TEXT,
        description TEXT,
        severity VARCHAR(50) DEFAULT 'moderate',
        category VARCHAR(100),
        vendor VARCHAR(100),
        product VARCHAR(100),
        kb_article VARCHAR(50),
        release_date TIMESTAMP,
        requires_reboot BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create device_patch_status table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_patch_status (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) NOT NULL,
        patch_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'unknown',
        install_date TIMESTAMP,
        last_scan_date TIMESTAMP DEFAULT NOW(),
        error_message TEXT,
        deployment_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(device_id, patch_id)
      );
    `);

    // Create patch_deployments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patch_deployments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        target_patches TEXT[], -- Array of patch IDs
        target_devices TEXT[], -- Array of device IDs
        schedule_type VARCHAR(50) DEFAULT 'immediate',
        scheduled_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
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
      ('KB5017308', '.NET Framework Security Update (KB5017308)', 'moderate', 'security_update', false)
      ON CONFLICT (patch_id) DO NOTHING
    `);

    // Get some sample device IDs from the devices table
    const devicesResult = await pool.query('SELECT id FROM devices LIMIT 5');
    const devices = devicesResult.rows;

    if (devices.length > 0) {
      console.log('Inserting sample device patch status...');
      
      const patches = ['KB5021233', 'KB5020030', 'KB5019157', 'KB5018482', 'KB5017308'];
      const statuses = ['installed', 'missing', 'installed', 'missing', 'installed'];

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

    console.log('✅ Sample patch data inserted successfully!');
    console.log('Patch compliance system is now ready.');

  } catch (error) {
    console.error('❌ Error setting up patch tables:', error);
    console.error('Error details:', error.message);
  } finally {
    await pool.end();
  }
}

setupPatchTables();
