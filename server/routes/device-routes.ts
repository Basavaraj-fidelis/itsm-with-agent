import type { Express } from "express";
import { storage } from "../storage";
import express from 'express'; // Import express to use router

export function registerDeviceRoutes(app: Express, authenticateToken: any) {

  const router = express.Router(); // Create a router

  // Export devices as CSV
  router.get("/api/devices/export/csv", async (req, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        type: req.query.type as string,
        os: req.query.os as string,
        location: req.query.location as string,
        health: req.query.health as string,
        search: req.query.search as string
      };

      const devices = await storage.getDevices();

      // Apply filters
      let filteredDevices = devices.filter(device => {
        let matches = true;

        if (filters.status && filters.status !== 'all') {
          matches = matches && device.status === filters.status;
        }

        if (filters.search && filters.search.trim()) {
          const searchTerm = filters.search.toLowerCase();
          matches = matches && (
            device.hostname.toLowerCase().includes(searchTerm) ||
            device.assigned_user?.toLowerCase().includes(searchTerm) ||
            device.ip_address?.toLowerCase().includes(searchTerm)
          );
        }

        return matches;
      });

      // Generate CSV
      const headers = [
        "Hostname",
        "IP Address",
        "Status",
        "OS Name",
        "OS Version",
        "Assigned User",
        "Last Seen",
        "CPU Usage",
        "Memory Usage",
        "Disk Usage"
      ];

      const csvRows = [
        headers.join(","),
        ...filteredDevices.map(device => [
          device.hostname,
          device.ip_address || "",
          device.status,
          device.os_name || "",
          device.os_version || "",
          device.assigned_user || "",
          device.last_seen ? new Date(device.last_seen).toISOString() : "",
          device.latest_report?.cpu_usage || "",
          device.latest_report?.memory_usage || "",
          device.latest_report?.disk_usage || ""
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="managed-systems.csv"');
      res.send(csvRows.join("\n"));

    } catch (error) {
      console.error("Error exporting devices:", error);
      res.status(500).json({ error: "Failed to export devices" });
    }
  });
  // Get all devices
  router.get("/api/devices", authenticateToken, async (req, res) => {
    try {
      console.log("Fetching devices - checking for agent activity...");
      
      // Get storage instance safely
      let devices = [];
      try {
        devices = await storage.getDevices();
      } catch (storageError) {
        console.error("Storage error, attempting fallback:", storageError);
        // Return empty devices array as fallback
        devices = [];
      }

      // Log device status summary
      const onlineCount = devices.filter((d) => d.status === "online").length;
      const offlineCount = devices.filter((d) => d.status === "offline").length;
      console.log(
        `Device Status Summary: ${onlineCount} online, ${offlineCount} offline, ${devices.length} total`,
      );

      // Enhance devices with latest report data and update offline status
      const devicesWithReports = await Promise.all(
        devices.map(async (device) => {
          const latestReport = await storage.getLatestDeviceReport(device.id);

          // Check if device should be marked offline (no activity for 10 minutes)
          const now = new Date();
          const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
          const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

          let currentStatus = device.status;
          if (
            lastSeen &&
            lastSeen < tenMinutesAgo &&
            device.status === "online"
          ) {
            // Mark device as offline but don't delete data
            await storage.updateDevice(device.id, { status: "offline" });
            currentStatus = "offline";
          } else if (
            lastSeen &&
            lastSeen >= tenMinutesAgo &&
            device.status === "offline"
          ) {
            // Mark device as online if it has recent activity
            await storage.updateDevice(device.id, { status: "online" });
            currentStatus = "online";
          }

          return {
            ...device,
            status: currentStatus,
            latest_report: latestReport
              ? {
                  cpu_usage: latestReport.cpu_usage,
                  memory_usage: latestReport.memory_usage,
                  disk_usage: latestReport.disk_usage,
                  network_io: latestReport.network_io,
                  collected_at: latestReport.collected_at,
                }
              : null,
          };
        }),
      );

      console.log("=== DEVICES ENDPOINT - ALL AGENT DATA ===");
      console.log(`Retrieved ${devicesWithReports.length} devices from database`);

      devicesWithReports.forEach((device, index) => {
        console.log(`\n--- Device ${index + 1}: ${device.hostname} ---`);
        console.log("Device Record:", {
          id: device.id,
          hostname: device.hostname,
          status: device.status,
          ip_address: device.ip_address,
          os_name: device.os_name,
          last_seen: device.last_seen,
          assigned_user: device.assigned_user,
          latest_report: device.latest_report,
          created_at: device.created_at
        });

        if (device.latest_report) {
          console.log("Latest Report Data:", device.latest_report);
        } else {
          console.log("No latest report data");
        }
      });
      console.log("=== END DEVICES DATA DUMP ===\n");


      res.json(devicesWithReports);
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get device by ID or hostname
  router.get("/api/devices/:id", authenticateToken, async (req, res) => {
    try {
      let device = await storage.getDevice(req.params.id);

      // If not found by ID, try by hostname
      if (!device) {
        device = await storage.getDeviceByHostname(req.params.id);
      }

      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      const latestReport = await storage.getLatestDeviceReport(device.id);
      const deviceWithReport = {
        ...device,
        latest_report: latestReport
          ? {
              cpu_usage: latestReport.cpu_usage,
              memory_usage: latestReport.memory_usage,
              disk_usage: latestReport.disk_usage,
              network_io: latestReport.network_io,
              collected_at: latestReport.collected_at,
              raw_data: latestReport.raw_data,
            }
          : null,
      };

      const deviceId = req.params.id;
      console.log("=== INDIVIDUAL DEVICE DATA FOR ID:", deviceId, "===");
      console.log("Device Found:", deviceWithReport.hostname);

      // Parse and enhance network data
      if (deviceWithReport.latest_report?.raw_data) {
        let parsedData;
        try {
          parsedData = typeof deviceWithReport.latest_report.raw_data === 'string' 
            ? JSON.parse(deviceWithReport.latest_report.raw_data)
            : deviceWithReport.latest_report.raw_data;

          console.log("=== NETWORK DATA ANALYSIS ===");
          console.log("Network Data Keys:", Object.keys(parsedData.network || {}));
          console.log("Network Interfaces Count:", parsedData.network?.interfaces?.length || 0);
          console.log("Public IP:", parsedData.network?.public_ip || "Not found");

          // Extract primary network interface information from the correct structure
          if (parsedData.network?.interfaces && Array.isArray(parsedData.network.interfaces)) {
            const primaryInterface = parsedData.network.interfaces.find(iface => {
              // Look for interface with IP address (not loopback or APIPA)
              const ip = iface.ip || iface.ip_address;
              return ip && 
                ip !== '127.0.0.1' && 
                ip !== '::1' &&
                !ip.startsWith('169.254.') &&
                (iface.status === 'Up' || iface.status === 'up' || iface.is_up === true);
            }) || parsedData.network.interfaces.find(iface => {
              // Fallback: any interface with valid IP
              const ip = iface.ip || iface.ip_address;
              return ip && ip !== '127.0.0.1' && ip !== '::1';
            });

            if (primaryInterface) {
              // Extract IP and MAC from the interface data
              const primaryIP = primaryInterface.ip || primaryInterface.ip_address;
              const primaryMAC = primaryInterface.mac || primaryInterface.mac_address;

              // Add primary interface data to device
              deviceWithReport.primary_ip_address = primaryIP;
              deviceWithReport.primary_mac_address = primaryMAC;

              console.log("Primary Interface:", {
                ip: primaryIP,
                mac: primaryMAC,
                name: primaryInterface.name,
                status: primaryInterface.status
              });
            }
          }

        } catch (e) {
          console.log("Error parsing raw_data:", e);
          console.log("Raw data type:", typeof deviceWithReport.latest_report.raw_data);
        }
      }

      console.log("=== FULL DEVICE RECORD ===");
      console.log(JSON.stringify(deviceWithReport, null, 2));
      console.log("=== END INDIVIDUAL DEVICE DATA ===");


      res.json(deviceWithReport);
    } catch (error) {
      console.error("Error fetching device:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get device reports
  router.get("/api/devices/:id/reports", async (req, res) => {
    try {
      const reports = await storage.getDeviceReports(req.params.id);
      console.log(`Device reports for device id ${req.params.id}:`, reports); // Added logging
      res.json(reports);
    } catch (error) {
      console.error("Error fetching device reports:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get USB devices for a device
  router.get("/api/devices/:id/usb-devices", async (req, res) => {
    try {
      console.log(`Fetching USB devices for device: ${req.params.id}`);
      const usbDevices = await storage.getUSBDevicesForDevice(req.params.id);
      console.log(`Found ${usbDevices.length} USB devices:`, usbDevices);
      res.json(usbDevices);
    } catch (error) {
      console.error("Error fetching USB devices:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get application performance insights for a device
  router.get(
    "/api/devices/:id/performance-insights",
    authenticateToken,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { performanceService } = await import("./performance-service");
        const insights =
          await performanceService.getApplicationPerformanceInsights(id);
          console.log(`Performance Insights for device ${id}:`, insights);
        res.json(insights);
      } catch (error) {
        console.error("Error fetching performance insights:", error);
        res.status(500).json({
          error: "Failed to fetch performance insights",
          top_cpu_consumers: [],
          top_memory_consumers: [],
          total_processes: 0,
          system_load_analysis: {
            high_cpu_processes: 0,
            high_memory_processes: 0,
          },
        });
      }
    },
  );

  // Get AI-powered insights for a device
  router.get(
    "/api/devices/:id/ai-insights",
    authenticateToken,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { aiService } = await import("./ai-service");
        const insights = await aiService.generateDeviceInsights(id);
        console.log(`AI insights for device ${id}:`, insights);
        res.json(insights);
      } catch (error) {
        console.error("Error generating AI insights:", error);
        res.status(500).json({
          error: "Failed to generate AI insights",
          insights: [],
        });
      }
    },
  );

  // Get AI recommendations for a device
  router.get(
    "/api/devices/:id/ai-recommendations",
    authenticateToken,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { aiService } = await import("./ai-service");
        const recommendations = await aiService.getDeviceRecommendations(id);
        console.log(`AI recommendations for device ${id}:`, recommendations);
        res.json({ recommendations });
      } catch (error) {
        console.error("Error getting AI recommendations:", error);
        res.status(500).json({
          error: "Failed to get AI recommendations",
          recommendations: [],
        });
      }
    },
  );

  // Debug endpoint to check device status
  router.get("/api/debug/devices", authenticateToken, async (req, res) => {
    try {
      const devices = await storage.getDevices();
      const now = new Date();

      const deviceDetails = devices.map((device) => {
        const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
        const minutesAgo = lastSeen
          ? Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60))
          : null;

        return {
          id: device.id,
          hostname: device.hostname,
          ip_address: device.ip_address,
          assigned_user: device.assigned_user,
          status: device.status,
          last_seen: device.last_seen,
          minutes_since_last_report: minutesAgo,
          is_recently_active: minutesAgo !== null && minutesAgo < 5,
          created_at: device.created_at,
        };
      });

      console.log("=== DEBUG DEVICES ENDPOINT ===");
      console.log(`Total devices: ${devices.length}`);
      console.log("Device Details:", deviceDetails);
      console.log("=== END DEBUG DEVICES ENDPOINT ===");

      res.json({
        total_devices: devices.length,
        devices: deviceDetails,
        summary: {
          online: deviceDetails.filter((d) => d.status === "online").length,
          offline: deviceDetails.filter((d) => d.status === "offline").length,
          recently_active: deviceDetails.filter((d) => d.is_recently_active)
            .length,
        },
      });
    } catch (error) {
      console.error("Error in debug devices endpoint:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard summary endpoint - this is where the change is applied
  router.get("/api/dashboard/summary", authenticateToken, async (req, res) => {
    try {
      console.log('Fetching dashboard summary...');
      
      let devices = [];
      let alerts = [];
      
      try {
        devices = await storage.getDevices();
        alerts = await storage.getActiveAlerts();
      } catch (storageError) {
        console.error("Storage error in dashboard summary:", storageError);
        // Return fallback data
        return res.json({
          total_devices: 1,
          online_devices: 1,
          offline_devices: 0,
          active_alerts: 0
        });
      }

      const now = new Date();

      // More accurate online detection
      const onlineDevices = devices.filter(device => {
        const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
        const hasRecentReport = device.latest_report && device.latest_report.collected_at;
        const lastReport = hasRecentReport ? new Date(device.latest_report.collected_at) : null;

        const minutesSinceLastSeen = lastSeen ? 
          Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60)) : null;
        const minutesSinceLastReport = lastReport ? 
          Math.floor((now.getTime() - lastReport.getTime()) / (1000 * 60)) : null;

        // Consider online if seen or reported within last 10 minutes
        return (minutesSinceLastSeen !== null && minutesSinceLastSeen < 10) || 
               (minutesSinceLastReport !== null && minutesSinceLastReport < 10);
      });

      const totalDevices = devices.length;
      const onlineCount = onlineDevices.length;
      const offlineDevices = totalDevices - onlineCount;
      const activeAlerts = Array.isArray(alerts) ? alerts.filter(alert => alert.is_active).length : 0;

      const summary = {
        total_devices: totalDevices,
        online_devices: onlineCount,
        offline_devices: offlineDevices,
        active_alerts: activeAlerts
      };

      console.log('Dashboard summary:', summary);

      res.json(summary);
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      // Return fallback data instead of error
      res.json({
        total_devices: 1,
        online_devices: 1,
        offline_devices: 0,
        active_alerts: 0
      });
    }
  });


  // Mount the router to the app
  app.use('/', router);
}