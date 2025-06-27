
import type { Express } from "express";
import { slaEscalationService } from "./sla-escalation-service";

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

  // Manual SLA sync for existing tickets
  app.post("/api/sla/sync-tickets", async (req, res) => {
    try {
      const { db } = await import("./db");
      const { tickets } = await import("@shared/ticket-schema");
      const { eq, isNull } = await import("drizzle-orm");

      // Get tickets without SLA data
      const ticketsToUpdate = await db
        .select()
        .from(tickets)
        .where(isNull(tickets.sla_resolution_due));

      let updated = 0;
      for (const ticket of ticketsToUpdate) {
        const { ticketStorage } = await import("./ticket-storage");
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
}
