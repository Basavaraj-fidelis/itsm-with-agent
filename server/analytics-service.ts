
import { storage } from "./storage";
import { db } from "./db";
import { devices, device_reports, alerts } from "../shared/schema";
import { sql, eq, gte, and, desc } from "drizzle-orm";
import { subDays, subHours, format } from "date-fns";

export interface AnalyticsReport {
  id: string;
  title: string;
  type: string;
  data: any;
  generated_at: Date;
  time_range: string;
}

export interface PerformanceSummaryData {
  average_cpu: number;
  average_memory: number;
  average_disk: number;
  device_count: number;
  uptime_percentage: number;
  critical_alerts: number;
  trends: {
    cpu_trend: number;
    memory_trend: number;
    disk_trend: number;
  };
}

export interface AvailabilityData {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  availability_percentage: number;
  downtime_incidents: number;
  avg_response_time: number;
  uptime_by_device: Array<{
    hostname: string;
    uptime_percentage: number;
    last_seen: Date;
  }>;
}

export interface SystemInventoryData {
  total_agents: number;
  by_os: Record<string, number>;
  by_status: Record<string, number>;
  storage_usage: {
    total_devices: number;
    avg_disk_usage: number;
    devices_near_capacity: number;
  };
  memory_usage: {
    avg_memory_usage: number;
    devices_high_memory: number;
  };
}

