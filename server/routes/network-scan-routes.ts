
import type { Express } from "express";
import { networkScanService } from "../services/network-scan-service";

export function registerNetworkScanRoutes(app: Express) {
  // Get available agents for scanning
  app.get("/api/network-scan/agents", async (req, res) => {
    try {
      const agents = await networkScanService.getAvailableAgents();
      res.json(agents);
    } catch (error) {
      console.error("Error getting scan agents:", error);
      res.status(500).json({ error: "Failed to get available agents" });
    }
  });

  // Get default subnets
  app.get("/api/network-scan/subnets", async (req, res) => {
    try {
      const subnets = await networkScanService.getDefaultSubnets();
      res.json(subnets);
    } catch (error) {
      console.error("Error getting subnets:", error);
      res.status(500).json({ error: "Failed to get subnets" });
    }
  });

  // Initiate network scan
  app.post("/api/network-scan/initiate", async (req, res) => {
    try {
      const { subnets, scan_type, agent_assignments } = req.body;
      const userEmail = req.headers['user-email'] as string || 'admin@company.com';

      if (!subnets || !Array.isArray(subnets) || subnets.length === 0) {
        return res.status(400).json({ error: "Subnets are required" });
      }

      const result = await networkScanService.initiateScan({
        subnets,
        scan_type: scan_type || 'ping',
        initiated_by: userEmail,
        agent_assignments
      });

      res.json(result);
    } catch (error) {
      console.error("Error initiating scan:", error);
      res.status(500).json({ error: "Failed to initiate network scan" });
    }
  });

  // Get scan sessions
  app.get("/api/network-scan/sessions", async (req, res) => {
    try {
      const sessions = await networkScanService.getScanSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error getting scan sessions:", error);
      res.status(500).json({ error: "Failed to get scan sessions" });
    }
  });

  // Get specific scan session
  app.get("/api/network-scan/sessions/:sessionId", async (req, res) => {
    try {
      const session = await networkScanService.getScanSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Scan session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error getting scan session:", error);
      res.status(500).json({ error: "Failed to get scan session" });
    }
  });

  // Get scan results
  app.get("/api/network-scan/sessions/:sessionId/results", async (req, res) => {
    try {
      const results = await networkScanService.getScanResults(req.params.sessionId);
      res.json(results);
    } catch (error) {
      console.error("Error getting scan results:", error);
      res.status(500).json({ error: "Failed to get scan results" });
    }
  });

  // Export scan results
  app.get("/api/network-scan/sessions/:sessionId/export", async (req, res) => {
    try {
      const format = req.query.format as string || 'csv';
      const csvData = await networkScanService.exportScanResults(req.params.sessionId, format as any);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="network-scan-${req.params.sessionId}.csv"`);
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting scan results:", error);
      res.status(500).json({ error: "Failed to export scan results" });
    }
  });
}
