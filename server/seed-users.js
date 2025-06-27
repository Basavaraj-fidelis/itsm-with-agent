import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const users = [
      {
        email: 'john.smith@company.com',
        name: 'John Smith',
        password: 'password123',
        role: 'technician',
        department: 'IT Support',
        phone: null,
        active: true,
        last_login: null
      },
{
        email: 'sarah.wilson@company.com',
        name: 'Sarah Wilson',
        password: 'password123',
        role: 'technician',
        department: 'Network Operations',
        phone: null,
        active: true,
        last_login: null
      },
      {
        email: 'mike.chen@company.com',
        name: 'Mike Chen',
        password: 'password123',
        role: 'technician',
        department: 'Security',
        phone: null,
        active: true,
        last_login: null
      }
    ];

const sampleUsers = [
  {
    name: 'John Smith',
    email: 'john.smith@company.com',
    role: 'technician',
    department: 'IT Support',
    is_active: true
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    role: 'technician',
    department: 'IT Support',
    is_active: true
  },
  {
    name: 'Mike Davis',
    email: 'mike.davis@company.com',
    role: 'senior_technician',
    department: 'IT Support',
    is_active: true
  },
  {
    name: 'Lisa Chen',
    email: 'lisa.chen@company.com',
    role: 'technician',
    department: 'Network Support',
    is_active: true
  }
];

async function seedUsers() {
  try {
    console.log("👥 Creating sample technician users...\n");

    // Create users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(100) NOT NULL,
        department VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    for (const user of sampleUsers) {
      const insertQuery = `
        INSERT INTO users (name, email, role, department, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
        RETURNING id, name, email;
      `;

      const result = await pool.query(insertQuery, [
        user.name,
        user.email,
        user.role,
        user.department,
        user.is_active
      ]);

      if (result.rows.length > 0) {
        console.log(`✅ Created user: ${result.rows[0].name} (${result.rows[0].email})`);
      } else {
        console.log(`⚠️  User already exists: ${user.email}`);
      }
    }

    console.log("\n🎉 All technician users processed successfully!");

  } catch (error) {
    console.error("❌ Error creating users:", error);
  } finally {
    await pool.end();
  }
}

seedUsers();