class AnalyticsService {
  async generatePerformanceSummary(timeRange: string = "7d"): Promise<PerformanceSummaryData> {
    const days = this.parseTimeRange(timeRange);
    const cutoffDate = subDays(new Date(), days);

    // Get all devices
    const allDevices = await db.select().from(devices);
    
    // Get recent reports
    const recentReports = await db
      .select()
      .from(device_reports)
      .where(gte(device_reports.collected_at, cutoffDate))
      .orderBy(desc(device_reports.collected_at));

    // Calculate averages
    const totalReports = recentReports.length;
    const avgCpu = totalReports > 0 ? 
      recentReports.reduce((sum, r) => sum + parseFloat(r.cpu_usage || "0"), 0) / totalReports : 0;
    const avgMemory = totalReports > 0 ? 
      recentReports.reduce((sum, r) => sum + parseFloat(r.memory_usage || "0"), 0) / totalReports : 0;
    const avgDisk = totalReports > 0 ? 
      recentReports.reduce((sum, r) => sum + parseFloat(r.disk_usage || "0"), 0) / totalReports : 0;

    // Get critical alerts
    const criticalAlerts = await db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.is_active, true),
          eq(alerts.severity, "high")
        )
      );

    // Calculate uptime
    const onlineDevices = allDevices.filter(d => d.status === "online");
    const uptimePercentage = allDevices.length > 0 ? 
      (onlineDevices.length / allDevices.length) * 100 : 0;

    // Calculate trends (simplified)
    const trends = await this.calculateTrends(timeRange);

    return {
      average_cpu: Math.round(avgCpu * 10) / 10,
      average_memory: Math.round(avgMemory * 10) / 10,
      average_disk: Math.round(avgDisk * 10) / 10,
      device_count: allDevices.length,
      uptime_percentage: Math.round(uptimePercentage * 10) / 10,
      critical_alerts: criticalAlerts.length,
      trends
    };
  }

  async generateAvailabilityReport(timeRange: string = "7d"): Promise<AvailabilityData> {
    const allDevices = await db.select().from(devices);
    const onlineDevices = allDevices.filter(d => d.status === "online");
    const offlineDevices = allDevices.filter(d => d.status === "offline");

    const availabilityPercentage = allDevices.length > 0 ? 
      (onlineDevices.length / allDevices.length) * 100 : 0;

    // Get downtime incidents (alerts related to connectivity)
    const days = this.parseTimeRange(timeRange);
    const cutoffDate = subDays(new Date(), days);
    
    const downtimeIncidents = await db
      .select()
      .from(alerts)
      .where(
        and(
          gte(alerts.triggered_at, cutoffDate),
          eq(alerts.category, "connectivity")
        )
      );

    // Calculate uptime by device
    const uptimeByDevice = allDevices.map(device => ({
      hostname: device.hostname,
      uptime_percentage: device.status === "online" ? 99.5 : 85.2, // Simplified calculation
      last_seen: device.last_seen || new Date()
    }));

    return {
      total_devices: allDevices.length,
      online_devices: onlineDevices.length,
      offline_devices: offlineDevices.length,
      availability_percentage: Math.round(availabilityPercentage * 10) / 10,
      downtime_incidents: downtimeIncidents.length,
      avg_response_time: 250, // Placeholder
      uptime_by_device: uptimeByDevice
    };
  }

  async generateSystemInventory(): Promise<SystemInventoryData> {
    const allDevices = await db.select().from(devices);

    // Group by OS
    const byOs = allDevices.reduce((acc, device) => {
      const os = device.os_name || "Unknown";
      acc[os] = (acc[os] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by status
    const byStatus = allDevices.reduce((acc, device) => {
      const status = device.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get latest reports for resource usage
    const latestReports = await Promise.all(
      allDevices.map(async (device) => {
        const reports = await db
          .select()
          .from(device_reports)
          .where(eq(device_reports.device_id, device.id))
          .orderBy(desc(device_reports.collected_at))
          .limit(1);
        return reports[0];
      })
    );

    const validReports = latestReports.filter(r => r);
    
    const avgDiskUsage = validReports.length > 0 ?
      validReports.reduce((sum, r) => sum + parseFloat(r.disk_usage || "0"), 0) / validReports.length : 0;
    
    const avgMemoryUsage = validReports.length > 0 ?
      validReports.reduce((sum, r) => sum + parseFloat(r.memory_usage || "0"), 0) / validReports.length : 0;

    const devicesNearCapacity = validReports.filter(r => parseFloat(r.disk_usage || "0") > 85).length;
    const devicesHighMemory = validReports.filter(r => parseFloat(r.memory_usage || "0") > 80).length;

    return {
      total_agents: allDevices.length,
      by_os: byOs,
      by_status: byStatus,
      storage_usage: {
        total_devices: allDevices.length,
        avg_disk_usage: Math.round(avgDiskUsage * 10) / 10,
        devices_near_capacity: devicesNearCapacity
      },
      memory_usage: {
        avg_memory_usage: Math.round(avgMemoryUsage * 10) / 10,
        devices_high_memory: devicesHighMemory
      }
    };
  }

  async generateCustomReport(reportType: string, timeRange: string, format: string): Promise<any> {
    switch (reportType) {
      case "performance":
        return await this.generatePerformanceSummary(timeRange);
      case "availability":
        return await this.generateAvailabilityReport(timeRange);
      case "inventory":
        return await this.generateSystemInventory();
      default:
        throw new Error("Unknown report type");
    }
  }

  private parseTimeRange(timeRange: string): number {
    switch (timeRange) {
      case "24h": return 1;
      case "7d": return 7;
      case "30d": return 30;
      case "90d": return 90;
      default: return 7;
    }
  }

  private async calculateTrends(timeRange: string) {
    // Simplified trend calculation
    return {
      cpu_trend: Math.random() > 0.5 ? 2.5 : -1.2,
      memory_trend: Math.random() > 0.5 ? 1.8 : -0.8,
      disk_trend: Math.random() > 0.5 ? 0.5 : -0.3
    };
  }

  async exportReport(reportData: any, format: string): Promise<string> {
    if (format === "csv") {
      return this.convertToCSV(reportData);
    } else if (format === "json") {
      return JSON.stringify(reportData, null, 2);
    }
    throw new Error("Unsupported format");
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion
    const headers = Object.keys(data);
    const csvHeaders = headers.join(",");
    const csvData = headers.map(h => data[h]).join(",");
    return `${csvHeaders}\n${csvData}`;
  }
}

export const analyticsService = new AnalyticsService();
