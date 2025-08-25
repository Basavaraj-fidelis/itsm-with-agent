
import type { Express } from "express";
import { systemConfig } from "../../shared/system-config";

export function registerSystemConfigRoutes(app: Express, authenticateToken: any) {
  // Get current system configuration
  app.get("/api/system/config", async (req, res) => {
    try {
      const config = systemConfig.getConfig();
      res.json(config);
    } catch (error) {
      console.error("Error getting system config:", error);
      res.status(500).json({ error: "Failed to get system configuration" });
    }
  });

  // Update system configuration
  app.put("/api/system/config", async (req, res) => {
    try {
      const updates = req.body;
      
      // Validate configuration updates
      if (!isValidConfig(updates)) {
        return res.status(400).json({ error: "Invalid configuration format" });
      }

      systemConfig.updateConfig(updates);
      
      console.log("System configuration updated:", JSON.stringify(updates, null, 2));
      
      res.json({ 
        message: "Configuration updated successfully",
        config: systemConfig.getConfig()
      });
    } catch (error) {
      console.error("Error updating system config:", error);
      res.status(500).json({ error: "Failed to update system configuration" });
    }
  });

  // Get specific configuration section
  app.get("/api/system/config/:section", async (req, res) => {
    try {
      const section = req.params.section;
      const config = systemConfig.getConfig();
      
      if (!(section in config)) {
        return res.status(404).json({ error: "Configuration section not found" });
      }
      
      res.json({ [section]: (config as any)[section] });
    } catch (error) {
      console.error("Error getting config section:", error);
      res.status(500).json({ error: "Failed to get configuration section" });
    }
  });
}

function isValidConfig(config: any): boolean {
  try {
    // Basic validation - check for required structure
    return (
      config &&
      typeof config === 'object' &&
      (config.alerts ? isValidAlertsConfig(config.alerts) : true) &&
      (config.network ? isValidNetworkConfig(config.network) : true) &&
      (config.tickets ? isValidTicketsConfig(config.tickets) : true)
    );
  } catch (error) {
    return false;
  }
}

function isValidAlertsConfig(alerts: any): boolean {
  return (
    alerts &&
    typeof alerts === 'object' &&
    (!alerts.thresholds || isValidThresholds(alerts.thresholds))
  );
}

function isValidThresholds(thresholds: any): boolean {
  return (
    thresholds &&
    typeof thresholds === 'object' &&
    (!thresholds.cpu || isValidThresholdValues(thresholds.cpu)) &&
    (!thresholds.memory || isValidThresholdValues(thresholds.memory)) &&
    (!thresholds.disk || isValidThresholdValues(thresholds.disk))
  );
}

function isValidThresholdValues(values: any): boolean {
  return (
    values &&
    typeof values === 'object' &&
    (!values.warning || (typeof values.warning === 'number' && values.warning >= 0 && values.warning <= 100)) &&
    (!values.high || (typeof values.high === 'number' && values.high >= 0 && values.high <= 100)) &&
    (!values.critical || (typeof values.critical === 'number' && values.critical >= 0 && values.critical <= 100))
  );
}

function isValidNetworkConfig(network: any): boolean {
  return (
    network &&
    typeof network === 'object' &&
    (!network.scan || isValidScanConfig(network.scan)) &&
    (!network.agents || isValidAgentsConfig(network.agents))
  );
}

function isValidScanConfig(scan: any): boolean {
  return (
    scan &&
    typeof scan === 'object' &&
    (!scan.timeoutMs || (typeof scan.timeoutMs === 'number' && scan.timeoutMs > 0)) &&
    (!scan.retryAttempts || (typeof scan.retryAttempts === 'number' && scan.retryAttempts >= 0))
  );
}

function isValidAgentsConfig(agents: any): boolean {
  return (
    agents &&
    typeof agents === 'object' &&
    (!agents.heartbeatInterval || (typeof agents.heartbeatInterval === 'number' && agents.heartbeatInterval > 0)) &&
    (!agents.offlineThreshold || (typeof agents.offlineThreshold === 'number' && agents.offlineThreshold > 0))
  );
}

function isValidTicketsConfig(tickets: any): boolean {
  return (
    tickets &&
    typeof tickets === 'object' &&
    (!tickets.sla || isValidSlaConfig(tickets.sla))
  );
}

function isValidSlaConfig(sla: any): boolean {
  return (
    sla &&
    typeof sla === 'object' &&
    (!sla.defaultResponseTime || (typeof sla.defaultResponseTime === 'number' && sla.defaultResponseTime > 0)) &&
    (!sla.defaultResolutionTime || (typeof sla.defaultResolutionTime === 'number' && sla.defaultResolutionTime > 0)) &&
    (!sla.escalationTime || (typeof sla.escalationTime === 'number' && sla.escalationTime > 0))
  );
}
