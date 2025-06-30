import type { Express } from "express";
import { storage } from "../storage";

export function registerDeviceRoutes(app: Express, authenticateToken: any) {
  // Get all devices
  app.get("/api/devices", authenticateToken, async (req, res) => {
    try {
      console.log("Fetching devices - checking for agent activity...");
      const devices = await storage.getDevices();

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

      res.json(devicesWithReports);
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get device by ID or hostname
  app.get("/api/devices/:id", authenticateToken, async (req, res) => {
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

      res.json(deviceWithReport);
    } catch (error) {
      console.error("Error fetching device:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get device reports
  app.get("/api/devices/:id/reports", async (req, res) => {
    try {
      const reports = await storage.getDeviceReports(req.params.id);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching device reports:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get USB devices for a device
  app.get("/api/devices/:id/usb-devices", async (req, res) => {
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
  app.get(
    "/api/devices/:id/performance-insights",
    authenticateToken,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { performanceService } = await import("./performance-service");
        const insights =
          await performanceService.getApplicationPerformanceInsights(id);
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
  app.get(
    "/api/devices/:id/ai-insights",
    authenticateToken,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { aiService } = await import("./ai-service");
        const insights = await aiService.generateDeviceInsights(id);
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
  app.get(
    "/api/devices/:id/ai-recommendations",
    authenticateToken,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { aiService } = await import("./ai-service");
        const recommendations = await aiService.getDeviceRecommendations(id);
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
  app.get("/api/debug/devices", authenticateToken, async (req, res) => {
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
}
