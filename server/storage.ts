import { devices, device_reports, alerts, type Device, type InsertDevice, type DeviceReport, type InsertDeviceReport, type Alert, type InsertAlert } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Device operations
  getDevices(): Promise<Device[]>;
  getDevice(id: string): Promise<Device | undefined>;
  getDeviceByHostname(hostname: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, device: Partial<InsertDevice>): Promise<Device | undefined>;

  // Device report operations
  createDeviceReport(report: InsertDeviceReport): Promise<DeviceReport>;
  getDeviceReports(deviceId: string): Promise<DeviceReport[]>;
  getLatestDeviceReport(deviceId: string): Promise<DeviceReport | undefined>;

  // Alert operations
  getActiveAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;

  // Dashboard operations
  getDashboardSummary(): Promise<{
    total_devices: number;
    online_devices: number;
    offline_devices: number;
    active_alerts: number;
  }>;
}

export class MemStorage implements IStorage {
  private devices: Map<string, Device>;
  private deviceReports: Map<string, DeviceReport>;
  private alerts: Map<string, Alert>;
  private currentId: number;

  constructor() {
    this.devices = new Map();
    this.deviceReports = new Map();
    this.alerts = new Map();
    this.currentId = 1;

    // Add some sample data for development
    this.initializeSampleData();
  }

  private generateId(): string {
    return `${this.currentId++}`;
  }

