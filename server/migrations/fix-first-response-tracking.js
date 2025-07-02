
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { tickets } from "../shared/ticket-schema.js";
import { eq, and, isNotNull, isNull } from "drizzle-orm";

async function fixFirstResponseTracking() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error("DATABASE_URL not found");
  }

  // Use the same SSL configuration as the main app
  const sql = postgres(connectionString, {
    ssl: connectionString.includes('aivencloud.com') ? {
      rejectUnauthorized: false,
    } : false,
    connection: {
      application_name: 'itsm-first-response-fix',
    }
  });

  const db = drizzle(sql);

  try {
    console.log("🔧 Fixing first response tracking for existing tickets...");

    // Get tickets that have been assigned but don't have first_response_at set
    const ticketsToUpdate = await db
      .select()
      .from(tickets)
      .where(
        and(
          isNotNull(tickets.assigned_to),
          isNull(tickets.first_response_at)
        )
      );

    console.log(`Found ${ticketsToUpdate.length} tickets to update`);

    let updated = 0;
    for (const ticket of ticketsToUpdate) {
      // Set first_response_at to the assignment time (updated_at or created_at)
      const firstResponseTime = ticket.updated_at || ticket.created_at;
      
      await db
        .update(tickets)
        .set({
          first_response_at: firstResponseTime,
          sla_response_breached: false, // Clear false breach if assignment happened in time
          updated_at: new Date()
        })
        .where(eq(tickets.id, ticket.id));

      updated++;
      console.log(`✅ Updated first response for ticket ${ticket.ticket_number}`);
    }

    console.log(`✅ Fixed first response tracking for ${updated} tickets`);
    
    // Also clear any false SLA response breaches
    const falseBreach = await db
      .update(tickets)
      .set({
        sla_response_breached: false,
        updated_at: new Date()
      })
      .where(
        and(
          eq(tickets.sla_response_breached, true),
          isNotNull(tickets.assigned_to)
        )
      );

    console.log("✅ Cleared false SLA response breaches for assigned tickets");

  } catch (error) {
    console.error("❌ Error fixing first response tracking:", error);
  } finally {
    await sql.end();
  }
}

// Run the fix
fixFirstResponseTracking().catch(console.error);
