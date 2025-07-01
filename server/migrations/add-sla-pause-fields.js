
const { drizzle } = require("drizzle-orm/postgres-js");
const postgres = require("postgres");

async function addSLAPauseFields() {
  console.log("🔧 Adding SLA pause fields to tickets table...");
  
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL not found");
    }

    const sql = postgres(connectionString);
    
    // Add SLA pause fields to tickets table
    await sql`
      ALTER TABLE tickets 
      ADD COLUMN IF NOT EXISTS sla_paused BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS sla_pause_reason TEXT,
      ADD COLUMN IF NOT EXISTS sla_paused_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS sla_resumed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS sla_total_paused_time INTEGER DEFAULT 0;
    `;

    console.log("✅ SLA pause fields added successfully!");
    
    // Update existing tickets to have default values
    const result = await sql`
      UPDATE tickets 
      SET sla_paused = FALSE, 
          sla_total_paused_time = 0 
      WHERE sla_paused IS NULL;
    `;
    
    console.log(`✅ Updated ${result.count} existing tickets with default SLA pause values`);
    
    await sql.end();
  } catch (error) {
    console.error("❌ Error adding SLA pause fields:", error);
  }
}

// Run if called directly
if (require.main === module) {
  addSLAPauseFields().then(() => process.exit(0));
}

module.exports = { addSLAPauseFields };
