
import { db } from "./server/db.js";
import { users } from "./shared/user-schema.js";
import bcrypt from "bcrypt";

async function createAdminUser() {
  try {
    const email = "admin@itsm.dev";
    const password = "admin123!";
    const name = "System Administrator";
    
    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    
    if (existingUser.length > 0) {
      console.log("Admin user already exists!");
      console.log("Email:", email);
      console.log("Password:", password);
      return;
    }
    
    // Create admin user
    const newUser = await db.insert(users).values({
      email,
      name,
      password_hash,
      role: "admin",
      department: "IT Administration",
      phone: "+1-555-0100",
      is_active: true
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role
    });
    
    console.log("✅ Admin user created successfully!");
    console.log("📧 Email:", email);
    console.log("🔑 Password:", password);
    console.log("👤 Name:", name);
    console.log("🎯 Role: admin");
    console.log("\n🚀 You can now login to your application!");
    
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();
