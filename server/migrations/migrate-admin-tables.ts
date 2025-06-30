import { pool } from "../db";
import { drizzle } from "drizzle-orm/node-postgres";

const db = drizzle(pool);
import { sql } from "drizzle-orm";

export async function createAdminTables() {
  try {
    console.log("🚀 Creating admin tables...");

    // Create groups table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS groups (
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
      )
    `);

    // Create group_members table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS group_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID REFERENCES groups(id) NOT NULL,
        user_id UUID NOT NULL,
        role VARCHAR(20) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // Create audit_log table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        action VARCHAR(20) NOT NULL,
        user_id UUID,
        user_email VARCHAR(255),
        old_values JSON,
        new_values JSON,
        changes JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create sla_policies table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sla_policies (
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
      )
    `);

    // Create sla_breaches table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sla_breaches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL,
        sla_policy_id UUID REFERENCES sla_policies(id) NOT NULL,
        breach_type VARCHAR(20) NOT NULL,
        target_time TIMESTAMP NOT NULL,
        actual_time TIMESTAMP,
        breach_duration INTEGER,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create indexes for better performance
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_groups_parent ON groups(parent_group_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sla_policies_active ON sla_policies(is_active)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sla_breaches_ticket ON sla_breaches(ticket_id)`);

    // Insert default SLA policies
    await db.execute(sql`
      INSERT INTO sla_policies (name, description, priority, response_time, resolution_time)
      VALUES 
        ('Critical Priority SLA', 'Critical issues requiring immediate attention', 'critical', 15, 240),
        ('High Priority SLA', 'High priority issues', 'high', 60, 480),
        ('Medium Priority SLA', 'Standard business issues', 'medium', 240, 1440),
        ('Low Priority SLA', 'Low priority requests', 'low', 480, 2880)
      ON CONFLICT DO NOTHING
    `);

    // Insert default groups
    await db.execute(sql`
      INSERT INTO groups (name, description, type, email)
      VALUES 
        ('IT Support', 'Primary IT support team', 'team', 'itsupport@company.com'),
        ('Network Team', 'Network infrastructure team', 'team', 'network@company.com'),
        ('Security Team', 'Information security team', 'team', 'security@company.com'),
        ('Help Desk', 'Level 1 support desk', 'team', 'helpdesk@company.com')
      ON CONFLICT DO NOTHING
    `);

    console.log("✅ Admin tables created successfully!");
  } catch (error) {
    console.error("❌ Error creating admin tables:", error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdminTables()
    .then(() => {
      console.log("Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}