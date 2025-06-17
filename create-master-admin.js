
import pg from 'pg';
import bcrypt from 'bcrypt';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function createMasterAdmin() {
  try {
    console.log("🔐 Creating master admin user...");
    
    const adminEmail = "admin@company.com";
    const adminPassword = "Admin123!";
    const adminUsername = "admin";
    
    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [adminEmail, adminUsername]
    );
    
    if (existingAdmin.rows.length > 0) {
      console.log("⚠️ Master admin already exists!");
      return;
    }
    
    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(adminPassword, saltRounds);
    
    // Create master admin
    const result = await pool.query(`
      INSERT INTO users (
        email, username, first_name, last_name, role, 
        password_hash, is_active, job_title, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, email, username, role
    `, [
      adminEmail,
      adminUsername,
      'Master',
      'Administrator',
      'admin',
      password_hash,
      true,
      'System Administrator',
      'Head Office'
    ]);
    
    const admin = result.rows[0];
    
    console.log("✅ Master admin created successfully!");
    console.log("📧 Email:", adminEmail);
    console.log("👤 Username:", adminUsername);
    console.log("🔑 Password:", adminPassword);
    console.log("🆔 User ID:", admin.id);
    
    // Also create some demo users with new schema
    console.log("\n👥 Creating demo users...");
    
    const demoUsers = [
      {
        email: "tech1@company.com",
        username: "tech1",
        first_name: "John",
        last_name: "Technician",
        role: "technician",
        password: "Tech123!",
        job_title: "IT Technician",
        department: "IT"
      },
      {
        email: "manager@company.com",
        username: "manager1",
        first_name: "Sarah",
        last_name: "Manager",
        role: "manager",
        password: "Manager123!",
        job_title: "IT Manager",
        department: "IT"
      },
      {
        email: "user@company.com",
        username: "enduser1",
        first_name: "Mike",
        last_name: "Employee",
        role: "end_user",
        password: "User123!",
        job_title: "Accountant",
        department: "Finance"
      }
    ];
    
    for (const user of demoUsers) {
      const userPasswordHash = await bcrypt.hash(user.password, saltRounds);
      
      const userResult = await pool.query(`
        INSERT INTO users (
          email, username, first_name, last_name, role,
          password_hash, is_active, job_title, location
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING username, role
      `, [
        user.email,
        user.username,
        user.first_name,
        user.last_name,
        user.role,
        userPasswordHash,
        true,
        user.job_title,
        'Main Office'
      ]);
      
      console.log(`✅ Created ${user.role}: ${user.username} (${user.email})`);
    }
    
    console.log("\n🎉 All demo accounts created successfully!");
    console.log("\n📋 Login Credentials:");
    console.log("👑 Master Admin: admin@company.com / Admin123!");
    console.log("🔧 Technician: tech1@company.com / Tech123!");
    console.log("👔 Manager: manager@company.com / Manager123!");
    console.log("👤 End User: user@company.com / User123!");
    
  } catch (error) {
    console.error("❌ Error creating master admin:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

createMasterAdmin();
