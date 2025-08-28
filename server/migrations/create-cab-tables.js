
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('aivencloud.com') ? { rejectUnauthorized: false } : false,
});

async function createCABTables() {
  try {
    console.log('Creating CAB management tables...');

    // Create change_advisory_board table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS change_advisory_board (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        chairperson_id UUID NOT NULL,
        members JSONB DEFAULT '[]'::jsonb,
        meeting_frequency VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create ticket_approvals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL,
        approver_type VARCHAR(20) NOT NULL,
        approver_id VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        submitted_by VARCHAR(100) NOT NULL,
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        approved_by VARCHAR(100),
        approved_at TIMESTAMPTZ,
        comments TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create change_windows table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS change_windows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        window_type VARCHAR(20) NOT NULL,
        start_time VARCHAR(5) NOT NULL,
        end_time VARCHAR(5) NOT NULL,
        days_of_week VARCHAR(20) NOT NULL,
        blackout_dates JSONB DEFAULT '[]'::jsonb,
        approval_required BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create releases table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS releases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        version VARCHAR(50) NOT NULL,
        description TEXT,
        release_type VARCHAR(20) NOT NULL,
        planned_date TIMESTAMPTZ,
        actual_date TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'planned',
        release_manager_id UUID NOT NULL,
        environment VARCHAR(50),
        rollback_plan TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create change_impact_assessment table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS change_impact_assessment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        change_ticket_id UUID NOT NULL,
        affected_systems JSONB DEFAULT '[]'::jsonb,
        affected_users_count INTEGER DEFAULT 0,
        business_impact VARCHAR(20) NOT NULL,
        technical_complexity VARCHAR(20) NOT NULL,
        estimated_effort_hours INTEGER,
        resource_requirements JSONB DEFAULT '{}'::jsonb,
        dependencies JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cab_boards_active 
      ON change_advisory_board(is_active);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_approvals_ticket 
      ON ticket_approvals(ticket_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_approvals_status 
      ON ticket_approvals(status);
    `);

    // Add missing columns to tickets table if they don't exist
    await pool.query(`
      ALTER TABLE tickets 
      ADD COLUMN IF NOT EXISTS change_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20),
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS planned_implementation_date TIMESTAMPTZ;
    `);

    // Insert default CAB board if none exists
    const cabExists = await pool.query(`
      SELECT COUNT(*) FROM change_advisory_board WHERE name = 'Default CAB';
    `);

    if (parseInt(cabExists.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO change_advisory_board (name, description, chairperson_id, members, meeting_frequency)
        VALUES (
          'Default CAB',
          'Default Change Advisory Board for standard change approvals',
          '37b1fbab-ce59-4dba-81b8-154dcf442c05',
          '["37b1fbab-ce59-4dba-81b8-154dcf442c05"]'::jsonb,
          'Weekly'
        );
      `);
    }

    console.log('✅ CAB management tables created successfully');

  } catch (error) {
    console.error('Error creating CAB tables:', error);
    throw error;
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createCABTables()
    .then(() => {
      console.log('CAB setup completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

export { createCABTables };
