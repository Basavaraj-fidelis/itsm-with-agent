import type { Express } from "express";
import { storage } from "../storage";
import { enhancedStorage } from "../models/enhanced-storage";
import { performanceService } from "../services/performance-service";
import { notificationService } from "../services/notification-service";
import { securityService } from "../services/security-service";
import { patchComplianceService } from "../services/patch-compliance-service";
import { websocketService } from "../websocket-service";

// Helper function to generate a device ID if not provided
function generateDeviceId(report: any): string {
  // Simple heuristic: use hostname and first network MAC address if available
  const hostname = report.hostname || `unknown_${Date.now()}`;
  const macAddress = report.network?.interfaces?.[0]?.mac_address ||
                     report.network?.network_adapters?.[Object.keys(report.network?.network_adapters || {})[0]]?.mac_address ||
                     `mac_${Date.now()}`;
  return `${hostname}_${macAddress}`;
}

// Helper function to extract key metrics from the agent report
function extractMetrics(data: any) {
  // Extract memory usage from multiple possible sources
  const memoryUsage = data.hardware?.memory?.usage_percentage ||
                     data.hardware?.memory?.percentage ||
                     data.system_health?.memory_pressure?.memory_usage_percent ||
                     0;

  // Extract CPU usage from multiple possible sources
  const cpuUsage = data.hardware?.cpu?.usage_percentage ||
                  data.hardware?.cpu?.percentage ||
                  data.system_health?.metrics?.cpu_percent ||
                  0;

  // Extract disk usage from multiple possible sources
  const diskUsage = data.storage?.drives?.[0]?.usage_percentage ||
                   data.storage?.primary_drive?.usage_percentage ||
                   0;

  console.log(`Extracted metrics - CPU: ${cpuUsage}%, Memory: ${memoryUsage}%, Disk: ${diskUsage}%`);

  return {
    cpu_usage: cpuUsage,
    memory_usage: memoryUsage,
    disk_usage: diskUsage,
    network_usage: data.network?.total_bytes_sent || 0
  };
}


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
        const hasRecentData = device.latest_report &&
          (device.latest_report.collected_at || device.latest_report.timestamp);
        const lastReportTime = hasRecentData
          ? new Date(device.latest_report.collected_at || device.latest_report.timestamp)
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

  // Get agent connection status
  app.get('/api/agents/:id/connection-status', authenticateToken, async (req, res) => {
    try {
      const agentId = req.params.id;
      const agent = await storage.getAgentById(agentId); // Using getAgentById assuming it exists and returns similar data to getDevice

      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }

      const lastSeen = agent.last_seen ? new Date(agent.last_seen) : null;
      const now = new Date();
      const minutesSinceContact = lastSeen
        ? Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60))
        : null;

      // Check WebSocket connectivity
      const isWebSocketConnected = websocketService.isAgentConnected(agentId);
      const wsStatus = websocketService.getConnectionStatus();
      const agentWsDetails = wsStatus.connectionDetails?.find(conn => conn.agentId === agentId);

      res.json({
        agent_online: minutesSinceContact !== null && minutesSinceContact <= 5,
        last_seen: lastSeen?.toISOString() || null,
        minutes_since_contact: minutesSinceContact,
        ip_address: agent.ip_address,
        hostname: agent.hostname,
        ready_for_connection: minutesSinceContact !== null && minutesSinceContact <= 5,
        websocket_connected: isWebSocketConnected,
        websocket_details: agentWsDetails ? {
          last_ping: new Date(agentWsDetails.lastPing).toISOString(),
          connection_age_seconds: Math.floor((Date.now() - (agentWsDetails.connectedAt || Date.now())) / 1000),
          message_count: agentWsDetails.messageCount,
          is_alive: agentWsDetails.isAlive
        } : null
      });
    } catch (error) {
      console.error('Error checking agent connection status:', error);
      res.status(500).json({ message: 'Failed to check connection status' });
    }
  });

  // WebSocket status for all agents
  app.get('/api/agents/websocket-status', authenticateToken, async (req, res) => {
    try {
      const status = websocketService.getConnectionStatus();
      res.json({
        ...status,
        server_info: {
          websocket_path: '/ws',
          server_port: process.env.PORT || 5000,
          websocket_url: `ws://0.0.0.0:${process.env.PORT || 5000}/ws`
        }
      });
    } catch (error) {
      console.error('Error getting WebSocket status:', error);
      res.status(500).json({ error: 'Failed to get WebSocket status' });
    }
  });

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
          port,
          connection_type,
          instructions: instructions[connection_type] || "Ensure remote access is enabled on the target machine",
          teamviewer_id: connection_type === "teamviewer" ? device.teamviewer_id : undefined,
          is_private_ip: isPrivateIP,
        };

        if (isPrivateIP) {
          connectionInfo.tunnel_required = true;
		  const serverHost = req.hostname || "0.0.0.0";
          connectionInfo.reverse_tunnel_command = `ssh -R 5901:localhost:${port} itsm-user@${serverHost}`;
          connectionInfo.tunnel_instructions = [
            {
              step: 1,
              title: "Setup Reverse SSH Tunnel from Agent",
              description: "Run this command on the Windows endpoint to create a reverse tunnel",
              command: `ssh -R 5901:localhost:${port} -p 2222 itsm-user@${serverHost}`,
              notes: "This creates a tunnel from the remote machine back to this server"
            },
            {
              step: 2,
              title: "Connect via Tunnel",
              description: "Once tunnel is established, connect to localhost:5901",
              local_connection: "localhost:5901",
              notes: "The remote VNC server will be accessible via the reverse tunnel"
            }
          ];
          connectionInfo.tunnel_suggestions = [
            {
              method: "reverse_ssh_tunnel",
              command: `ssh -R 5901:localhost:${port} -p 2222 itsm-user@${serverHost}`,
              description: "Create reverse SSH tunnel from Windows endpoint to this server",
            },
            {
              method: "vpn",
              description: "Connect to company VPN first, then access private IP directly",
            },
            {
              method: "ssh_tunnel",
              command: `ssh -L ${port}:${device.ip_address}:${port} ${jump_host || "your_jump_host"}`,
              description: "Create SSH tunnel via jump host (alternative method)",
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
        // Update existing device with current timestamp
        await storage.updateDevice(device.id, {
          status: "online",
          last_seen: new Date(),
          ip_address: req.ip || device.ip_address, // Update IP if available
        });
        console.log("Updated device from heartbeat:", device.id);
      }

      const reportData = req.body;

      // Log complete system data being received with detailed breakdown
      console.log("=== COMPLETE SYSTEM REPORT RECEIVED ===");
      console.log("Timestamp:", reportData.timestamp);
      console.log("Hostname:", reportData.hostname);

      console.log("\n=== OS INFORMATION ===");
      console.log(JSON.stringify(reportData.os_info, null, 2));

      console.log("\n=== NETWORK INFORMATION ===");
      console.log(JSON.stringify(reportData.network, null, 2));

      console.log("\n=== HARDWARE INFORMATION ===");
      console.log(JSON.stringify(reportData.hardware, null, 2));

      console.log("\n=== STORAGE INFORMATION ===");
      console.log(JSON.stringify(reportData.storage, null, 2));

      console.log("\n=== SOFTWARE (First 5 items) ===");
      console.log(JSON.stringify(reportData.software?.slice(0, 5), null, 2));
      console.log(`Total Software Count: ${reportData.software?.length || 0}`);

      console.log("\n=== PROCESSES (First 5 items) ===");
      console.log(JSON.stringify(reportData.processes?.slice(0, 5), null, 2));
      console.log(`Total Processes Count: ${reportData.processes?.length || 0}`);

      console.log("\n=== USBDEVICES ===");
      console.log(JSON.stringify(reportData.usb_devices, null, 2));

      console.log("\n=== VIRTUALIZATION INFO ===");
      console.log(JSON.stringify(reportData.virtualization, null, 2));

      console.log("\n=== SYSTEM HEALTH ===");
      console.log(JSON.stringify(reportData.system_health, null, 2));

      console.log("\n=== SECURITY INFO ===");
      console.log(JSON.stringify(reportData.security, null, 2));

      console.log("\n=== ACTIVE PORTS ===");
      console.log(JSON.stringify(reportData.active_ports, null, 2));

      console.log("=== END COMPLETE SYSTEM REPORT ===\n");

      // Process and enhance network data
      console.log("=== NETWORK DATA VERIFICATION BEFORE STORAGE ===");
      console.log("Network interfaces count:", reportData.network?.interfaces?.length || 0);
      console.log("Network public IP:", reportData.network?.public_ip || "Not provided");
      console.log("Network adapters count:", Object.keys(reportData.network?.network_adapters || {}).length);

      // Extract primary network interface and IP from the correct structure
      let primaryIP = req.ip || device.ip_address;
      let primaryMAC = null;

      if (reportData.network?.interfaces && Array.isArray(reportData.network.interfaces)) {
        // Find primary interface using the correct field names from agent data
        const primaryInterface = reportData.network.interfaces.find(iface => {
          const ip = iface.ip || iface.ip_address;
          return ip &&
            ip !== '127.0.0.1' &&
            ip !== '::1' &&
            !ip.startsWith('169.254.') && // Exclude APIPA
            (iface.status === 'Up' || iface.status === 'up' || iface.is_up === true);
        }) || reportData.network.interfaces.find(iface => {
          const ip = iface.ip || iface.ip_address;
          return ip && ip !== '127.0.0.1' && ip !== '::1';
        });

        if (primaryInterface) {
          primaryIP = primaryInterface.ip || primaryInterface.ip_address;
          primaryMAC = primaryInterface.mac || primaryInterface.mac_address;

          console.log("Extracted Primary Network Info:", {
            ip: primaryIP,
            mac: primaryMAC,
            interface_name: primaryInterface.name,
            status: primaryInterface.status,
            request_ip: req.ip
          });
        }
      }

      // Always update device with the most reliable IP (request IP takes precedence)
      const mostReliableIP = req.ip || primaryIP;
      if (mostReliableIP !== device.ip_address) {
        await storage.updateDevice(device.id, { ip_address: mostReliableIP });
        device.ip_address = mostReliableIP;
        primaryIP = mostReliableIP;
      }

      // Enhanced network data with primary interface info
      const enhancedNetworkData = {
        ...reportData.network,
        primary_interface: {
          ip_address: primaryIP,
          mac_address: primaryMAC
        }
      };

      reportData.network = enhancedNetworkData;

      if (!reportData.network || Object.keys(reportData.network).length === 0) {
        console.log("⚠️  WARNING: Empty network data received from agent!");
      }

      // Log what we found for debugging
      console.log("=== METRICS EXTRACTION RESULTS ===");
      console.log("CPU Usage:", extractMetrics(reportData).cpu_usage);
      console.log("Memory Usage:", extractMetrics(reportData).memory_usage);
      console.log("Disk Usage:", extractMetrics(reportData).disk_usage);
      console.log("Network I/O:", extractMetrics(reportData).network_usage);


  // Agent diagnostics endpoint
  app.get("/api/agents/diagnostics", authenticateToken, async (req, res) => {
    try {
      const devices = await storage.getDevices();
      const now = new Date();

      const diagnostics = devices.map(device => {
        const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
        const minutesOffline = lastSeen ?
          Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60)) : null;

        return {
          id: device.id,
          hostname: device.hostname,
          status: device.status,
          ip_address: device.ip_address,
          last_seen: device.last_seen,
          minutes_offline: minutesOffline,
          is_online: device.status === "online" && minutesOffline !== null && minutesOffline < 5,
          has_recent_report: device.latest_report ? true : false
        };
      });

      res.json({
        timestamp: now.toISOString(),
        total_agents: devices.length,
        online_agents: diagnostics.filter(d => d.is_online).length,
        offline_agents: diagnostics.filter(d => !d.is_online).length,
        agents: diagnostics
      });
    } catch (error) {
      console.error("Error in agent diagnostics:", error);
      res.status(500).json({ error: "Failed to get diagnostics" });
    }
  });

      // Store system info with extracted metrics
      await storage.createDeviceReport({
        device_id: device.id,
        cpu_usage: extractMetrics(reportData).cpu_usage,
        memory_usage: extractMetrics(reportData).memory_usage,
        disk_usage: extractMetrics(reportData).disk_usage,
        network_io: extractMetrics(reportData).network_usage,
        raw_data: JSON.stringify(reportData),
      });

      // Update device status to ensure it's marked as online
      await storage.updateDevice(device.id, {
        status: "online",
        last_seen: new Date(),
      });

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

      // Generate system alerts based on the latest report
      try {
        console.log("=== GENERATING SYSTEM ALERTS ===");
        const { generateSystemAlerts } = await import("../utils/alerts");

        // Prepare device data for alert generation
        const deviceForAlerts = {
          id: device.id,
          hostname: device.hostname,
          status: device.status,
          metrics: extractMetrics(reportData),
          raw_data: reportData
        };

        const generatedAlerts = await generateSystemAlerts(deviceForAlerts);

        if (generatedAlerts.length > 0) {
          console.log(`Generated ${generatedAlerts.length} alerts for device ${device.hostname}`);

          // Store alerts in database
          for (const alert of generatedAlerts) {
            await storage.createAlert({
              device_id: alert.device_id,
              category: alert.type,
              severity: alert.severity,
              message: alert.message,
              metadata: {
                title: alert.title,
                timestamp: alert.timestamp,
                alert_type: 'performance_threshold'
              },
              is_active: true
            });
          }
        } else {
          console.log(`No alerts generated for device ${device.hostname}`);
        }
      } catch (alertError) {
        console.error("Error generating system alerts:", alertError);
      }

      console.log(`=== AGENT REPORT PROCESSED SUCCESSFULLY ===`);
      console.log(`Device ID: ${device.id}`);
      console.log(`Device Status: ${device.status}`);
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