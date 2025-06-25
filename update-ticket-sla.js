
import { db } from "./server/db.js";
import { tickets } from "./shared/ticket-schema.js";
import { eq, isNull } from "drizzle-orm";

const calculateSLATargets = (priority, type) => {
  const slaMatrix = {
    critical: { 
      responseTime: 15, 
      resolutionTime: type === 'incident' ? 240 : 480,
      policy: 'P1 - Critical' 
    },
    high: { 
      responseTime: 60, 
      resolutionTime: type === 'incident' ? 480 : 1440,
      policy: 'P2 - High' 
    },
    medium: { 
      responseTime: 240, 
      resolutionTime: type === 'incident' ? 1440 : 2880,
      policy: 'P3 - Medium' 
    },
    low: { 
      responseTime: 480, 
      resolutionTime: type === 'incident' ? 2880 : 5760,
      policy: 'P4 - Low' 
    }
  };

  return slaMatrix[priority] || slaMatrix.medium;
};

async function updateTicketSLA() {
  try {
    console.log("🔧 Updating existing tickets with SLA information...");

    // Get all tickets without SLA due dates
    const ticketsToUpdate = await db
      .select()
      .from(tickets)
      .where(isNull(tickets.sla_resolution_due));

    console.log(`Found ${ticketsToUpdate.length} tickets to update`);

    for (const ticket of ticketsToUpdate) {
      const slaTargets = calculateSLATargets(ticket.priority, ticket.type);
      
      // Use created_at as base time for SLA calculation
      const baseTime = new Date(ticket.created_at);
      const slaResponseDue = new Date(baseTime.getTime() + (slaTargets.responseTime * 60 * 1000));
      const slaResolutionDue = new Date(baseTime.getTime() + (slaTargets.resolutionTime * 60 * 1000));

      await db
        .update(tickets)
        .set({
          sla_policy: slaTargets.policy,
          sla_response_time: slaTargets.responseTime,
          sla_resolution_time: slaTargets.resolutionTime,
          sla_response_due: slaResponseDue,
          sla_resolution_due: slaResolutionDue,
          due_date: slaResolutionDue,
          // Check if SLA is already breached
          sla_breached: new Date() > slaResolutionDue && !['resolved', 'closed', 'cancelled'].includes(ticket.status)
        })
        .where(eq(tickets.id, ticket.id));

      console.log(`✅ Updated ${ticket.ticket_number} - ${slaTargets.policy}`);
    }

    console.log("\n🎉 SLA update completed!");

    // Show current SLA status
    const now = new Date();
    const allTickets = await db.select().from(tickets);
    
    let breached = 0;
    let dueIn2Hours = 0;
    let dueToday = 0;

    allTickets.forEach(ticket => {
      if (ticket.sla_resolution_due && !['resolved', 'closed', 'cancelled'].includes(ticket.status)) {
        const timeDiff = new Date(ticket.sla_resolution_due).getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);

        if (hoursDiff < 0) {
          breached++;
        } else if (hoursDiff <= 2) {
          dueIn2Hours++;
        } else if (hoursDiff <= 24) {
          dueToday++;
        }
      }
    });

    console.log("\n📊 Current SLA Status:");
    console.log(`  🔴 Breached: ${breached} tickets`);
    console.log(`  🟡 Due in 2 hours: ${dueIn2Hours} tickets`);
    console.log(`  🟠 Due today: ${dueToday} tickets`);

  } catch (error) {
    console.error("❌ Error updating ticket SLA:", error);
  } finally {
    process.exit(0);
  }
}

updateTicketSLA();
