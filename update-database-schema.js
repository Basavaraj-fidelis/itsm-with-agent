
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb?sslmode=require";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function updateDatabaseSchema() {
  try {
    console.log("🔄 Updating database schema...");

    // Add missing department column to users table
    console.log("Adding department column to users table...");
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS department VARCHAR(100)
    `);

    // Update existing users with department data from location
    console.log("Updating existing users with department data...");
    await pool.query(`
      UPDATE users 
      SET department = location 
      WHERE department IS NULL AND location IS NOT NULL
    `);

    // Add missing indexes for better performance
    console.log("Adding performance indexes...");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
      CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
    `);

    // Ensure all required tables exist
    console.log("Checking admin tables...");
    await pool.query(`
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

    await pool.query(`
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

    // Verify schema updates
    console.log("Verifying schema updates...");
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY column_name
    `);

    console.log("✅ Users table columns:");
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    // Check user count
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`\n📊 Total users in database: ${userCount.rows[0].count}`);

    console.log("\n🎉 Database schema updated successfully!");

  } catch (error) {
    console.error("❌ Error updating database schema:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateDatabaseSchema()
    .then(() => {
      console.log("Schema update completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Schema update failed:", error);
      process.exit(1);
    });
}

export { updateDatabaseSchema };
