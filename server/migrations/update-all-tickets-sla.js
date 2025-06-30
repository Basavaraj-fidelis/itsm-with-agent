
import { db, sql } from "../db.ts";
import { tickets } from "../../shared/ticket-schema.ts";
import { eq } from "drizzle-orm";

const calculateSLATargets = (priority, type, createdAt) => {
  const slaMatrix = {
    critical: {
      responseTime: 15,
      resolutionTime: type === "incident" ? 240 : 480,
      policy: "P1 - Critical",
    },
    high: {
      responseTime: 60,
      resolutionTime: type === "incident" ? 480 : 1440,
      policy: "P2 - High",
    },
    medium: {
      responseTime: 240,
      resolutionTime: type === "incident" ? 1440 : 2880,
      policy: "P3 - Medium",
    },
    low: {
      responseTime: 480,
      resolutionTime: type === "incident" ? 2880 : 5760,
      policy: "P4 - Low",
    },
  };

  const slaData = slaMatrix[priority] || slaMatrix.medium;
  const baseTime = new Date(createdAt);

  return {
    ...slaData,
    responseDue: new Date(
      baseTime.getTime() + slaData.responseTime * 60 * 1000,
    ),
    resolutionDue: new Date(
      baseTime.getTime() + slaData.resolutionTime * 60 * 1000,
    ),
  };
};

async function updateAllTicketsSLA() {
  try {
    console.log("🔧 Updating ALL tickets with SLA information...");

    // Get all tickets
    const allTickets = await db.select().from(tickets);
    console.log(`Found ${allTickets.length} tickets to update`);

    let updated = 0;
    const now = new Date();

    for (const ticket of allTickets) {
      const slaTargets = calculateSLATargets(
        ticket.priority,
        ticket.type,
        ticket.created_at,
      );

      // Check if already breached
      const isResponseBreached =
        !ticket.first_response_at && now > slaTargets.responseDue;
      const isResolutionBreached =
        now > slaTargets.resolutionDue &&
        !["resolved", "closed", "cancelled"].includes(ticket.status);

      await db
        .update(tickets)
        .set({
          sla_policy: slaTargets.policy,
          sla_response_time: slaTargets.responseTime,
          sla_resolution_time: slaTargets.resolutionTime,
          response_due_at: slaTargets.responseDue,
          resolve_due_at: slaTargets.resolutionDue,
          sla_response_due: slaTargets.responseDue,
          sla_resolution_due: slaTargets.resolutionDue,
          due_date: slaTargets.resolutionDue,
          sla_response_breached: isResponseBreached,
          sla_resolution_breached: isResolutionBreached,
          sla_breached: isResolutionBreached, // Legacy field
          updated_at: now,
        })
        .where(eq(tickets.id, ticket.id));

      updated++;

      const breachStatus = isResolutionBreached
        ? "🔴 BREACHED"
        : isResponseBreached
          ? "🟡 RESPONSE BREACH"
          : "✅ OK";

      console.log(
        `✅ Updated ${ticket.ticket_number} - ${slaTargets.policy} ${breachStatus}`,
      );
    }

    console.log(`\n🎉 SLA update completed! Updated ${updated} tickets`);

    // Show current SLA status
    const breachedTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.sla_breached, true));

    const responseBreach = await db
      .select()
      .from(tickets)
      .where(eq(tickets.sla_response_breached, true));

    console.log("\n📊 Current SLA Status:");
    console.log(`  🔴 Resolution Breached: ${breachedTickets.length} tickets`);
    console.log(`  🟡 Response Breached: ${responseBreach.length} tickets`);
    console.log(
      `  📅 Total Active Tickets: ${allTickets.filter((t) => !["resolved", "closed", "cancelled"].includes(t.status)).length}`,
    );
  } catch (error) {
    console.error("❌ Error updating ticket SLA:", error);
  } finally {
    process.exit(0);
  }
}

updateAllTicketsSLA();
