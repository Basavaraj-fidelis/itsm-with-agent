import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Removed validation schema import - using flexible data parsing

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard summary endpoint
  app.get("/api/dashboard/summary", async (req, res) => {
    try {
      const summary = await storage.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all devices
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      
      // Enhance devices with latest report data
      const devicesWithReports = await Promise.all(
        devices.map(async (device) => {
          const latestReport = await storage.getLatestDeviceReport(device.id);
          return {
            ...device,
            latest_report: latestReport ? {
              cpu_usage: latestReport.cpu_usage,
              memory_usage: latestReport.memory_usage,
              disk_usage: latestReport.disk_usage,
              network_io: latestReport.network_io,
              collected_at: latestReport.collected_at
            } : null
          };
        })
      );
      
      res.json(devicesWithReports);
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get device by ID
  app.get("/api/devices/:id", async (req, res) => {
    try {
      const device = await storage.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      const latestReport = await storage.getLatestDeviceReport(device.id);
      const deviceWithReport = {
        ...device,
        latest_report: latestReport ? {
          cpu_usage: latestReport.cpu_usage,
          memory_usage: latestReport.memory_usage,
          disk_usage: latestReport.disk_usage,
          network_io: latestReport.network_io,
          collected_at: latestReport.collected_at,
          raw_data: latestReport.raw_data
        } : null
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

  // Report endpoint (from ITSM agents)
  app.post("/api/report", async (req, res) => {
    try {
      console.log("Received report data:", JSON.stringify(req.body, null, 2));
      
      // Skip validation and work with raw data - be completely flexible
      const data = req.body;
      
      // Extract hostname from various possible locations
      const hostname = data.hostname || data.system_info?.hostname || 
                      data.os_info?.hostname || data.hardware?.hostname || 
                      data.network?.hostname;
      
      if (!hostname) {
        console.log("No hostname found in data:", Object.keys(data));
        return res.status(400).json({ message: "Hostname is required" });
      }
      
      console.log("Found hostname:", hostname);
      
      // Check if device exists, create if not
      let device = await storage.getDeviceByHostname(hostname);
      
      // Extract data from various possible locations - be very flexible
      const osInfo = data.os_info || data.system_info || data.hardware?.os || {};
      const systemHealth = data.system_health || data.health || data.metrics || {};
      const hardware = data.hardware || data.system_info || {};
      const network = data.network || data.network_info || {};
      
      // Extract IP address from various possible locations
      let ip_address = network.ip_address || network.ip || null;
      
      // Try to extract IP from network interfaces if not found directly
      if (!ip_address && data.network && typeof data.network === 'object') {
        // Look for IP addresses in network interface objects
        for (const [key, iface] of Object.entries(data.network)) {
          if (typeof iface === 'object' && iface !== null) {
            if ((iface as any).ip_address) {
              ip_address = (iface as any).ip_address;
              break;
            }
            if ((iface as any).ip) {
              ip_address = (iface as any).ip;
              break;
            }
          }
        }
      }
      
      // Also try from system info or hardware
      if (!ip_address) {
        ip_address = data.ip_address || hardware.ip_address || osInfo.ip_address || null;
      }

      if (!device) {
        device = await storage.createDevice({
          hostname: hostname,
          assigned_user: data.assigned_user || data.user || null,
          os_name: osInfo.name || osInfo.platform || osInfo.system || null,
          os_version: osInfo.version || osInfo.release || osInfo.version_info || null,
          ip_address: ip_address,
          status: "online",
          last_seen: new Date()
        });
        console.log("Created new device:", device.id);
      } else {
        // Update existing device including IP address
        await storage.updateDevice(device.id, {
          assigned_user: data.assigned_user || data.user || device.assigned_user,
          os_name: osInfo.name || osInfo.platform || osInfo.system || device.os_name,
          os_version: osInfo.version || osInfo.release || osInfo.version_info || device.os_version,
          ip_address: ip_address || device.ip_address,
          status: "online",
          last_seen: new Date()
        });
        console.log("Updated existing device:", device.id);
      }

      // Extract metrics from various possible locations - handle nested objects
      let cpu_usage = null;
      let memory_usage = null;
      let disk_usage = null;
      let network_io = null;

      // Try multiple possible field names and structures, extract numeric values
      const extractNumericValue = (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          return isNaN(parsed) ? null : parsed;
        }
        if (typeof value === 'object') {
          // Handle nested objects like { usage_percent: 8.7 }
          return value.usage_percent || value.percent || value.percentage || null;
        }
        return null;
      };

      // CPU usage extraction
      cpu_usage = extractNumericValue(systemHealth.cpu_percent) || 
                 extractNumericValue(systemHealth.cpu_usage) ||
                 extractNumericValue(hardware.cpu_percent) || 
                 extractNumericValue(hardware.cpu) ||
                 extractNumericValue(data.cpu_percent) || 
                 extractNumericValue(data.cpu_usage) ||
                 extractNumericValue(data.cpu_info?.usage_percent) ||
                 extractNumericValue(data.metrics?.cpu_usage) ||
                 null;
                 
      // Memory usage extraction  
      memory_usage = extractNumericValue(systemHealth.memory_percent) || 
                    extractNumericValue(systemHealth.memory_usage) ||
                    extractNumericValue(hardware.memory_percent) || 
                    extractNumericValue(hardware.memory) ||
                    extractNumericValue(data.memory_percent) || 
                    extractNumericValue(data.memory_usage) ||
                    extractNumericValue(data.memory_info?.percentage) ||
                    extractNumericValue(data.metrics?.memory_usage) ||
                    null;
                    
      // Disk usage extraction - check storage array for disk usage
      disk_usage = extractNumericValue(systemHealth.disk_percent) || 
                  extractNumericValue(systemHealth.disk_usage) ||
                  extractNumericValue(hardware.disk_percent) || 
                  extractNumericValue(hardware.disk) ||
                  extractNumericValue(data.disk_percent) || 
                  extractNumericValue(data.disk_usage) ||
                  extractNumericValue(data.disk_info?.usage_percent) ||
                  extractNumericValue(data.metrics?.disk_usage) ||
                  null;
                  
      // If no direct disk usage found, try to extract from storage array or object
      if (disk_usage === null && data.storage) {
        let storageUsages = [];
        
        if (Array.isArray(data.storage)) {
          // Handle array format
          storageUsages = data.storage
            .map(disk => extractNumericValue(disk.usage_percent) || extractNumericValue(disk.percent))
            .filter(usage => usage !== null);
        } else if (typeof data.storage === 'object') {
          // Handle object format like { "C:": { percent: 45.2, ... } }
          storageUsages = Object.values(data.storage)
            .map((disk: any) => extractNumericValue(disk.usage_percent) || extractNumericValue(disk.percent))
            .filter(usage => usage !== null);
        }
        
        if (storageUsages.length > 0) {
          disk_usage = Math.max(...storageUsages);
        }
      }
                  
      // Network I/O extraction
      network_io = extractNumericValue(systemHealth.network_bytes) || 
                  extractNumericValue(systemHealth.network_io) ||
                  extractNumericValue(network.bytes) || 
                  extractNumericValue(network.io) ||
                  extractNumericValue(data.network_bytes) || 
                  extractNumericValue(data.network_io) ||
                  extractNumericValue(data.network_info?.bytes_sent) ||
                  extractNumericValue(data.metrics?.network_io) ||
                  null;
                  
      // If no direct network I/O found, try to calculate from network interfaces
      if (network_io === null && data.network && typeof data.network === 'object') {
        let totalBytes = 0;
        Object.values(data.network).forEach((iface: any) => {
          if (typeof iface === 'object' && iface.bytes_sent !== undefined) {
            totalBytes += (iface.bytes_sent || 0) + (iface.bytes_recv || 0);
          }
        });
        if (totalBytes > 0) {
          network_io = totalBytes;
        }
      }

      console.log("Extracted metrics:", { cpu_usage, memory_usage, disk_usage, network_io });

      // Create device report
      await storage.createDeviceReport({
        device_id: device.id,
        cpu_usage: cpu_usage?.toString() || null,
        memory_usage: memory_usage?.toString() || null,
        disk_usage: disk_usage?.toString() || null,
        network_io: network_io?.toString() || null,
        raw_data: JSON.stringify(req.body)
      });

      // Smart alert system - update existing alerts instead of creating duplicates
      const checkAndManageAlert = async (
        metric: string, 
        value: number, 
        thresholds: { critical: number; high: number; warning: number },
        category: string
      ) => {
        // Determine current severity
        let currentSeverity = null;
        let currentThreshold = null;
        let message = "";

        if (value >= thresholds.critical) {
          currentSeverity = "critical";
          currentThreshold = thresholds.critical;
          if (metric === "cpu") {
            message = `Critical CPU usage detected (${value.toFixed(1)}%) - Bottleneck detected`;
          } else if (metric === "memory") {
            message = `Critical memory usage detected (${value.toFixed(1)}%) - Risk of crash`;
          } else if (metric === "disk") {
            message = `Critical disk usage detected (${value.toFixed(1)}%) - Immediate attention required`;
          }
        } else if (value >= thresholds.high) {
          currentSeverity = "high";
          currentThreshold = thresholds.high;
          if (metric === "cpu") {
            message = `High CPU usage detected (${value.toFixed(1)}%) - System stressed`;
          } else if (metric === "memory") {
            message = `High memory usage detected (${value.toFixed(1)}%) - App slowness likely`;
          } else if (metric === "disk") {
            message = `High disk usage detected (${value.toFixed(1)}%) - Needs cleanup soon`;
          }
        } else if (value >= thresholds.warning) {
          currentSeverity = "warning";
          currentThreshold = thresholds.warning;
          if (metric === "cpu") {
            message = `CPU usage spike detected (${value.toFixed(1)}%) - Spikes are fine`;
          } else if (metric === "memory") {
            message = `Memory usage spike detected (${value.toFixed(1)}%) - Temporary spike`;
          } else if (metric === "disk") {
            message = `Disk usage warning (${value.toFixed(1)}%) - Normal usage spike`;
          }
        }

        // Check for existing active alert for this metric
        const existingAlert = await storage.getActiveAlertByDeviceAndMetric(device.id, metric);

        if (currentSeverity) {
          // Should have an alert
          if (existingAlert) {
            // Update existing alert
            await storage.updateAlert(existingAlert.id, {
              severity: currentSeverity,
              message: message,
              metadata: { 
                [metric + "_usage"]: value, 
                threshold: currentThreshold, 
                metric: metric,
                last_updated: new Date().toISOString()
              }
            });
          } else {
            // Create new alert
            await storage.createAlert({
              device_id: device.id,
              category: category,
              severity: currentSeverity,
              message: message,
              metadata: { 
                [metric + "_usage"]: value, 
                threshold: currentThreshold, 
                metric: metric,
                last_updated: new Date().toISOString()
              },
              is_active: true
            });
          }
        } else {
          // Value is below warning threshold
          if (existingAlert) {
            // Resolve existing alert
            await storage.resolveAlert(existingAlert.id);
          }
        }
      };

      // Process alerts for each metric
      if (cpu_usage !== null && cpu_usage !== undefined) {
        await checkAndManageAlert("cpu", cpu_usage, { critical: 98, high: 95, warning: 90 }, "performance");
      }

      if (memory_usage !== null && memory_usage !== undefined) {
        await checkAndManageAlert("memory", memory_usage, { critical: 95, high: 90, warning: 85 }, "performance");
      }

      if (disk_usage !== null && disk_usage !== undefined) {
        await checkAndManageAlert("disk", disk_usage, { critical: 98, high: 95, warning: 90 }, "storage");
      }

      // USB device detection (from raw data)
      const usbDevices = data.usb_devices || data.hardware?.usb_devices || [];
      if (usbDevices && Array.isArray(usbDevices) && usbDevices.length > 0) {
        await storage.createAlert({
          device_id: device.id,
          category: "security",
          severity: "info",
          message: `USB device(s) detected - ${usbDevices.length} device(s) connected`,
          metadata: { 
            usb_count: usbDevices.length, 
            devices: usbDevices.slice(0, 3), // First 3 devices for reference
            metric: "usb"
          },
          is_active: true
        });
      }

      res.json({ message: "Report saved successfully" });
    } catch (error) {
      console.error("Error processing report:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request data", errors: error });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get active alerts
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getActiveAlerts();
      
      // Enhance alerts with device information
      const alertsWithDevices = await Promise.all(
        alerts.map(async (alert) => {
          const device = await storage.getDevice(alert.device_id);
          return {
            ...alert,
            device_hostname: device?.hostname || "Unknown"
          };
        })
      );
      
      res.json(alertsWithDevices);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
