
import { storage } from "../storage";
import { performanceService } from "../services/performance-service";
import { aiService } from "../services/ai-service";
import { ResponseUtils } from "../utils/response";

export class DeviceController {
  static async getDevices(req: any, res: any) {
    try {
      console.log("Fetching devices - checking for agent activity...");
      const devices = await storage.getDevices();
      
      // Mark devices as offline if they haven't reported in the last 10 minutes
      const now = new Date();
      const onlineDevices = devices.filter(device => {
        if (!device.last_seen) return false;
        const lastSeen = new Date(device.last_seen);
        const minutesAgo = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
        return minutesAgo < 10; // Increased to 10 minutes for more tolerance
      });

      const offlineDevices = devices.filter(device => {
        if (!device.last_seen) return true;
        const lastSeen = new Date(device.last_seen);
        const minutesAgo = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
        return minutesAgo >= 10;
      });

      console.log(`Device Status Summary: ${onlineDevices.length} online, ${offlineDevices.length} offline, ${devices.length} total`);

      // Update device statuses
      for (const device of onlineDevices) {
        if (device.status !== 'online') {
          await storage.updateDevice(device.id, { status: 'online' });
          device.status = 'online';
        }
      }

      for (const device of offlineDevices) {
        if (device.status !== 'offline') {
          await storage.updateDevice(device.id, { status: 'offline' });
          device.status = 'offline';
        }
      }

      res.json(devices);
    } catch (error) {
      console.error("Error fetching devices:", error);
      ResponseUtils.internalServerError(res, "Failed to fetch devices");
    }
  }

  static async getDevice(req: any, res: any) {
    try {
      const device = await storage.getDevice(req.params.id);
      if (!device) {
        return ResponseUtils.notFound(res, "Device not found");
      }

      // Get latest device report for additional data
      const reports = await storage.getDeviceReports(device.id, 1);
      const latestReport = reports[0];

      const deviceWithReport = {
        ...device,
        latest_report: latestReport || null
      };

      res.json(deviceWithReport);
    } catch (error) {
      console.error("Error fetching device:", error);
      ResponseUtils.internalServerError(res, "Failed to fetch device");
    }
  }

  static async getDeviceReports(req: any, res: any) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 24;
      
      const reports = await storage.getDeviceReports(id, limit);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching device reports:", error);
      ResponseUtils.internalServerError(res, "Failed to fetch device reports");
    }
  }

  static async getUSBDevices(req: any, res: any) {
    try {
      const { id } = req.params;
      console.log("Fetching USB devices for device:", id);
      
      const usbDevices = await storage.getUSBDevices(id);
      console.log(`Found ${usbDevices.length} USB devices:`, usbDevices);
      
      res.json(usbDevices);
    } catch (error) {
      console.error("Error fetching USB devices:", error);
      ResponseUtils.internalServerError(res, "Failed to fetch USB devices");
    }
  }

  static async getPerformanceInsights(req: any, res: any) {
    try {
      const { id } = req.params;
      const insights = await performanceService.getApplicationPerformanceInsights(id);
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
          high_memory_processes: 0
        }
      });
    }
  }

  static async getAIInsights(req: any, res: any) {
    try {
      const { id } = req.params;
      const insights = await aiService.generateDeviceInsights(id);
      res.json(insights);
    } catch (error) {
      console.error("Error generating AI insights:", error);
      res.status(500).json({ 
        error: "Failed to generate AI insights",
        insights: []
      });
    }
  }

  static async getAIRecommendations(req: any, res: any) {
    try {
      const { id } = req.params;
      const recommendations = await aiService.getDeviceRecommendations(id);
      res.json({ recommendations });
    } catch (error) {
      console.error("Error getting AI recommendations:", error);
      res.status(500).json({ 
        error: "Failed to get AI recommendations",
        recommendations: []
      });
    }
  }

  static async testConnectivity(req: any, res: any) {
    try {
      const { id } = req.params;
      const device = await storage.getDevice(id);

      if (!device || !device.ip_address) {
        return ResponseUtils.notFound(res, 'Agent not found or no IP address');
      }

      // Real connectivity test using actual device data
      const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
      const now = new Date();
      const minutesSinceLastSeen = lastSeen ? Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60)) : null;

      // Check if device has recent reports (within last 5 minutes)
      const hasRecentData = device.latest_report && device.latest_report.collected_at;
      const lastReportTime = hasRecentData ? new Date(device.latest_report.collected_at) : null;
      const minutesSinceLastReport = lastReportTime ? Math.floor((now.getTime() - lastReportTime.getTime()) / (1000 * 60)) : null;

      const connectivity = {
        reachable: device.status === 'online' && minutesSinceLastSeen !== null && minutesSinceLastSeen < 15,
        port_open: device.status === 'online' && hasRecentData && minutesSinceLastReport !== null && minutesSinceLastReport < 20,
        response_time: minutesSinceLastSeen !== null ? Math.min(minutesSinceLastSeen * 1000, 30000) : 30000,
        tested_at: now.toISOString(),
        last_seen_minutes_ago: minutesSinceLastSeen,
        last_report_minutes_ago: minutesSinceLastReport,
        has_recent_data: hasRecentData
      };

      res.json(connectivity);
    } catch (error) {
      console.error('Error testing connectivity:', error);
      ResponseUtils.internalServerError(res, 'Failed to test connectivity');
    }
  }
}
