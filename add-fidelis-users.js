
import pg from 'pg';
import bcrypt from 'bcrypt';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const fidelisUsers = [
  {
    email: "chetan.n@fidelisgroup.in",
    name: "Chetan N",
    phone: "+917506821694",
    role: "technician",
    department: "IT Support",
    group: "Technical Team"
  },
  {
    email: "sridhara.s@fidelisgroup.in", 
    name: "Sridhara S",
    phone: "+917506821696",
    role: "manager",
    department: "IT Management",
    group: "Management Team"
  },
  {
    email: "basavaraj.h@fidelisgroup.in",
    name: "Basavaraj H", 
    phone: "+919743322158",
    role: "technician",
    department: "Hardware Support",
    group: "Technical Team"
  },
  {
    email: "rakesh.s@fidelisgroup.in",
    name: "Rakesh S",
    phone: "+917506821697", 
    role: "user",
    department: "Operations",
    group: "End Users"
  }
];

async function addFidelisUsers() {
  try {
    console.log("👥 Adding Fidelis Group users and creating groups...\n");

    // First, create user groups
    const groups = [
      {
        name: "Technical Team",
        description: "IT technicians and support staff",
        type: "support",
        email: "technical@fidelisgroup.in"
      },
      {
        name: "Management Team", 
        description: "IT managers and supervisors",
        type: "management",
        email: "management@fidelisgroup.in"
      },
      {
        name: "End Users",
        description: "Standard end users and employees", 
        type: "department",
        email: "users@fidelisgroup.in"
      }
    ];

    console.log("📋 Creating user groups...");
    const groupIds = {};
    
    for (const group of groups) {
      try {
        const groupResult = await pool.query(`
          INSERT INTO groups (name, description, type, email, is_active)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (name) DO UPDATE SET 
            description = EXCLUDED.description,
            type = EXCLUDED.type,
            email = EXCLUDED.email
          RETURNING id, name;
        `, [group.name, group.description, group.type, group.email, true]);
        
        groupIds[group.name] = groupResult.rows[0].id;
        console.log(`✅ Created/Updated group: ${group.name}`);
      } catch (error) {
        console.log(`⚠️  Group ${group.name} may already exist, continuing...`);
      }
    }

    console.log("\n👤 Adding Fidelis users...");
    
    for (const user of fidelisUsers) {
      try {
        // Check if user already exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );

        let userId;
        if (existingUser.rows.length > 0) {
          // Update existing user
          const updateResult = await pool.query(`
            UPDATE users SET 
              name = $1, 
              phone = $2, 
              role = $3, 
              department = $4,
              is_active = true,
              updated_at = NOW()
            WHERE email = $5 
            RETURNING id, name, email;
          `, [user.name, user.phone, user.role, user.department, user.email]);
          
          userId = updateResult.rows[0].id;
          console.log(`🔄 Updated existing user: ${user.name} (${user.email})`);
        } else {
          // Create new user
          const defaultPassword = "Welcome123!"; // Users should change on first login
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);
          
          const insertResult = await pool.query(`
            INSERT INTO users (
              email, name, password_hash, role, department, phone, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, email;
          `, [
            user.email,
            user.name, 
            hashedPassword,
            user.role,
            user.department,
            user.phone,
            true
          ]);
          
          userId = insertResult.rows[0].id;
          console.log(`✅ Created new user: ${user.name} (${user.email})`);
        }

        // Add user to appropriate group
        if (groupIds[user.group]) {
          try {
            await pool.query(`
              INSERT INTO group_members (group_id, user_id, role, is_active)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (group_id, user_id) DO UPDATE SET
                role = EXCLUDED.role,
                is_active = true;
            `, [groupIds[user.group], userId, 'member', true]);
            
            console.log(`  📌 Added to group: ${user.group}`);
          } catch (groupError) {
            console.log(`  ⚠️  Could not add to group: ${groupError.message}`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error.message);
      }
    }

    console.log("\n📊 User summary:");
    const userCount = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      WHERE is_active = true
      GROUP BY role 
      ORDER BY role;
    `);
    
    userCount.rows.forEach(row => {
      console.log(`  ${row.role}: ${row.count} users`);
    });

    console.log("\n📋 Group summary:");
    const groupCount = await pool.query(`
      SELECT g.name, COUNT(gm.user_id) as member_count
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.is_active = true
      GROUP BY g.id, g.name
      ORDER BY g.name;
    `);
    
    groupCount.rows.forEach(row => {
      console.log(`  ${row.name}: ${row.member_count} members`);
    });

    console.log("\n🎉 Fidelis users and groups setup completed!");
    
  } catch (error) {
    console.error("❌ Error setting up Fidelis users:", error);
  } finally {
    await pool.end();
  }
}

addFidelisUsers();
