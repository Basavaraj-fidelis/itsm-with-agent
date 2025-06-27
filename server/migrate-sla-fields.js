
import { db } from "./db.js";

async function migrateSLAFields() {
  try {
    console.log("🔄 Adding missing SLA fields to tickets table...");

    // Add missing SLA fields
    const alterQueries = [
      `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_policy_id UUID`,
      `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS response_due_at TIMESTAMP`,
      `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolve_due_at TIMESTAMP`,
      `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolve_actual_at TIMESTAMP`,
      `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_response_breached BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_resolution_breached BOOLEAN DEFAULT FALSE`,
    ];

    for (const query of alterQueries) {
      try {
        await db.execute(query);
        console.log(`✅ Executed: ${query}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️  Column already exists, skipping: ${query}`);
        } else {
          console.error(`❌ Error executing query: ${query}`, error);
        }
      }
    }

    // Create indexes for better performance
    const indexQueries = [
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_sla_response_due ON tickets(response_due_at) WHERE response_due_at IS NOT NULL`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_sla_resolve_due ON tickets(resolve_due_at) WHERE resolve_due_at IS NOT NULL`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_sla_breached ON tickets(sla_breached, sla_response_breached, sla_resolution_breached)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_status_sla ON tickets(status, resolve_due_at) WHERE status NOT IN ('resolved', 'closed', 'cancelled')`,
    ];

    for (const query of indexQueries) {
      try {
        await db.execute(query);
        console.log(`✅ Created index: ${query}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️  Index already exists, skipping`);
        } else {
          console.error(`❌ Error creating index:`, error);
        }
      }
    }

    console.log("🎉 SLA fields migration completed successfully!");

  } catch (error) {
    console.error("❌ Error during SLA fields migration:", error);
    throw error;
  }
}

// Check if this script is being run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  migrateSLAFields()
    .then(() => {
      console.log("Migration completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migrateSLAFields };
