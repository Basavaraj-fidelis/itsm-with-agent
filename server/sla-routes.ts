
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
}
