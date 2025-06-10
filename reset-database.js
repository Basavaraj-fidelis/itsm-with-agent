
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function resetDatabase() {
  try {
    console.log("🗑️  Dropping all existing tables...");
    
    // Drop all tables in dependency order
    await pool.query(`DROP TABLE IF EXISTS 
      user_sessions,
      user_activity,
      group_members,
      ticket_approvals,
      ticket_attachments,
      ticket_comments,
      sla_breaches,
      audit_log,
      knowledge_base,
      tickets,
      usb_devices,
      device_reports,
      alerts,
      devices,
      users,
      departments,
      groups,
      sla_policies
      CASCADE;`);

    console.log("✅ All tables dropped successfully!");
    console.log("🚀 Creating tables with proper schema...");

    // Create users table with username column
    await pool.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'end_user',
        department_id UUID,
        manager_id UUID,
        phone VARCHAR(20),
        employee_id VARCHAR(50),
        job_title VARCHAR(100),
        location VARCHAR(100),
        profile_picture TEXT,
        permissions JSON DEFAULT '[]'::json,
        preferences JSON DEFAULT '{}'::json,
        is_active BOOLEAN DEFAULT true,
        is_locked BOOLEAN DEFAULT false,
        password_reset_required BOOLEAN DEFAULT false,
        failed_login_attempts INTEGER DEFAULT 0,
        last_login TIMESTAMP,
        last_password_change TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create departments table
    await pool.query(`
      CREATE TABLE departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        manager_id UUID,
        budget INTEGER,
        cost_center VARCHAR(50),
        location VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create user_sessions table
    await pool.query(`
      CREATE TABLE user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create user_activity table
    await pool.query(`
      CREATE TABLE user_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        activity_type VARCHAR(50) NOT NULL,
        description TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        metadata JSON DEFAULT '{}'::json,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create devices table
    await pool.query(`
      CREATE TABLE devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hostname TEXT NOT NULL UNIQUE,
        assigned_user TEXT,
        os_name TEXT,
        os_version TEXT,
        ip_address TEXT,
        status TEXT DEFAULT 'offline',
        last_seen TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create device_reports table
    await pool.query(`
      CREATE TABLE device_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID REFERENCES devices(id) NOT NULL,
        collected_at TIMESTAMP DEFAULT NOW(),
        cpu_usage NUMERIC,
        memory_usage NUMERIC,
        disk_usage NUMERIC,
        network_io NUMERIC,
        raw_data JSON NOT NULL
      );
    `);

    // Create alerts table
    await pool.query(`
      CREATE TABLE alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID REFERENCES devices(id) NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata JSON,
        triggered_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );
    `);

    // Create usb_devices table
    await pool.query(`
      CREATE TABLE usb_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID REFERENCES devices(id),
        device_identifier TEXT NOT NULL,
        description TEXT,
        vendor_id TEXT,
        product_id TEXT,
        manufacturer TEXT,
        serial_number TEXT,
        device_class TEXT,
        location TEXT,
        speed TEXT,
        first_seen TIMESTAMP DEFAULT NOW() NOT NULL,
        last_seen TIMESTAMP DEFAULT NOW() NOT NULL,
        is_connected BOOLEAN DEFAULT TRUE,
        raw_data JSON DEFAULT '{}'::json
      );
    `);

    // Create tickets table
    await pool.query(`
      CREATE TABLE tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_number VARCHAR(20) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        status VARCHAR(20) NOT NULL DEFAULT 'new',
        requester_email VARCHAR(255) NOT NULL,
        assigned_to VARCHAR(255),
        assigned_group VARCHAR(100),
        device_id UUID REFERENCES devices(id),
        related_tickets JSON DEFAULT '[]'::json,
        impact VARCHAR(20) DEFAULT 'medium',
        urgency VARCHAR(20) DEFAULT 'medium',
        category VARCHAR(100),
        subcategory VARCHAR(100),
        change_type VARCHAR(50),
        risk_level VARCHAR(20),
        approval_status VARCHAR(20),
        implementation_plan TEXT,
        rollback_plan TEXT,
        scheduled_start TIMESTAMP,
        scheduled_end TIMESTAMP,
        root_cause TEXT,
        workaround TEXT,
        known_error BOOLEAN DEFAULT false,
        tags JSON DEFAULT '[]'::json,
        custom_fields JSON DEFAULT '{}'::json,
        sla_policy VARCHAR(100) DEFAULT 'Standard SLA',
        sla_response_time INTEGER DEFAULT 240,
        sla_resolution_time INTEGER DEFAULT 1440,
        sla_response_due TIMESTAMP,
        sla_resolution_due TIMESTAMP,
        first_response_at TIMESTAMP,
        sla_breached BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        resolved_at TIMESTAMP,
        closed_at TIMESTAMP,
        due_date TIMESTAMP
      );
    `);

    // Create ticket_comments table
    await pool.query(`
      CREATE TABLE ticket_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES tickets(id),
        author_email VARCHAR(255) NOT NULL,
        comment TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT false,
        attachments JSON DEFAULT '[]'::json,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create ticket_attachments table
    await pool.query(`
      CREATE TABLE ticket_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES tickets(id),
        filename VARCHAR(255) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_by VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create ticket_approvals table
    await pool.query(`
      CREATE TABLE ticket_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES tickets(id),
        approver_email VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL,
        comments TEXT,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create knowledge_base table
    await pool.query(`
      CREATE TABLE knowledge_base (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        tags JSON DEFAULT '[]'::json,
        author_email VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        views INTEGER DEFAULT 0,
        helpful_votes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create groups table
    await pool.query(`
      CREATE TABLE groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        type VARCHAR(20) DEFAULT 'team',
        parent_group_id UUID REFERENCES groups(id),
        manager_id UUID,
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create group_members table
    await pool.query(`
      CREATE TABLE group_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID REFERENCES groups(id) NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id),
        role VARCHAR(20) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
        is_active BOOLEAN DEFAULT true
      );
    `);

    // Create audit_log table
    await pool.query(`
      CREATE TABLE audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        action VARCHAR(20) NOT NULL,
        user_id UUID REFERENCES users(id),
        user_email VARCHAR(255),
        old_values JSON,
        new_values JSON,
        changes JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create sla_policies table
    await pool.query(`
      CREATE TABLE sla_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        ticket_type VARCHAR(20),
        priority VARCHAR(20),
        impact VARCHAR(20),
        urgency VARCHAR(20),
        category VARCHAR(100),
        response_time INTEGER NOT NULL,
        resolution_time INTEGER NOT NULL,
        business_hours_only BOOLEAN DEFAULT true,
        business_start VARCHAR(5) DEFAULT '09:00',
        business_end VARCHAR(5) DEFAULT '17:00',
        business_days VARCHAR(20) DEFAULT '1,2,3,4,5',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create sla_breaches table
    await pool.query(`
      CREATE TABLE sla_breaches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES tickets(id),
        sla_policy_id UUID REFERENCES sla_policies(id) NOT NULL,
        breach_type VARCHAR(20) NOT NULL,
        target_time TIMESTAMP NOT NULL,
        actual_time TIMESTAMP,
        breach_duration INTEGER,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create indexes for better performance
    console.log("📊 Creating indexes...");
    
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_requester_email ON tickets(requester_email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_knowledge_base_status ON knowledge_base(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_groups_parent ON groups(parent_group_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sla_policies_active ON sla_policies(is_active)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sla_breaches_ticket ON sla_breaches(ticket_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_usb_devices_device_id ON usb_devices(device_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_usb_devices_identifier ON usb_devices(device_id, device_identifier)`);

    // Insert default data
    console.log("📝 Inserting default data...");

    // Insert default SLA policies
    await pool.query(`
      INSERT INTO sla_policies (name, description, priority, response_time, resolution_time)
      VALUES 
        ('Critical Priority SLA', 'Critical issues requiring immediate attention', 'critical', 15, 240),
        ('High Priority SLA', 'High priority issues', 'high', 60, 480),
        ('Medium Priority SLA', 'Standard business issues', 'medium', 240, 1440),
        ('Low Priority SLA', 'Low priority requests', 'low', 480, 2880);
    `);

    // Insert default groups
    await pool.query(`
      INSERT INTO groups (name, description, type, email)
      VALUES 
        ('IT Support', 'Primary IT support team', 'team', 'itsupport@company.com'),
        ('Network Team', 'Network infrastructure team', 'team', 'network@company.com'),
        ('Security Team', 'Information security team', 'team', 'security@company.com'),
        ('Help Desk', 'Level 1 support desk', 'team', 'helpdesk@company.com');
    `);

    // Insert master admin user
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    await pool.query(`
      INSERT INTO users (email, username, first_name, last_name, password_hash, role, is_active)
      VALUES ('admin@company.com', 'admin', 'System', 'Administrator', $1, 'admin', true);
    `, [hashedPassword]);

    console.log("✅ Database reset completed successfully!");
    console.log("🔑 Master admin created:");
    console.log("   Email: admin@company.com");
    console.log("   Username: admin");
    console.log("   Password: Admin123!");
    
    // Show table counts
    const tables = [
      'users', 'departments', 'user_sessions', 'user_activity', 'devices',
      'device_reports', 'alerts', 'usb_devices', 'tickets', 'ticket_comments',
      'ticket_attachments', 'ticket_approvals', 'knowledge_base', 'groups',
      'group_members', 'audit_log', 'sla_policies', 'sla_breaches'
    ];

    console.log("\n📊 Table counts:");
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ${table}: ${result.rows[0].count} records`);
      } catch (err) {
        console.log(`  ${table}: Error - ${err.message}`);
      }
    }

  } catch (error) {
    console.error("❌ Database reset failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

resetDatabase();
