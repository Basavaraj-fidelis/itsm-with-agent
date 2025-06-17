
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function createAuditTables() {
  try {
    console.log("Creating audit and essential tables...");

    // Audit logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        record_id VARCHAR(255),
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // File attachments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        entity_type VARCHAR(50) NOT NULL, -- 'ticket', 'user', 'article'
        entity_id UUID NOT NULL,
        uploaded_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // System settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
        description TEXT,
        category VARCHAR(50) DEFAULT 'general',
        is_sensitive BOOLEAN DEFAULT false,
        updated_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Asset categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS asset_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        parent_id UUID REFERENCES asset_categories(id),
        icon VARCHAR(50),
        color VARCHAR(7), -- hex color
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Change requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS change_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        change_type VARCHAR(50) NOT NULL, -- 'standard', 'normal', 'emergency'
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'rejected', 'implementing', 'completed'
        impact VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high'
        risk_level VARCHAR(20) DEFAULT 'low',
        requester_id UUID REFERENCES users(id),
        approver_id UUID REFERENCES users(id),
        implementer_id UUID REFERENCES users(id),
        scheduled_start TIMESTAMP,
        scheduled_end TIMESTAMP,
        actual_start TIMESTAMP,
        actual_end TIMESTAMP,
        rollback_plan TEXT,
        test_results TEXT,
        approval_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Incident categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS incident_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        parent_id UUID REFERENCES incident_categories(id),
        sla_hours INTEGER DEFAULT 24,
        auto_assign_to VARCHAR(50), -- 'role' or 'user'
        auto_assign_value VARCHAR(100),
        escalation_rules JSON,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // License management table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS software_licenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        software_name VARCHAR(255) NOT NULL,
        vendor VARCHAR(100),
        license_type VARCHAR(50), -- 'perpetual', 'subscription', 'volume'
        license_key TEXT,
        purchase_date DATE,
        expiry_date DATE,
        seats_purchased INTEGER DEFAULT 1,
        seats_used INTEGER DEFAULT 0,
        cost_per_seat DECIMAL(10,2),
        total_cost DECIMAL(10,2),
        department_id UUID REFERENCES departments(id),
        renewal_reminder_days INTEGER DEFAULT 30,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Insert default system settings
    await pool.query(`
      INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category)
      VALUES 
        ('company_name', 'Your Company', 'string', 'Company name displayed in the system', 'general'),
        ('default_sla_hours', '24', 'number', 'Default SLA in hours for new tickets', 'tickets'),
        ('max_file_upload_size', '10485760', 'number', 'Maximum file upload size in bytes (10MB)', 'files'),
        ('auto_assign_tickets', 'true', 'boolean', 'Automatically assign tickets to available technicians', 'tickets'),
        ('email_notifications', 'true', 'boolean', 'Enable email notifications', 'notifications'),
        ('password_expiry_days', '90', 'number', 'Password expiry in days', 'security')
      ON CONFLICT (setting_key) DO NOTHING;
    `);

    // Insert default asset categories
    await pool.query(`
      INSERT INTO asset_categories (name, description, icon, color)
      VALUES 
        ('Hardware', 'Physical IT equipment', 'HardDrive', '#3B82F6'),
        ('Software', 'Software applications and licenses', 'Code', '#10B981'),
        ('Network', 'Network equipment and infrastructure', 'Wifi', '#F59E0B'),
        ('Mobile', 'Mobile devices and tablets', 'Smartphone', '#8B5CF6'),
        ('Peripherals', 'Monitors, keyboards, mice, etc.', 'Monitor', '#6B7280')
      ON CONFLICT DO NOTHING;
    `);

    // Insert default incident categories
    await pool.query(`
      INSERT INTO incident_categories (name, description, sla_hours, auto_assign_to, auto_assign_value)
      VALUES 
        ('Hardware Issues', 'Computer, printer, and hardware problems', 24, 'role', 'technician'),
        ('Software Issues', 'Application and software problems', 8, 'role', 'technician'),
        ('Network Issues', 'Internet and connectivity problems', 4, 'role', 'technician'),
        ('Security Issues', 'Security breaches and concerns', 1, 'role', 'admin'),
        ('Access Issues', 'Login and permission problems', 2, 'role', 'technician')
      ON CONFLICT DO NOTHING;
    `);

    console.log("✅ All audit and essential tables created successfully");
    
  } catch (error) {
    console.error("❌ Error creating audit tables:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

createAuditTables();
