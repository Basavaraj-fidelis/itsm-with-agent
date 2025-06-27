
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function fixUsersDatabase() {
  try {
    console.log("🔧 Fixing users database...");
    
    // Drop existing users table if it has issues
    console.log("Dropping existing users table...");
    await pool.query(`DROP TABLE IF EXISTS users CASCADE`);
    
    // Create users table with proper schema
    console.log("Creating users table with proper schema...");
    await pool.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100),
        name VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        password_hash TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        department VARCHAR(100),
        phone VARCHAR(50),
        job_title VARCHAR(100),
        location VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        is_locked BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Insert demo users
    console.log("Creating demo users...");
    const bcrypt = require('bcrypt');
    
    const demoUsers = [
      {
        email: "admin@company.com",
        username: "admin",
        name: "System Administrator",
        first_name: "System",
        last_name: "Administrator", 
        password_hash: await bcrypt.hash("admin123", 10),
        role: "admin",
        department: "IT",
        phone: "+1-555-0101",
        job_title: "System Administrator",
        location: "HQ",
      },
      {
        email: "manager@company.com",
        username: "manager",
        name: "IT Manager",
        first_name: "IT",
        last_name: "Manager",
        password_hash: await bcrypt.hash("demo123", 10),
        role: "manager",
        department: "IT",
        phone: "+1-555-0102",
        job_title: "IT Manager",
        location: "HQ",
      },
      {
        email: "tech@company.com",
        username: "tech",
        name: "Senior Technician",
        first_name: "Senior",
        last_name: "Technician",
        password_hash: await bcrypt.hash("tech123", 10),
        role: "technician",
        department: "IT Support",
        phone: "+1-555-0103",
        job_title: "Senior Technician",
        location: "HQ",
      },
      {
        email: "user@company.com",
        username: "enduser",
        name: "End User",
        first_name: "End",
        last_name: "User",
        password_hash: await bcrypt.hash("demo123", 10),
        role: "user",
        department: "Sales",
        phone: "+1-555-0104",
        job_title: "Sales Representative",
        location: "Branch Office",
      },
      {
        email: "jane.smith@company.com",
        username: "jsmith",
        name: "Jane Smith",
        first_name: "Jane",
        last_name: "Smith",
        password_hash: await bcrypt.hash("demo123", 10),
        role: "user",
        department: "Marketing",
        phone: "+1-555-0105",
        job_title: "Marketing Specialist",
        location: "HQ",
      },
      {
        email: "bob.wilson@company.com",
        username: "bwilson",
        name: "Bob Wilson",
        first_name: "Bob",
        last_name: "Wilson",
        password_hash: await bcrypt.hash("demo123", 10),
        role: "technician",
        department: "IT Support",
        phone: "+1-555-0106",
        job_title: "IT Technician",
        location: "Branch Office",
      },
    ];

    for (const user of demoUsers) {
      await pool.query(`
        INSERT INTO users (
          email, username, name, first_name, last_name, password_hash, 
          role, department, phone, job_title, location, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        user.email, user.username, user.name, user.first_name, user.last_name,
        user.password_hash, user.role, user.department, user.phone, 
        user.job_title, user.location, true
      ]);
      
      console.log(`✅ Created user: ${user.name} (${user.email})`);
    }
    
    // Verify users were created
    const result = await pool.query('SELECT id, email, name, role FROM users ORDER BY email');
    console.log("\n📊 Users in database:");
    result.rows.forEach(user => {
      console.log(`  ${user.name} (${user.email}) - ${user.role}`);
    });
    
    console.log(`\n🎉 Successfully created ${result.rows.length} users!`);
    
  } catch (error) {
    console.error("❌ Error fixing users database:", error);
  } finally {
    await pool.end();
  }
}

fixUsersDatabase();
