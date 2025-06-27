
const bcrypt = require('bcrypt');
const { drizzle } = require('drizzle-orm/libsql');
const { createClient } = require('@libsql/client');
const { users } = require('./shared/user-schema');

async function createAdminUser() {
  // Create database connection
  const client = createClient({
    url: process.env.DATABASE_URL || 'file:./itsm.db'
  });
  
  const db = drizzle(client);

  try {
    // Hash the password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const adminUser = {
      id: crypto.randomUUID(),
      email: 'admin@company.com',
      name: 'System Administrator',
      password_hash: hashedPassword,
      role: 'admin',
      department: 'IT',
      phone: '+1-555-0123',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Insert or update admin user
    await db.insert(users).values(adminUser).onConflictDoUpdate({
      target: users.email,
      set: {
        password_hash: hashedPassword,
        is_active: true,
        updated_at: new Date()
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@company.com');
    console.log('Password: admin123');
    console.log('Role: admin');

    // Create tech user
    const techPassword = await bcrypt.hash('tech123', 10);
    const techUser = {
      id: crypto.randomUUID(),
      email: 'tech@company.com',
      name: 'Technical Support',
      password_hash: techPassword,
      role: 'technician',
      department: 'IT Support',
      phone: '+1-555-0124',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.insert(users).values(techUser).onConflictDoUpdate({
      target: users.email,
      set: {
        password_hash: techPassword,
        is_active: true,
        updated_at: new Date()
      }
    });

    console.log('✅ Tech user created successfully!');
    console.log('Email: tech@company.com');
    console.log('Password: tech123');
    console.log('Role: technician');

  } catch (error) {
    console.error('❌ Error creating users:', error);
  } finally {
    client.close();
  }
}

// Only run if called directly
if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };
