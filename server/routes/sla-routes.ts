import type { Express } from "express";
import { slaEscalationService } from "../services/sla-escalation-service";
import { slaMonitorService } from "../services/sla-monitor-service";
import { slaPolicyService } from "../services/sla-policy-service";

export function registerSLARoutes(app: Express) {
  // Get SLA dashboard data
  app.get("/api/sla/dashboard", async (req, res) => {
    try {
      const data = await slaEscalationService.getSLADashboardData();
      res.json(data);
    } catch (error) {
      console.error("Error fetching SLA dashboard data:", error);
      res.status(500).json({ error: "Failed to fetch SLA dashboard data" });
    }
  });

  // Trigger manual SLA escalation check
  app.post("/api/sla/check-escalations", async (req, res) => {
    try {
      await slaEscalationService.checkAndEscalateTickets();
      res.json({ message: "SLA escalation check completed" });
    } catch (error) {
      console.error("Error running SLA escalation check:", error);
      res.status(500).json({ error: "Failed to run SLA escalation check" });
    }
  });

  // Get SLA compliance report
  app.get("/api/sla/compliance-report", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      // This would fetch historical SLA data for reporting
      // For now, return current dashboard data
      const data = await slaEscalationService.getSLADashboardData();

      res.json({
        period: { startDate, endDate },
        compliance: data.compliance,
        totalTickets: data.totalTickets,
        breachedTickets: data.breached,
        summary: data
      });
    } catch (error) {
      console.error("Error generating SLA compliance report:", error);
      res.status(500).json({ error: "Failed to generate compliance report" });
    }
  });

  // Pause SLA for a ticket
  app.post("/api/tickets/:id/sla/pause", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const now = new Date();

      const { db } = await import("../db");
      const { tickets } = await import("@shared/ticket-schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(tickets)
        .set({
          sla_paused: true,
          sla_pause_reason: reason || "Manually paused",
          sla_paused_at: now,
          updated_at: now
        })
        .where(eq(tickets.id, id));

      res.json({ message: "SLA paused successfully" });
    } catch (error) {
      console.error("Error pausing SLA:", error);
      res.status(500).json({ error: "Failed to pause SLA" });
    }
  });

  // Resume SLA for a ticket
  app.post("/api/tickets/:id/sla/resume", async (req, res) => {
    try {
      const { id } = req.params;
      const now = new Date();

      const { db } = await import("../db");
      const { tickets } = await import("@shared/ticket-schema");
      const { eq } = await import("drizzle-orm");

      // Get current ticket to calculate pause duration
      const [ticket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, id));

      if (!ticket || !ticket.sla_paused_at) {
        return res.status(400).json({ error: "Ticket SLA is not paused" });
      }

      const pauseDuration = Math.floor(
        (now.getTime() - new Date(ticket.sla_paused_at).getTime()) / (1000 * 60)
      );
      const totalPausedTime = (ticket.sla_total_paused_time || 0) + pauseDuration;

      await db
        .update(tickets)
        .set({
          sla_paused: false,
          sla_pause_reason: null,
          sla_resumed_at: now,
          sla_total_paused_time: totalPausedTime,
          updated_at: now
        })
        .where(eq(tickets.id, id));

      res.json({ 
        message: "SLA resumed successfully",
        pausedFor: `${pauseDuration} minutes`,
        totalPausedTime: `${totalPausedTime} minutes`
      });
    } catch (error) {
      console.error("Error resuming SLA:", error);
      res.status(500).json({ error: "Failed to resume SLA" });
    }
  });



  // Get real-time SLA metrics
  app.get("/api/sla/metrics", async (req, res) => {
    try {
      const metrics = await slaMonitorService.getSLAMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching SLA metrics:", error);
      res.status(500).json({ error: "Failed to fetch SLA metrics" });
    }
  });

  // Get detailed SLA breach information
  app.get("/api/sla/breach-details", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { tickets } = await import("@shared/ticket-schema");
      const { not, inArray, or, eq } = await import("drizzle-orm");

      // Get all open tickets with SLA breaches
      const breachedTickets = await db
        .select()
        .from(tickets)
        .where(
          and(
            not(inArray(tickets.status, ['resolved', 'closed', 'cancelled'])),
            or(
              eq(tickets.sla_response_breached, true),
              eq(tickets.sla_resolution_breached, true),
              eq(tickets.sla_breached, true)
            )
          )
        );

      const breachDetails = breachedTickets.map(ticket => ({
        ticketNumber: ticket.ticket_number,
        title: ticket.title,
        priority: ticket.priority,
        assignedTo: ticket.assigned_to,
        responseBreached: ticket.sla_response_breached,
        resolutionBreached: ticket.sla_resolution_breached,
        legacyBreached: ticket.sla_breached && !ticket.sla_response_breached && !ticket.sla_resolution_breached,
        responseDue: ticket.response_due_at || ticket.sla_response_due,
        resolutionDue: ticket.resolve_due_at || ticket.sla_resolution_due,
        createdAt: ticket.created_at
      }));

      res.json({
        totalBreached: breachedTickets.length,
        responseBreaches: breachedTickets.filter(t => t.sla_response_breached).length,
        resolutionBreaches: breachedTickets.filter(t => t.sla_resolution_breached).length,
        legacyBreaches: breachedTickets.filter(t => t.sla_breached && !t.sla_response_breached && !t.sla_resolution_breached).length,
        details: breachDetails
      });
    } catch (error) {
      console.error("Error fetching SLA breach details:", error);
      res.status(500).json({ error: "Failed to fetch SLA breach details" });
    }
  });

  // Manual SLA breach check
  app.post("/api/sla/check-breaches", async (req, res) => {
    try {
      await slaMonitorService.checkSLABreaches();
      res.json({ message: "SLA breach check completed" });
    } catch (error) {
      console.error("Error running SLA breach check:", error);
      res.status(500).json({ error: "Failed to run SLA breach check" });
    }
  });

  // Create or update SLA policy
  app.post("/api/sla/policies", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { slaPolicies } = await import("@shared/sla-schema");

      const [policy] = await db
        .insert(slaPolicies)
        .values(req.body)
        .returning();

      res.status(201).json(policy);
    } catch (error) {
      console.error("Error creating SLA policy:", error);
      res.status(500).json({ error: "Failed to create SLA policy" });
    }
  });

  // Get all SLA policies
  app.get("/api/sla/policies", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { slaPolicies } = await import("@shared/sla-schema");

      const policies = await db.select().from(slaPolicies);
      res.json(policies);
    } catch (error) {
      console.error("Error fetching SLA policies:", error);
      res.status(500).json({ error: "Failed to fetch SLA policies" });
    }
  });

  // Manual SLA sync for existing tickets
  app.post("/api/sla/sync-tickets", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { tickets } = await import("@shared/ticket-schema");
      const { eq, isNull, not, inArray } = await import("drizzle-orm");

      // Get tickets without SLA data
      const ticketsToUpdate = await db
        .select()
        .from(tickets)
        .where(isNull(tickets.sla_resolution_due));

      let updated = 0;
      for (const ticket of ticketsToUpdate) {
        const { ticketStorage } = await import("../services/ticket-storage");
        const slaTargets = (ticketStorage as any).calculateSLATargets(ticket.priority, ticket.type);

        const baseTime = new Date(ticket.created_at);
        const slaResponseDue = new Date(baseTime.getTime() + (slaTargets.responseTime * 60 * 1000));
        const slaResolutionDue = new Date(baseTime.getTime() + (slaTargets.resolutionTime * 60 * 1000));
        const isBreached = new Date() > slaResolutionDue && !['resolved', 'closed', 'cancelled'].includes(ticket.status);

        await db
          .update(tickets)
          .set({
            sla_policy: slaTargets.policy,
            sla_response_time: slaTargets.responseTime,
            sla_resolution_time: slaTargets.resolutionTime,
            sla_response_due: slaResponseDue,
            sla_resolution_due: slaResolutionDue,
            due_date: slaResolutionDue,
            sla_breached: isBreached,
            updated_at: new Date()
          })
          .where(eq(tickets.id, ticket.id));

        updated++;
      }

      res.json({ 
        message: `SLA sync completed for ${updated} tickets`,
        updated 
      });
    } catch (error) {
      console.error("Error syncing SLA data:", error);
      res.status(500).json({ error: "Failed to sync SLA data" });
    }
  });

  // Sync SLA status for all tickets (fix inconsistencies)
  app.post("/api/sla/sync-status", async (req, res) => {
    try {
      const metrics = await slaMonitorService.getSLAMetrics();
      res.json({
        message: "SLA status synchronized successfully",
        metrics
      });
    } catch (error) {
      console.error("Error syncing SLA status:", error);
      res.status(500).json({ error: "Failed to sync SLA status" });
    }
  });
}