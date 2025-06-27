
import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const demoAccounts = [
  {
    email: "admin@company.com",
    password: "admin123", // Changed to match what's expected on login page
    username: "admin",
    first_name: "System",
    last_name: "Administrator",
    role: "admin",
    job_title: "System Administrator",
    location: "IT Department"
  },
  {
    email: "tech@company.com",
    password: "tech123",
    username: "technician",
    first_name: "Technical",
    last_name: "Support",
    role: "technician",
    job_title: "IT Technician",
    location: "IT Department"
  },
  {
    email: "manager@company.com",
    password: "demo123",
    username: "manager",
    first_name: "IT",
    last_name: "Manager",
    role: "manager",
    job_title: "IT Manager",
    location: "IT Department"
  },
  {
    email: "user@company.com",
    password: "demo123",
    username: "enduser",
    first_name: "End",
    last_name: "User",
    role: "end_user",
    job_title: "Employee",
    location: "Office"
  }
];

async function createDemoAccounts() {
  try {
    console.log("🔐 Creating demo accounts...\n");
    
    for (const account of demoAccounts) {
      // Check if user already exists
      const existingUser = await pool.query(
        "SELECT id, email FROM users WHERE email = $1",
        [account.email]
      );
      
      if (existingUser.rows.length > 0) {
        console.log(`⚠️  User ${account.email} already exists, updating password...`);
        
        // Update existing user with new password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(account.password, saltRounds);
        
        await pool.query(`
          UPDATE users 
          SET password_hash = $1, 
              first_name = $2, 
              last_name = $3,
              role = $4,
              job_title = $5,
              location = $6,
              is_active = true,
              updated_at = NOW()
          WHERE email = $7
        `, [
          password_hash,
          account.first_name,
          account.last_name,
          account.role,
          account.job_title,
          account.location,
          account.email
        ]);
        
        console.log(`✅ Updated ${account.email} (${account.role})`);
      } else {
        // Create new user
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(account.password, saltRounds);
        
        await pool.query(`
          INSERT INTO users (
            email, username, first_name, last_name, password_hash,
            role, job_title, location, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          account.email,
          account.username,
          account.first_name,
          account.last_name,
          password_hash,
          account.role,
          account.job_title,
          account.location,
          true
        ]);
        
        console.log(`✅ Created ${account.email} (${account.role})`);
      }
    }
    
    console.log("\n🎉 Demo accounts ready:");
    console.log("┌─────────────────────────┬──────────────┬─────────────────┐");
    console.log("│ Email                   │ Password     │ Role            │");
    console.log("├─────────────────────────┼──────────────┼─────────────────┤");
    console.log("│ admin@company.com       │ admin123     │ Administrator   │");
    console.log("│ tech@company.com        │ tech123      │ Technician      │");
    console.log("│ manager@company.com     │ demo123      │ Manager         │");
    console.log("│ user@company.com        │ demo123      │ End User        │");
    console.log("└─────────────────────────┴──────────────┴─────────────────┘");
    
    // Verify accounts
    const verifyResult = await pool.query(`
      SELECT email, role, is_active, created_at 
      FROM users 
      WHERE email IN ($1, $2, $3, $4)
      ORDER BY 
        CASE role 
          WHEN 'admin' THEN 1 
          WHEN 'manager' THEN 2 
          WHEN 'technician' THEN 3 
          WHEN 'end_user' THEN 4 
        END
    `, [
      'admin@company.com',
      'tech@company.com', 
      'manager@company.com',
      'user@company.com'
    ]);
    
    console.log("\n📋 Verified accounts in database:");
    verifyResult.rows.forEach(user => {
      console.log(`  ✓ ${user.email} (${user.role}) - Active: ${user.is_active}`);
    });
    
  } catch (error) {
    console.error("❌ Error creating demo accounts:", error);
  } finally {
    await pool.end();
  }
}

createDemoAccounts();
