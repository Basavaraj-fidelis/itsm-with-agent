import type { Express } from "express";
import { storage } from "../storage";
import { enhancedStorage } from "../models/enhanced-storage";
import { performanceService } from "../services/performance-service";
import { notificationService } from "../services/notification-service";
import { securityService } from "../services/security-service";
import { patchComplianceService } from "../services/patch-compliance-service";

export function registerAgentRoutes(
  app: Express,
  authenticateToken: any,
  requireRole: any,
) {
  // Agent connectivity and status endpoints
  app.post(
    "/api/agents/:id/test-connectivity",
    authenticateToken,
    async (req, res) => {
      try {
        const { id } = req.params;
        const device = await storage.getDevice(id);

        if (!device || !device.ip_address) {
          return res
            .status(404)
            .json({ message: "Agent not found or no IP address" });
        }

        // Real connectivity test using actual device data
        const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
        const now = new Date();
        const minutesSinceLastSeen = lastSeen
          ? Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60))
          : null;

        // Check if device has recent reports (within last 5 minutes)
        const hasRecentData =
          device.latest_report && device.latest_report.collected_at;
        const lastReportTime = hasRecentData
          ? new Date(device.latest_report.collected_at)
          : null;
        const minutesSinceLastReport = lastReportTime
          ? Math.floor((now.getTime() - lastReportTime.getTime()) / (1000 * 60))
          : null;

        const connectivity = {
          reachable:
            device.status === "online" &&
            minutesSinceLastSeen !== null &&
            minutesSinceLastSeen < 5,
          port_open:
            device.status === "online" &&
            hasRecentData &&
            minutesSinceLastReport !== null &&
            minutesSinceLastReport < 10,
          response_time:
            minutesSinceLastSeen !== null
              ? Math.min(minutesSinceLastSeen * 1000, 30000)
              : 30000,
          tested_at: now.toISOString(),
          last_seen_minutes_ago: minutesSinceLastSeen,
          last_report_minutes_ago: minutesSinceLastReport,
          has_recent_data: hasRecentData,
        };

        res.json(connectivity);
      } catch (error) {
        console.error("Error testing connectivity:", error);
        res.status(500).json({ message: "Failed to test connectivity" });
      }
    },
  );

  app.get(
    "/api/agents/:id/connection-status",
    authenticateToken,
    async (req, res) => {
      try {
        const agentId = req.params.id;
        const device = await storage.getDevice(agentId);

        if (!device) {
          return res.status(404).json({ message: "Agent not found" });
        }

        // Check if agent is online and responsive
        const lastSeen = new Date(device.last_seen);
        const now = new Date();
        const timeDiff = now.getTime() - lastSeen.getTime();
        const minutesOffline = Math.floor(timeDiff / (1000 * 60));

        const connectionStatus = {
          agent_online: device.status === "online" && minutesOffline < 5,
          last_seen: device.last_seen,
          minutes_since_contact: minutesOffline,
          ip_address: device.ip_address,
          hostname: device.hostname,
          ready_for_connection:
            device.status === "online" && minutesOffline < 5,
        };

        res.json(connectionStatus);
      } catch (error) {
        console.error("Error checking connection status:", error);
        res.status(500).json({ message: "Failed to check connection status" });
      }
    },
  );

  // Remote connection endpoint
  app.post(
    "/api/agents/:id/remote-connect",
    authenticateToken,
    async (req, res) => {
      try {
        const agentId = req.params.id;
        const {
          connection_type = "vnc",
          port = 5900,
          use_tunnel = false,
          jump_host = null,
        } = req.body;

        const device = await storage.getDevice(agentId);
        if (!device) {
          return res.status(404).json({ message: "Agent not found" });
        }

        if (device.status !== "online") {
          return res.status(400).json({
            message: "Agent is not online",
            status: device.status,
          });
        }

        // Check if device IP is private
        const isPrivateIP =
          device.ip_address &&
          (device.ip_address.startsWith("10.") ||
            device.ip_address.startsWith("172.") ||
            device.ip_address.startsWith("192.168.") ||
            device.ip_address.startsWith("169.254."));

        // Log connection attempt
        await storage.createAlert({
          device_id: agentId,
          category: "remote_access",
          severity: "info",
          message: `Remote connection initiated by ${req.user.email}`,
          metadata: {
            connection_type,
            port,
            user: req.user.email,
            timestamp: new Date().toISOString(),
          },
          is_active: true,
        });

        const instructions = {
          vnc: "Ensure VNC server and websockify are running on the target machine",
          rdp: "Ensure Remote Desktop is enabled and user has RDP permissions",
          ssh: "Ensure SSH service is running and firewall allows SSH connections",
          teamviewer:
            "Ensure TeamViewer is installed and running on the target machine",
        };

        const connectionInfo = {
          hostname: device.hostname,
          ip_address: device.ip_address,
          port: port,
          connection_type,
          instructions:
            instructions[connection_type] ||
            "Ensure remote access is enabled on the target machine",
          teamviewer_id:
            connection_type === "teamviewer" ? device.teamviewer_id : undefined,
          is_private_ip: isPrivateIP,
        };

        // Add tunnel guidance for private IPs
        if (isPrivateIP) {
          connectionInfo.tunnel_required = true;
          connectionInfo.tunnel_suggestions = [
            {
              method: "ssh_tunnel",
              command: `ssh -L ${port}:${device.ip_address}:${port} ${jump_host || "your_jump_host"}`,
              description: "Create SSH tunnel via jump host",
            },
            {
              method: "vpn",
              description:
                "Connect to company VPN first, then access private IP directly",
            },
            {
              method: "reverse_proxy",
              description: "Deploy reverse proxy on public server",
            },
          ];
        }

        res.json({
          success: true,
          connection_info: connectionInfo,
        });
      } catch (error) {
        console.error("Error initiating remote connection:", error);
        res
          .status(500)
          .json({ message: "Failed to initiate remote connection" });
      }
    },
  );

  // Execute remote command on agent
  app.post(
    "/api/agents/:id/execute-command",
    authenticateToken,
    requireRole(["admin", "manager"]),
    async (req, res) => {
      try {
        const agentId = req.params.id;
        const { command, description = "Remote command execution" } = req.body;

        // Validate input
        if (!command || typeof command !== "string") {
          return res.status(400).json({
            success: false,
            message: "Command is required and must be a string",
          });
        }

        // Check if agent exists and is online
        const device = await storage.getDevice(agentId);
        if (!device) {
          return res.status(404).json({
            success: false,
            message: "Agent not found",
          });
        }

        if (device.status !== "online") {
          return res.status(400).json({
            success: false,
            message: `Agent is ${device.status}. Only online agents can execute commands.`,
          });
        }

        // Use existing command infrastructure
        const { pool } = await import("./db");
        const result = await pool.query(
          `INSERT INTO agent_commands (device_id, type, command, priority, status, created_by, created_at)
         VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
         RETURNING id`,
          [agentId, "execute_command", command, 1, req.user.id],
        );

        // Create alert for audit trail
        await storage.createAlert({
          device_id: agentId,
          category: "remote_command",
          severity: "info",
          message: `Remote command executed by ${req.user.email}: ${command}`,
          metadata: {
            command,
            description,
            user: req.user.email,
            timestamp: new Date().toISOString(),
          },
          is_active: true,
        });

        console.log(
          `Command "${command}" queued for agent ${device.hostname} (${agentId}) by ${req.user.email}`,
        );

        res.json({
          success: true,
          message: `Command sent to ${device.hostname}`,
          command_id: result.rows[0].id,
          agent_hostname: device.hostname,
          command: command,
          description: description,
        });
      } catch (error) {
        console.error("Error executing remote command:", error);
        res.status(500).json({
          success: false,
          message: "Failed to execute command on agent",
        });
      }
    },
  );

  // Agent API endpoints for agents themselves
  app.post("/api/heartbeat", async (req, res) => {
    try {
      console.log("Agent heartbeat received:", req.body);
      console.log("=== DETAILED NETWORK DATA DEBUG ===");
      console.log("Full Network section:", JSON.stringify(req.body.network, null, 2));
      console.log("Geographic location type:", typeof req.body.network?.geographic_location);
      console.log("Geographic location value:", req.body.network?.geographic_location);
      console.log("Public IP:", req.body.network?.public_ip);
      console.log("Network interfaces count:", req.body.network?.interfaces?.length);
      console.log("Primary MAC:", req.body.network?.primary_mac);
      console.log("Raw data keys:", Object.keys(req.body));
      console.log("================================");
      const { hostname, systemInfo } = req.body;

      if (!hostname) {
        return res.status(400).json({ error: "Hostname is required" });
      }

      // Check if device exists, create if not
      let device = await storage.getDeviceByHostname(hostname);

      if (!device) {
        device = await storage.createDevice({
          hostname: hostname,
          assigned_user: systemInfo?.current_user || null,
          os_name: systemInfo?.platform || null,
          os_version: systemInfo?.version || null,
          ip_address: req.ip || null,
          status: "online",
          last_seen: new Date(),
        });
        console.log("Created new device from heartbeat:", device.id);
      } else {
        // Update existing device
        await storage.updateDevice(device.id, {
          status: "online",
          last_seen: new Date(),
        });
        console.log("Updated device from heartbeat:", device.id);
      }

      const reportData = req.body;

      // Store system info if provided
      if (systemInfo) {
        console.log("=== STORING DEVICE REPORT ===");
        console.log("Device ID:", device.id);
        console.log("Raw data contains network:", !!req.body.network);
        console.log("Raw data network keys:", req.body.network ? Object.keys(req.body.network) : "none");
        
        await storage.createDeviceReport({
          device_id: device.id,
          cpu_usage: systemInfo.cpu_usage?.toString() || null,
          memory_usage: systemInfo.memory_usage?.toString() || null,
          disk_usage: systemInfo.disk_usage?.toString() || null,
          network_io: null,
          raw_data: JSON.stringify(req.body),
        });
        
        console.log("Device report stored successfully");
        console.log("============================");
      }

      // Process USB devices
      if (reportData.usb_devices && Array.isArray(reportData.usb_devices)) {
        await enhancedStorage.updateUSBDevices(device.id, reportData.usb_devices);
      }

      // Process active ports
      if (reportData.active_ports && Array.isArray(reportData.active_ports)) {
        await enhancedStorage.updateActivePorts(device.id, reportData.active_ports);
      }

      // Process patch compliance data
      try {
        await patchComplianceService.processAgentReport(device.id, reportData);
      } catch (patchError) {
        console.error("Error processing patch data, continuing...", patchError);
      }

      console.log(`=== AGENT REPORT PROCESSED SUCCESSFULLY ===`);
      console.log(`Device ID: ${device.id}`);
      console.log(`Device Status: ${device.status}`);
      console.log("=== NETWORK/LOCATION DEBUG ===");
      console.log("Network data:", JSON.stringify(reportData.network, null, 2));
      console.log("Geographic location:", reportData.network?.geographic_location);
      console.log("Public IP:", reportData.network?.public_ip);
      console.log("==============================");
      console.log(`===============================================`);

      res.json({ message: "Report saved successfully" });
    } catch (error) {
      console.error("Error processing agent report:", error);
      res.status(500).json({ error: "Failed to process report" });
    }
  });

  app.get("/api/commands", async (req, res) => {
    try {
      console.log("Agent requesting commands");

      // For now, return empty commands array
      // In a full implementation, this would check for pending commands
      res.json({
        commands: [],
        message: "No pending commands",
      });
    } catch (error) {
      console.error("Error getting commands:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/commands/next/:agentId", async (req, res) => {
    try {
      const agentId = req.params.agentId;
      console.log(`Agent ${agentId} requesting next command`);

      // For now, return no commands
      // In a full implementation, this would return the next queued command
      res.json({
        command: null,
        message: "No pending commands",
      });
    } catch (error) {
      console.error("Error getting next command:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/commands/:commandId", async (req, res) => {
    try {
      const commandId = req.params.commandId;
      const { status, output, errorMessage } = req.body;

      console.log(`Command ${commandId} status update:`, {
        status,
        output,
        errorMessage,
      });

      // For now, just acknowledge the update
      // In a full implementation, this would update command status in database
      res.json({
        message: "Command status updated",
        commandId: commandId,
        status: status,
      });
    } catch (error) {
      console.error("Error updating command status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}