  private initializeSampleData() {
    // Sample devices
    const sampleDevices: Device[] = [
      {
        id: this.generateId(),
        hostname: "WS-FINANCE-01",
        assigned_user: "john.doe@company.com",
        os_name: "Windows 11 Pro",
        os_version: "22H2 (Build 22621)",
        ip_address: "192.168.1.101",
        status: "online",
        last_seen: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: this.generateId(),
        hostname: "SRV-DATABASE",
        assigned_user: "system@company.com",
        os_name: "Ubuntu Server",
        os_version: "22.04 LTS",
        ip_address: "192.168.1.200",
        status: "online",
        last_seen: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: this.generateId(),
        hostname: "WS-DEV-03",
        assigned_user: "jane.smith@company.com",
        os_name: "macOS Ventura",
        os_version: "13.6",
        ip_address: "192.168.1.150",
        status: "offline",
        last_seen: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    sampleDevices.forEach(device => {
      this.devices.set(device.id, device);

      // Add sample reports for online devices
      if (device.status === "online") {
        const report: DeviceReport = {
          id: this.generateId(),
          device_id: device.id,
          collected_at: new Date(),
          cpu_usage: device.hostname === "SRV-DATABASE" ? "92" : "45",
          memory_usage: device.hostname === "SRV-DATABASE" ? "87" : "67",
          disk_usage: "34",
          network_io: "1200000",
          raw_data: {
            hardware: { cpu: "Intel Core i7", memory: "32GB" },
            system_health: { cpu_percent: device.hostname === "SRV-DATABASE" ? 92 : 45 }
          }
        };
        this.deviceReports.set(report.id, report);
      }
    });

    // Sample alerts
    const sampleAlerts: Alert[] = [
      {
        id: this.generateId(),
        device_id: "2", // SRV-DATABASE
        category: "performance",
        severity: "critical",
        message: "High CPU usage detected (92%)",
        metadata: { cpu_usage: 92, threshold: 80 },
        triggered_at: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        resolved_at: null,
        is_active: true
      },
      {
        id: this.generateId(),
        device_id: "1", // WS-FINANCE-01
        category: "storage",
        severity: "warning", 
        message: "Disk space running low on C: drive",
        metadata: { disk_usage: 85, threshold: 80 },
        triggered_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        resolved_at: null,
        is_active: true
      }
    ];

    sampleAlerts.forEach(alert => {
      this.alerts.set(alert.id, alert);
    });
  }

  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDevice(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async getDeviceByHostname(hostname: string): Promise<Device | undefined> {
    return Array.from(this.devices.values()).find(device => device.hostname === hostname);
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const id = this.generateId();
    const newDevice: Device = {
      ...device,
      id,
      created_at: new Date(),
      updated_at: new Date()
    };
    this.devices.set(id, newDevice);
    return newDevice;
  }

  async updateDevice(id: string, device: Partial<InsertDevice>): Promise<Device | undefined> {
    const existing = this.devices.get(id);
    if (!existing) return undefined;

    const updated: Device = {
      ...existing,
      ...device,
      updated_at: new Date()
    };
    this.devices.set(id, updated);
    return updated;
  }

  async createDeviceReport(report: InsertDeviceReport): Promise<DeviceReport> {
    const id = this.generateId();
    const newReport: DeviceReport = {
      ...report,
      id,
      collected_at: new Date()
    };
    this.deviceReports.set(id, newReport);
    return newReport;
  }

  async getDeviceReports(deviceId: string): Promise<DeviceReport[]> {
    return Array.from(this.deviceReports.values())
      .filter(report => report.device_id === deviceId)
      .sort((a, b) => new Date(b.collected_at!).getTime() - new Date(a.collected_at!).getTime());
  }

  async getLatestDeviceReport(deviceId: string): Promise<DeviceReport | undefined> {
    const reports = await this.getDeviceReports(deviceId);
    return reports[0];
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.is_active)
      .sort((a, b) => new Date(b.triggered_at!).getTime() - new Date(a.triggered_at!).getTime());
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = this.generateId();
    const newAlert: Alert = {
      ...alert,
      id,
      triggered_at: new Date()
    };
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async getDashboardSummary(): Promise<{
    total_devices: number;
    online_devices: number;
    offline_devices: number;
    active_alerts: number;
  }> {
    const allDevices = Array.from(this.devices.values());
    const activeAlerts = Array.from(this.alerts.values()).filter(alert => alert.is_active);

    return {
      total_devices: allDevices.length,
      online_devices: allDevices.filter(device => device.status === "online").length,
      offline_devices: allDevices.filter(device => device.status === "offline").length,
      active_alerts: activeAlerts.length
    };
  }
}

export class DatabaseStorage implements IStorage {
  async getDevices(): Promise<Device[]> {
    const allDevices = await db.select().from(devices);
    return allDevices;
  }

  async getDevice(id: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device || undefined;
  }

  async getDeviceByHostname(hostname: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.hostname, hostname));
    return device || undefined;
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const [newDevice] = await db
      .insert(devices)
      .values({
        ...device,
        assigned_user: device.assigned_user || null,
        os_name: device.os_name || null,
        os_version: device.os_version || null,
        ip_address: device.ip_address || null,
        status: device.status || "offline",
        last_seen: device.last_seen || null
      })
      .returning();
    return newDevice;
  }

  async updateDevice(id: string, device: Partial<InsertDevice>): Promise<Device | undefined> {
    const [updatedDevice] = await db
      .update(devices)
      .set({
        ...device,
        updated_at: new Date()
      })
      .where(eq(devices.id, id))
      .returning();
    return updatedDevice || undefined;
  }

  async createDeviceReport(report: InsertDeviceReport): Promise<DeviceReport> {
    const [newReport] = await db
      .insert(device_reports)
      .values({
        ...report,
        cpu_usage: report.cpu_usage || null,
        memory_usage: report.memory_usage || null,
        disk_usage: report.disk_usage || null,
        network_io: report.network_io || null
      })
      .returning();
    return newReport;
  }

  async getDeviceReports(deviceId: string): Promise<DeviceReport[]> {
    const reports = await db
      .select()
      .from(device_reports)
      .where(eq(device_reports.device_id, deviceId))
      .orderBy(desc(device_reports.collected_at));
    return reports;
  }

  async getLatestDeviceReport(deviceId: string): Promise<DeviceReport | undefined> {
    const [report] = await db
      .select()
      .from(device_reports)
      .where(eq(device_reports.device_id, deviceId))
      .orderBy(desc(device_reports.collected_at))
      .limit(1);
    return report || undefined;
  }

  async getActiveAlerts(): Promise<Alert[]> {
    const activeAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.is_active, true))
      .orderBy(desc(alerts.triggered_at));
    return activeAlerts;
  }

  async getActiveAlertByDeviceAndMetric(deviceId: string, metric: string): Promise<Alert | null> {
    const result = await db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.device_id, deviceId),
          eq(alerts.is_active, true),
          sql`${alerts.metadata}->>'metric' = ${metric}`
        )
      )
      .limit(1);

    return result[0] || null;
  }

  async updateAlert(alertId: string, updates: Partial<Alert>): Promise<void> {
    await db
      .update(alerts)
      .set({
        ...updates,
        triggered_at: new Date() // Update timestamp when alert is updated
      })
      .where(eq(alerts.id, alertId));
  }

  async resolveAlert(alertId: string): Promise<void> {
    await db
      .update(alerts)
      .set({
        is_active: false,
        resolved_at: new Date()
      })
      .where(eq(alerts.id, alertId));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db
      .insert(alerts)
      .values({
        ...alert,
        metadata: alert.metadata || {},
        resolved_at: alert.resolved_at || null,
        is_active: alert.is_active ?? true
      })
      .returning();
    return newAlert;
  }

  async getDashboardSummary(): Promise<{
    total_devices: number;
    online_devices: number;
    offline_devices: number;
    active_alerts: number;
  }> {
    const allDevices = await db.select().from(devices);
    const activeAlerts = await db.select().from(alerts).where(eq(alerts.is_active, true));

    return {
      total_devices: allDevices.length,
      online_devices: allDevices.filter(device => device.status === "online").length,
      offline_devices: allDevices.filter(device => device.status === "offline").length,
      active_alerts: activeAlerts.length
    };
  }
}

export const storage = new DatabaseStorage();