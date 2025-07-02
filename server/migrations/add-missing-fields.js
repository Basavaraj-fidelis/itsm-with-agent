

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function addMissingFields() {
  try {
    console.log("Adding missing database fields and tables...");

    // First, add missing user fields to existing users table
    console.log("Adding missing user fields...");
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS office_location VARCHAR(100),
      ADD COLUMN IF NOT EXISTS work_hours VARCHAR(50),
      ADD COLUMN IF NOT EXISTS timezone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS cost_center VARCHAR(50),
      ADD COLUMN IF NOT EXISTS reporting_manager_email VARCHAR(255);
    `);

    // Add missing ticket fields to existing tickets table
    console.log("Adding missing ticket fields...");
    await pool.query(`
      ALTER TABLE tickets 
      ADD COLUMN IF NOT EXISTS requester_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS requester_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'web',
      ADD COLUMN IF NOT EXISTS contact_method VARCHAR(20) DEFAULT 'email',
      ADD COLUMN IF NOT EXISTS business_service VARCHAR(100),
      ADD COLUMN IF NOT EXISTS affected_users_count INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS financial_impact VARCHAR(20),
      ADD COLUMN IF NOT EXISTS closure_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS closure_notes TEXT,
      ADD COLUMN IF NOT EXISTS customer_satisfaction INTEGER;
    `);

    // Create user groups table
    console.log("Creating user groups table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        group_type VARCHAR(50) NOT NULL,
        manager_id UUID REFERENCES users(id),
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create user group memberships table
    console.log("Creating user group memberships table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_group_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        group_id UUID NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(user_id, group_id)
      );
    `);

    // Create configuration items table
    console.log("Creating configuration items table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuration_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        ci_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        serial_number VARCHAR(100),
        asset_tag VARCHAR(100),
        model VARCHAR(100),
        manufacturer VARCHAR(100),
        version VARCHAR(50),
        location VARCHAR(100),
        owner_id UUID,
        cost INTEGER,
        purchase_date TIMESTAMP,
        warranty_expiry TIMESTAMP,
        attributes JSON DEFAULT '{}'::json,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create CI relationships table (after configuration_items table exists)
    console.log("Creating CI relationships table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ci_relationships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
        child_ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
        relationship_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Add missing columns to ci_relationships if they don't exist
    console.log("Ensuring CI relationships columns exist...");
    await pool.query(`
      ALTER TABLE ci_relationships 
      ADD COLUMN IF NOT EXISTS parent_ci_id UUID REFERENCES configuration_items(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS child_ci_id UUID REFERENCES configuration_items(id) ON DELETE CASCADE;
    `);

    // Create services table
    console.log("Creating services table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        service_type VARCHAR(50) DEFAULT 'business',
        owner_id UUID,
        service_level VARCHAR(20) DEFAULT 'standard',
        cost INTEGER,
        approval_required BOOLEAN DEFAULT false,
        auto_approval BOOLEAN DEFAULT false,
        sla_policy_id UUID,
        is_active BOOLEAN DEFAULT true,
        request_form_fields JSON DEFAULT '[]'::json,
        fulfillment_instructions TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Add missing columns to services if they don't exist
    console.log("Ensuring services columns exist...");
    await pool.query(`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'business';
    `);

    // Create service requests table
    console.log("Creating service requests table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL,
        service_id UUID NOT NULL REFERENCES services(id),
        requested_for VARCHAR(255),
        business_justification TEXT,
        delivery_instructions TEXT,
        approval_status VARCHAR(20) DEFAULT 'pending',
        approved_by VARCHAR(255),
        approved_at TIMESTAMP,
        form_data JSON DEFAULT '{}'::json,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Add missing columns to service_requests if they don't exist
    console.log("Ensuring service requests columns exist...");
    await pool.query(`
      ALTER TABLE service_requests 
      ADD COLUMN IF NOT EXISTS ticket_id UUID;
    `);

    // Now create indexes after all tables exist
    console.log("Creating indexes...");
    
    // Create indexes with proper column validation
    const indexQueries = [
      // User group memberships indexes
      { table: 'user_group_memberships', column: 'user_id', name: 'idx_user_group_memberships_user_id' },
      { table: 'user_group_memberships', column: 'group_id', name: 'idx_user_group_memberships_group_id' },
      
      // Configuration items indexes
      { table: 'configuration_items', column: 'ci_type', name: 'idx_configuration_items_ci_type' },
      { table: 'configuration_items', column: 'status', name: 'idx_configuration_items_status' },
      
      // CI relationships indexes (using actual column names)
      { table: 'ci_relationships', column: 'parent_ci_id', name: 'idx_ci_relationships_parent_ci_id' },
      { table: 'ci_relationships', column: 'child_ci_id', name: 'idx_ci_relationships_child_ci_id' },
      
      // Services indexes
      { table: 'services', column: 'category', name: 'idx_services_category' },
      { table: 'services', column: 'service_type', name: 'idx_services_service_type' },
      
      // Service requests indexes
      { table: 'service_requests', column: 'ticket_id', name: 'idx_service_requests_ticket_id' },
      { table: 'service_requests', column: 'service_id', name: 'idx_service_requests_service_id' },
      
      // Tickets indexes
      { table: 'tickets', column: 'source', name: 'idx_tickets_source' },
      { table: 'tickets', column: 'contact_method', name: 'idx_tickets_contact_method' }
    ];

    for (const { table, column, name } of indexQueries) {
      try {
        // Check if table and column exist
        const columnExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = $2 AND table_schema = 'public'
          );
        `, [table, column]);

        if (columnExists.rows[0].exists) {
          await pool.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${table}(${column});`);
          console.log(`✅ Created index ${name}`);
        } else {
          console.log(`⚠️  Skipping index ${name} - column ${column} does not exist in table ${table}`);
        }
      } catch (error) {
        console.warn(`⚠️  Could not create index ${name}:`, error.message);
      }
    }

    console.log("✅ Successfully added missing database fields and tables!");
    
  } catch (error) {
    console.error("❌ Error adding missing fields:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addMissingFields()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { addMissingFields };

