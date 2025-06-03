
import { sql } from "drizzle-orm";
import { db } from "./db";

async function dropUserTables() {
  try {
    console.log("Dropping user tables...");
    
    // Drop user_sessions table first (has foreign key reference)
    await db.execute(sql`DROP TABLE IF EXISTS user_sessions CASCADE`);
    console.log("Dropped user_sessions table");
    
    // Drop users table
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
    console.log("Dropped users table");
    
    console.log("User tables dropped successfully!");
  } catch (error) {
    console.error("Error dropping user tables:", error);
    throw error;
  }
}

// Run the migration
dropUserTables().catch(console.error);
