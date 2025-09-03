import {
  devices,
  device_reports,
  alerts,
  type Device,
  type InsertDevice,
  type DeviceReport,
  type InsertDeviceReport,
  type Alert,
  type InsertAlert,
} from "@shared/schema";
import { db } from "./db";
import { users, type User } from "@shared/user-schema";
import {
  tickets,
  ticketComments,
  ticketAttachments,
  knowledgeBase,
} from "@shared/ticket-schema";
import { auditLog } from "@shared/admin-schema";
import { eq, desc, gte, and, sql, or, like, count } from "drizzle-orm";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface IStorage {
  // Device operations
  getDevices(): Promise<Device[]>;
  getDevice(id: string): Promise<Device | undefined>;
  getDeviceByHostname(hostname: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(
    id: string,
    device: Partial<InsertDevice>,
  ): Promise<Device | undefined>;

  // Device report operations
  createDeviceReport(report: InsertDeviceReport): Promise<DeviceReport>;
  getDeviceReports(deviceId: string): Promise<DeviceReport[]>;
  getLatestDeviceReport(deviceId: string): Promise<DeviceReport | undefined>;

  // Alert operations
  getActiveAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  resolveAlert(alertId: string): Promise<void>;
  markAlertAsRead(alertId: string, userId: string): Promise<void>;
  getAlertById(alertId: string): Promise<Alert | null>;

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
  private users: Map<string, any>;
  private currentId: number;

  constructor() {
    this.devices = new Map();
    this.deviceReports = new Map();
    this.alerts = new Map();
    this.users = new Map();
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
        updated_at: new Date(),
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
        updated_at: new Date(),
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
        updated_at: new Date(),
      },
    ];

    sampleDevices.forEach((device) => {
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
            system_health: {
              cpu_percent: device.hostname === "SRV-DATABASE" ? 92 : 45,
            },
          },
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
        is_active: true,
        is_read: false,
        read_by: null,
        read_at: null,
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
        is_active: true,
        is_read: false,
        read_by: null,
        read_at: null,
      },
    ];

    sampleAlerts.forEach((alert) => {
      this.alerts.set(alert.id, alert);
    });

    // Sample users for demo
    const sampleUsers = [
      {
        id: this.generateId(),
        email: "admin@company.com",
        name: "System Administrator",
        password_hash: "$2b$10$dummy.hash.for.demo", // Demo: admin123
        role: "admin",
        department: "IT",
        phone: "+1 (555) 123-4567",
        is_active: true,
        last_login: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: this.generateId(),
        email: "tech@company.com",
        name: "John Technician",
        password_hash: "$2b$10$dummy.hash.for.demo", // Demo: tech123
        role: "technician",
        department: "IT Support",
        phone: "+1 (555) 123-4568",
        is_active: true,
        last_login: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: this.generateId(),
        email: "manager@company.com",
        name: "Jane Manager",
        password_hash: "$2b$10$dummy.hash.for.demo", // Demo: demo123
        role: "manager",
        department: "IT",
        phone: "+1 (555) 123-4569",
        is_active: true,
        last_login: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: this.generateId(),
        email: "user@company.com",
        name: "Bob User",
        password_hash: "$2b$10$dummy.hash.for.demo", // Demo: demo123
        role: "user",
        department: "Finance",
        phone: "+1 (555) 123-4570",
        is_active: true,
        last_login: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    this.users = new Map();
    sampleUsers.forEach((user) => {
      this.users.set(user.id, user);
    });
  }

  // User management methods for in-memory storage
  async getUsers(
    filters: { search?: string; role?: string } = {},
  ): Promise<any[]> {
    let users = Array.from(this.users.values());

    if (filters.search) {
      const search = filters.search.toLowerCase();
      users = users.filter(
        (user) =>
          user.name.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search),
      );
    }

    if (filters.role && filters.role !== "all") {
      users = users.filter((user) => user.role === filters.role);
    }

    return users.map((user) => {
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  async getUserById(id: string): Promise<any | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async createUser(data: any): Promise<any> {
    const id = this.generateId();
    const newUser = {
      ...data,
      id,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.users.set(id, newUser);

    const { password_hash, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async updateUser(id: string, updates: any): Promise<any | null> {
    const existing = this.users.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date(),
    };
    this.users.set(id, updated);

    const { password_hash, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDevice(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async getDeviceByHostname(hostname: string): Promise<Device | undefined> {
    return Array.from(this.devices.values()).find(
      (device) => device.hostname === hostname,
    );
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const id = this.generateId();
    const newDevice: Device = {
      ...device,
      id,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.devices.set(id, newDevice);
    return newDevice;
  }

  async updateDevice(
    id: string,
    device: Partial<InsertDevice>,
  ): Promise<Device | undefined> {
    const existing = this.devices.get(id);
    if (!existing) return undefined;

    const updated: Device = {
      ...existing,
      ...device,
      updated_at: new Date(),
    };
    this.devices.set(id, updated);
    return updated;
  }

  async createDeviceReport(report: InsertDeviceReport): Promise<DeviceReport> {
    const id = this.generateId();
    const newReport: DeviceReport = {
      ...report,
      id,
      collected_at: new Date(),
    };
    this.deviceReports.set(id, newReport);
    return newReport;
  }

  async getDeviceReports(deviceId: string): Promise<DeviceReport[]> {
    return Array.from(this.deviceReports.values())
      .filter((report) => report.device_id === deviceId)
      .sort(
        (a, b) =>
          new Date(b.collected_at!).getTime() -
          new Date(a.collected_at!).getTime(),
      );
  }

  async getLatestDeviceReport(
    deviceId: string,
  ): Promise<DeviceReport | undefined> {
    const reports = await this.getDeviceReports(deviceId);
    return reports[0];
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter((alert) => alert.is_active)
      .sort(
        (a, b) =>
          new Date(b.triggered_at!).getTime() -
          new Date(a.triggered_at!).getTime(),
      );
  }

  async createAlert(alertData: {
    device_id: string;
    category: string;
    severity: string;
    message: string;
    metadata: any;
    is_active: boolean;
  }): Promise<Alert> {
    const alert: Alert = {
      id: this.generateId(),
      device_id: alertData.device_id,
      category: alertData.category,
      severity: alertData.severity,
      message: alertData.message,
      metadata: alertData.metadata,
      triggered_at: new Date(),
      resolved_at: null,
      is_active: alertData.is_active,
      is_read: false,
      read_by: null,
      read_at: null,
    };

    this.alerts.set(alert.id, alert);
    return alert;
  }

  async updateAlert(
    alertId: string,
    updateData: {
      severity?: string;
      message?: string;
      metadata?: any;
      is_active?: boolean;
      resolved_at?: Date;
    },
  ): Promise<Alert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return null;
    }

    // Update the alert with new data
    const updatedAlert: Alert = {
      ...alert,
      ...updateData,
      // Keep original triggered_at, update other fields as needed
    };

    this.alerts.set(alertId, updatedAlert);
    return updatedAlert;
  }

  async getActiveAlertByDeviceAndMetric(
    deviceId: string,
    metric: string,
  ): Promise<Alert | null> {
    const alert = Array.from(this.alerts.values()).find(
      (alert) =>
        alert.device_id === deviceId &&
        alert.is_active &&
        alert.metadata &&
        (alert.metadata as any).metric === metric,
    );
    return alert || null;
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolved_at = new Date();
      alert.is_active = false;
    }
  }

  async markAlertAsRead(alertId: string, userId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.is_read = true;
      alert.read_by = userId;
      alert.read_at = new Date();
    }
  }

  async getAlertById(alertId: string): Promise<Alert | null> {
    const alert = this.alerts.get(alertId);
    return alert || null;
  }

  async getDashboardSummary(): Promise<{
    total_devices: number;
    online_devices: number;
    offline_devices: number;
    active_alerts: number;
  }> {
    const devices = await this.getDevices();
    const alerts = await this.getAlerts();

    // Use consistent status calculation
    const now = new Date();
    let onlineCount = 0;
    let offlineCount = 0;

    devices.forEach(device => {
      const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
      const minutesSinceLastSeen = lastSeen ?
        Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60)) : null;

      if (minutesSinceLastSeen !== null && minutesSinceLastSeen < 5) {
        onlineCount++;
      } else {
        offlineCount++;
      }
    });

    return {
      total_devices: devices.length,
      online_devices: onlineCount,
      offline_devices: offlineCount,
      active_alerts: alerts.filter(a => a.is_active).length,
    };
  }
}

export class DatabaseStorage implements IStorage {
  private users?: Map<string, any>;

  // Initialize demo users if they don't exist
  async initializeDemoUsers() {
    try {
      console.log("Initializing demo users...");

      // First ensure the users table exists with proper schema
      try {
        const { pool } = await import("./db");

        // Create users table if it doesn't exist
        await pool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(100) UNIQUE NOT NULL,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            password_hash TEXT NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'end_user',
            department_id UUID,
            manager_id UUID,
            phone VARCHAR(20),
            mobile_phone VARCHAR(20),
            employee_id VARCHAR(50),
            job_title VARCHAR(100),
            location VARCHAR(100),
            office_location VARCHAR(100),
            work_hours VARCHAR(50),
            timezone VARCHAR(50),
            profile_picture TEXT,
            emergency_contact_name VARCHAR(100),
            emergency_contact_phone VARCHAR(20),
            cost_center VARCHAR(50),
            reporting_manager_email VARCHAR(255),
            permissions JSON DEFAULT '[]'::json,
            preferences JSON DEFAULT '{}'::json,
            is_active BOOLEAN DEFAULT true,
            is_locked BOOLEAN DEFAULT false,
            password_reset_required BOOLEAN DEFAULT false,
            failed_login_attempts INTEGER DEFAULT 0,
            last_login TIMESTAMP,
            last_password_change TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
          )
        `);

        console.log("Users table ensured");

        // Check if demo users already exist
        const existingCheck = await pool.query(
          `
          SELECT COUNT(*) as count FROM users WHERE email = $1
        `,
          ["admin@company.com"],
        );

        if (parseInt(existingCheck.rows[0].count) > 0) {
          console.log("Demo users already exist, skipping initialization");
          return;
        }

        console.log("Creating demo users...");
        const bcrypt = await import("bcrypt");

        const demoUsers = [
          {
            email: "admin@company.com",
            username: "admin",
            name: "System Administrator",
            first_name: "System",
            last_name: "Administrator",
            password_hash: await bcrypt.hash("admin123", 10),
            role: "admin",
            department: "IT",
            phone: "+1-555-0101",
            job_title: "System Administrator",
            location: "HQ",
            is_active: true,
          },
          {
            email: "manager@company.com",
            username: "manager",
            name: "IT Manager",
            first_name: "IT",
            last_name: "Manager",
            password_hash: await bcrypt.hash("demo123", 10),
            role: "manager",
            department: "IT",
            phone: "+1-555-0102",
            job_title: "IT Manager",
            location: "HQ",
            is_active: true,
          },
          {
            email: "tech@company.com",
            username: "tech",
            name: "Senior Technician",
            first_name: "Senior",
            last_name: "Technician",
            password_hash: await bcrypt.hash("tech123", 10),
            role: "technician",
            department: "IT Support",
            phone: "+1-555-0103",
            job_title: "Senior Technician",
            location: "HQ",
            is_active: true,
          },
          {
            email: "user@company.com",
            username: "enduser",
            name: "End User",
            first_name: "End",
            last_name: "User",
            password_hash: await bcrypt.hash("demo123", 10),
            role: "user",
            department: "Sales",
            phone: "+1-555-0104",
            job_title: "Sales Representative",
            location: "Branch Office",
            is_active: true,
          },
        ];

        for (const user of demoUsers) {
          await pool.query(
            `
            INSERT INTO users (
              email, username, first_name, last_name, password_hash, 
              role, department, phone, job_title, location, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `,
            [
              user.email,
              user.username,
              user.first_name,
              user.last_name,
              user.password_hash,
              user.role,
              user.department,
              user.phone,
              user.job_title,
              user.location,
              user.is_active,
            ],
          );
        }

        console.log("Demo users created successfully");
      } catch (dbError) {
        console.error("Database operation failed:", dbError);
        console.log("Using in-memory storage for demo users");

        // Fallback to in-memory storage
        if (!this.users) {
          this.users = new Map();
        }

        // Check if users already exist in memory
        const existingUser = Array.from(this.users?.values() || []).find(
          (u) => u.email === "admin@company.com",
        );
        if (existingUser) {
          console.log("Demo users already exist in memory");
          return;
        }

        const bcrypt = await import("bcrypt");

        const memoryUsers = [
          {
            id: "1",
            email: "admin@company.com",
            username: "admin",
            name: "System Administrator",
            password_hash: await bcrypt.hash("admin123", 10),
            role: "admin",
            department: "IT",
            phone: "+1-555-0101",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "2",
            email: "manager@company.com",
            username: "manager",
            name: "IT Manager",
            password_hash: await bcrypt.hash("demo123", 10),
            role: "manager",
            department: "IT",
            phone: "+1-555-0102",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "3",
            email: "tech@company.com",
            username: "tech",
            name: "Senior Technician",
            password_hash: await bcrypt.hash("tech123", 10),
            role: "technician",
            department: "IT Support",
            phone: "+1-555-0103",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "4",
            email: "user@company.com",
            username: "enduser",
            name: "End User",
            password_hash: await bcrypt.hash("demo123", 10),
            role: "user",
            department: "Sales",
            phone: "+1-555-0104",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];

        memoryUsers.forEach((user) => {
          this.users.set(user.id, user);
        });

        console.log("Demo users created in memory");
      }

      // Ensure knowledge base table exists
      try {
        await this.db.execute(sql`
          CREATE TABLE IF NOT EXISTS knowledge_base (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category VARCHAR(100),
            tags JSON DEFAULT '[]'::json,
            author_email VARCHAR(255) NOT NULL,
            status VARCHAR(20) DEFAULT 'draft',
            views INTEGER DEFAULT 0,
            helpful_votes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
          )
        `);
      } catch (error) {
        console.log("Knowledge base table may already exist");
      }

      // Initialize sample knowledge base articles
      await this.initializeSampleKBArticles();
    } catch (error) {
      console.error("Error initializing demo users:", error);
    }
  }

  async initializeSampleKBArticles() {
    try {
      const { knowledgeBase } = await import("@shared/ticket-schema");

      // Check if articles already exist
      const existingArticles = await db.select().from(knowledgeBase);
      if (existingArticles.length > 0) {
        console.log(
          "Knowledge base articles already exist, skipping initialization",
        );
        return;
      }

      const sampleArticles = [
        {
          title: "How to Reset Your Password",
          content: `# Password Reset Guide

Follow these steps to reset your password:

1. Navigate to the login page
2. Click "Forgot Password?"
3. Enter your email address
4. Check your email for reset instructions
5. Follow the link in the email
6. Create a new secure password

## Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

If you continue to have issues, contact IT support.`,
          category: "Account Management",
          tags: ["password", "login", "security"],
          author_email: "admin@company.com",
          status: "published",
          views: 45,
          helpful_votes: 12,
        },
        {
          title: "Computer Won't Start - Complete Troubleshooting Guide",
          content: `# Computer Won't Start - Troubleshooting Steps

## Quick Checks (Try These First)

### 1. Power Issues
- **Check Power Cable**: Ensure power cord is securely connected
- **Try Different Outlet**: Test with a known working power outlet
- **Check Power Strip**: If using power strip, try plugging directly into wall
- **Battery Check**: For laptops, try removing battery and using AC power only

### 2. Display Issues
- **Monitor Connection**: Check if monitor cable is properly connected
- **Monitor Power**: Ensure monitor is turned on and receiving power
- **Try Different Cable**: Use different VGA/HDMI/DisplayPort cable
- **External Monitor**: For laptops, connect external monitor to test

## Advanced Troubleshooting

### Hardware Reset
1. **Complete Power Down**: Hold power button for 10 seconds
2. **Unplug Everything**: Remove all USB devices, external drives
3. **Wait 30 Seconds**: Allow capacitors to discharge
4. **Reconnect and Test**: Plug back in and try starting

### Boot Sequence Issues
- **Safe Mode**: Try starting in Safe Mode (F8 during startup)
- **Last Known Good**: Try "Last Known Good Configuration"
- **System Restore**: Boot from recovery and restore to earlier point

## When to Contact IT
- Computer makes unusual noises (clicking, grinding)
- Repeated blue screen errors (BSOD)
- Smoke or burning smell
- Hardware reset doesn't work
- Multiple startup failures

**Emergency**: If you smell burning or see smoke, immediately unplug computer and contact IT`,
          category: "Troubleshooting",
          tags: ["startup", "hardware", "power", "boot"],
          author_email: "support@company.com",
          status: "published",
          views: 289,
          helpful_votes: 78,
        },
        {
          title: "Internet Not Working - Step by Step Fix",
          content: `# Internet Connection Problems

## Quick Network Fixes

### 1. Basic Connection Check
- **WiFi Icon**: Look for WiFi symbol in system tray (bottom right)
- **Ethernet Cable**: If wired, check cable connections
- **Router Lights**: Ensure router shows green/blue lights (not red)
- **Other Devices**: Test if phones/tablets can connect

### 2. Restart Network Components
**Order is important - follow this sequence:**
1. **Unplug Router**: Wait 30 seconds
2. **Unplug Modem**: Wait 30 seconds
3. **Restart Computer**: Complete shutdown and restart
4. **Plug Modem Back In**: Wait 2 minutes for full startup
5. **Plug Router Back In**: Wait 2 minutes for full startup
6. **Test Connection**: Try browsing to a website

## Windows Network Troubleshooting

### Network Troubleshooter
1. Right-click WiFi icon in system tray
2. Select "Troubleshoot problems"
3. Follow automated diagnostic steps
4. Apply any suggested fixes

### Reset Network Settings
Open Command Prompt as Administrator and run:
\`\`\`
ipconfig /flushdns
ipconfig /release
ipconfig /renew
netsh winsock reset
netsh int ip reset
\`\`\`
**Restart computer after running these commands

## WiFi Specific Issues

### Can't See Network
- **Refresh Networks**: Click WiFi icon and refresh list
- **Network Name**: Verify correct network name (SSID)
- **Distance**: Move closer to router/access point
- **5GHz vs 2.4GHz**: Try connecting to different frequency band

### Wrong Password Error
- **Case Sensitive**: Check uppercase/lowercase letters
- **Number vs Letter**: Verify 0 (zero) vs O (letter O)
- **Special Characters**: Double-check symbols and punctuation
- **Contact Admin**: Get fresh WiFi password from IT

## When It's Not Your Problem

### Service Provider Issues
- **Check Provider Status**: Visit ISP website for outage reports
- **Call Provider**: Report if widespread outage suspected
- **Backup Connection**: Use mobile hotspot temporarily

### Company Network Issues
- **Ask Colleagues**: Check if others have same problem
- **IT Helpdesk**: Contact if multiple users affected
- **VPN Issues**: Try disconnecting/reconnecting VPN

**Quick Test**: Try visiting google.com - if it loads, DNS might be the issue`,
          category: "Network",
          tags: ["internet", "wifi", "connectivity", "network"],
          author_email: "support@company.com",
          status: "published",
          views: 445,
          helpful_votes: 123,
        },
        {
          title: "Microsoft Office Issues - Common Problems & Solutions",
          content: `# Microsoft Office Troubleshooting Guide

## Word, Excel, PowerPoint Won't Open

### 1. Application Crashes
- **Safe Mode**: Hold Ctrl while clicking Office app icon
- **Run as Administrator**: Right-click app, select "Run as administrator"
- **Windows Updates**: Install all pending Windows updates
- **Office Updates**: File > Account > Update Options > Update Now

### 2. File Won't Open
- **Try Different File**: Test with new/different document
- **Compatibility Mode**: Try opening in compatibility mode
- **Copy File Locally**: If file is on network, copy to desktop first
- **Check File Extension**: Ensure .docx, .xlsx, .pptx extensions are correct

## Document Recovery

### AutoRecover Files
1. **Open Office App**: Start Word/Excel/PowerPoint
2. **File > Open**: Look for "Recover Unsaved Documents"
3. **Document Recovery Pane**: May appear automatically on startup
4. **Temp Files Location**:
   - Windows: \`C:\\Users\\[username]\\AppData\\Roaming\\Microsoft\\[App]\\UnsavedFiles\`

### Corrupted File Recovery
- **Open and Repair**: File > Open > Browse > Select file > Open dropdown > "Open and Repair"
- **Previous Versions**: Right-click file > Properties > Previous Versions
- **OneDrive Version History**: If saved to OneDrive, check version history online

## Common Office Errors

### "Not Enough Memory" Error
1. **Close Other Programs**: Free up system memory
2. **Restart Computer**: Clear memory completely
3. **Disable Add-ins**: File > Options > Add-ins > Manage > Go > Uncheck all
4. **Increase Virtual Memory**: Control Panel > System > Advanced > Performance Settings

### Activation Issues
- **Sign In**: File > Account > Sign in with company credentials
- **Retry Activation**: File > Account > Activate Product
- **Contact IT**: If activation fails, submit helpdesk ticket

## Formatting Problems

### Document Looks Different
- **Font Substitution**: Missing fonts replaced with defaults
- **Compatibility Mode**: File might be in older format
- **Display Settings**: Check Windows display scaling (100%, 125%, etc.)
- **Print Layout**: View > Print Layout for proper formatting view

### Slow Performance
- **Large Files**: Break large documents into smaller sections
- **Images**: Compress images (Picture Tools > Compress Pictures)
- **Track Changes**: Accept/reject all changes when done editing
- **Add-ins**: Disable unnecessary add-ins for better performance

## Email (Outlook) Issues

### Can't Send/Receive Email
- **Send/Receive Button**: Click manually to force sync
- **Offline Mode**: Check if "Work Offline" is disabled
- **Large Attachments**: Outlook has 25MB attachment limit
- **Mailbox Full**: Delete old emails to free space

### Calendar/Meeting Issues
- **Time Zone**: Verify correct time zone in Outlook settings
- **Free/Busy**: Check if calendar sharing is enabled
- **Meeting Responses**: Ensure responses are being sent
- **Sync Issues**: Try closing and reopening Outlook

**Quick Fix**: When in doubt, restart the Office application first!`,
          category: "Software",
          tags: ["office", "word", "excel", "outlook", "powerpoint"],
          author_email: "support@company.com",
          status: "published",
          views: 356,
          helpful_votes: 89,
        },
        {
          title: "How to Connect to Company WiFi",
          content: `# Company WiFi Connection Guide

## Initial WiFi Setup

### 1. Find Available Networks
**Windows 10/11:**
1. Click WiFi icon in system tray (bottom right)
2. Look for company network name (SSID)
3. Click on network name
4. Check "Connect automatically" if desired
5. Click "Connect"

**Common Company Network Names:**
- CompanyWiFi
- [CompanyName]_Secure
- Corporate_Network
- Guest_Network (for visitors)

### 2. Enter Credentials
**Personal Devices:**
- **Username**: Your company email address
- **Password**: Your domain/network password
- **Domain**: Usually company.com or company.local

**Company-Managed Devices:**
- May connect automatically
- Certificate-based authentication
- Contact IT if connection fails

## Authentication Methods

### WPA2-Enterprise (Most Secure)
**Settings Required:**
- **Security Type**: WPA2-Enterprise
- **Encryption**: AES
- **Authentication**: PEAP or EAP-TTLS
- **Username**: domain\\username or username@company.com
- **Password**: Your network password

### Certificate-Based Authentication
**For Company Devices:**
1. **Download Certificate**: From IT portal or email
2. **Install Certificate**: Double-click .cer file to install
3. **Connect to Network**: Should authenticate automatically
4. **Verify Connection**: Check for lock icon in WiFi status

## Troubleshooting Connection Issues

### Can't See Company Network
**Signal Strength:**
- Move closer to wireless access point
- Check if 2.4GHz or 5GHz network is stronger
- Some networks broadcast both frequencies

**Network Broadcasting:**
- Company may hide network name (SSID)
- Manually add network: WiFi Settings > Manage known networks > Add network
- Enter exact network name and security details

### Authentication Failures
**Wrong Credentials:**
- Verify username format (with or without domain)
- Check password carefully (case-sensitive)
- Ensure account isn't locked out

**Certificate Issues:**
- Download latest certificate from IT
- Clear saved network and reconnect
- Contact IT for certificate installation

### Connection Drops Frequently
**Power Management:**
1. Device Manager > Network adapters
2. Right-click WiFi adapter > Properties
3. Power Management tab
4. Uncheck "Allow computer to turn off this device"

**Profile Reset:**
1. Forget/remove network from saved networks
2. Restart computer
3. Reconnect with fresh credentials

## Guest Network Access

### For Visitors
**Guest Network Features:**
- Internet access only (no internal resources)
- Time-limited access (usually 24 hours)
- May require sponsor approval
- Bandwidth limitations may apply

**Getting Guest Access:**
1. **Self-Registration**: Use web portal when connected
2. **Sponsor Request**: Have employee request access
3. **Reception Desk**: Get temporary credentials from front desk
4. **Meeting Rooms**: Special guest codes may be available

### Guest Network Limitations
- No access to company printers
- Can't reach internal websites/applications
- File sharing disabled
- VPN may be required for company resources

## Security Best Practices

### Device Security
**Automatic Connection:**
- Only enable for trusted company networks
- Disable for public/guest networks
- Regularly review saved networks

**VPN Usage:**
- Use company VPN when on guest networks
- Required for accessing internal resources
- Connect to VPN before accessing company data

### Password Security
- **Never Share**: Don't give WiFi password to non-employees
- **Change Regularly**: Update when prompted by IT
- **Report Compromises**: Contact IT if password may be compromised

## Mobile Device Setup

### iPhone/iPad
1. Settings > WiFi
2. Select company network
3. Enter username and password
4. Trust certificate when prompted
5. Test connection with company email

### Android
1. Settings > WiFi
2. Select company network
3. Choose security type (usually WPA2-Enterprise)
4. Enter credentials as specified by IT
5. Install certificate if required

## Advanced Configuration

### Manual Network Setup
**When Auto-Connect Fails:**
1. **Network Name**: Get exact SSID from IT
2. **Security Type**: Usually WPA2-Enterprise
3. **EAP Method**: PEAP or EAP-TTLS
4. **Phase 2 Auth**: MSCHAPv2 (most common)
5. **CA Certificate**: Install if provided by IT

### Proxy Settings
**If Required by Company:**
- Get proxy server address and port from IT
- Configure in Windows: Settings > Network > Proxy
- Apply to browsers and applications as needed

**Need Help?** Contact IT with your device type and specific error messages for faster resolution.`,
          category: "Network",
          tags: ["wifi", "wireless", "connection", "authentication"],
          author_email: "support@company.com",
          status: "published",
          views: 523,
          helpful_votes: 134,
        },
        {
          title: "How to Print from Your Computer",
          content: `# Complete Printing Guide

## Setting Up a Printer

### 1. Connect to Network Printer
**Windows 10/11:**
1. **Settings** > **Devices** > **Printers & scanners**
2. Click **"Add a printer or scanner"**
3. Wait for automatic detection
4. Select your printer from list
5. Follow installation prompts

**Can't Find Printer?**
- Click **"The printer that I want isn't listed"**
- Select **"Add a printer using a TCP/IP address"**
- Enter printer IP address (get from IT)
- Choose printer model and install

### 2. Install Printer Drivers
**Automatic Installation:**
- Windows usually downloads drivers automatically
- Allow Windows to complete installation
- Test print after installation finishes

**Manual Driver Installation:**
1. **Identify Printer Model**: Sticker on printer
2. **Download Drivers**: From manufacturer website
   - HP: hp.com/support
   - Canon: canon.com/support
   - Epson: epson.com/support
3. **Run Installer**: Follow manufacturer instructions
4. **Restart Computer**: If prompted by installer

## Printing Documents

### Basic Printing
**From Any Application:**
1. **File** > **Print** (or Ctrl+P)
2. **Select Printer**: Choose correct printer from dropdown
3. **Page Range**: All pages, current page, or custom range
4. **Copies**: Specify number of copies needed
5. **Click Print**

### Print Settings
**Paper Size & Orientation:**
- **Letter (8.5x11)**: Standard US paper size
- **A4**: Standard international paper size
- **Legal (8.5x14)**: For legal documents
- **Portrait vs Landscape**: Choose based on content

**Quality Settings:**
- **Draft**: Fast, uses less ink, lower quality
- **Normal**: Standard quality for everyday printing
- **Best/High**: Slow, uses more ink, highest quality

## Common Printing Problems

### Nothing Prints
**Check Printer Status:**
1. **Printer Power**: Ensure printer is turned on
2. **Connection**: Check USB cable or network connection
3. **Paper**: Make sure paper tray isn't empty
4. **Ink/Toner**: Check if cartridges need replacement

**Clear Print Queue:**
1. **Settings** > **Devices** > **Printers & scanners**
2. Click on your printer
3. **Open queue**
4. **Cancel all documents** if stuck
5. **Restart print spooler**: Services.msc > Print Spooler > Restart

### Print Quality Issues
**Faded or Light Printing:**
- Replace ink/toner cartridges
- Check if in "Draft" or "Eco" mode
- Run printer cleaning cycle from settings
- Ensure correct paper type selected

**Smudged or Streaked Output:**
- Clean printer heads (usually in printer settings)
- Check for paper jams or debris
- Use correct paper type (not too thin/thick)
- Replace old or damaged cartridges

### Paper Problems
**Paper Jams:**
1. **Turn Off Printer**: Always power down first
2. **Open Covers**: Check all access panels
3. **Remove Paper**: Pull gently in direction of paper path
4. **Check for Torn Pieces**: Remove any remaining bits
5. **Close Covers**: Power on and test print

**Wrong Paper Size:**
- **Printer Settings**: Check selected paper size in driver
- **Application Settings**: Verify page setup in document
- **Physical Tray**: Ensure correct paper is loaded
- **Tray Settings**: Some printers have tray-specific settings

## Color vs Black and White

### Saving Ink/Toner
**Black and White Only:**
- Select "Print in grayscale" or "Black ink only"
- Good for text documents, drafts, internal memos
- Significantly reduces color cartridge usage

**When to Use Color:**
- Presentations for clients/management
- Charts and graphs with color coding
- Marketing materials and brochures
- Photos and images

### Duplex (Double-Sided) Printing
**Automatic Duplex:**
- Select "Print on both sides" in print dialog
- Choose "Flip on long edge" for typical documents
- "Flip on short edge" for booklet-style binding

**Manual Duplex:**
1. Print odd pages first
2. Reinsert paper with blank side facing down
3. Print even pages
4. Check page orientation before printing page 2

## Network Printer Issues

### Can't Connect to Shared Printer
**Windows Network Discovery:**
1. **Control Panel** > **Network and Sharing Center**
2. **Change advanced sharing settings**
3. **Turn on network discovery**
4. **Turn on file and printer sharing**

**Printer Server Problems:**
- Check if printer server computer is running
- Verify shared printer permissions
- Contact IT if authentication fails

### Printing from Mobile Devices
**iPhone/iPad:**
- Use **AirPrint** compatible printers
- Ensure device on same WiFi network
- Print directly from apps using share button

**Android:**
- Install manufacturer's print app
- Use **Google Cloud Print** (if supported)
- Print via email (some printers accept email attachments)

## Special Printing Tasks

### Print Email Messages
**Outlook:**
- Open email message
- File > Print
- May need to adjust layout for better formatting

**Web-based Email:**
- Use browser's print function (Ctrl+P)
- May need to adjust layout for better formatting

### Print Web Pages
**Better Web Printing:**
- Use "Reader Mode" if available in browser
- Print preview to check layout
- Adjust scaling if content is cut off
- Consider "Print to PDF" for digital copies

### Large Format Printing
**Posters and Banners:**
- Check if printer supports large paper sizes
- May need special plotter or wide-format printer
- Contact IT for availability and scheduling

**Print Shop Services:**
- For professional quality large prints
- Submit files in PDF format for best results
- Allow extra time for external printing services

**Printer Not Listed?** Contact IT helpdesk with printer location and model number for setup assistance.`,
          category: "Hardware",
          tags: ["printer", "printing", "paper", "setup"],
          author_email: "support@company.com",
          status: "published",
          views: 467,
          helpful_votes: 118,
        },
        {
          title: "WiFi Connection Problems",
          content: `# WiFi Connectivity Issues

## Step-by-Step WiFi Troubleshooting

### 1. Basic WiFi Fixes
- Turn WiFi off and on again
- Forget and reconnect to network
- Restart your device
- Move closer to router

### 2. Windows WiFi Issues

# Reset network settings (Run as Administrator)
netsh winsock reset
netsh int ip reset
ipconfig /release
ipconfig /renew
ipconfig /flushdns


### 3. Check Network Status
- Verify if others have same issue
- Check company network status page
- Try connecting to guest network

### 4. Advanced Solutions
- Update WiFi adapter drivers
- Reset network adapter in Device Manager
- Check for Windows updates

## Corporate WiFi Setup
1. Connect to "CompanyWiFi" network
2. Enter your domain credentials (username@company.com)
3. Install company certificate if prompted
4. Contact IT if certificate installation fails

## Speed Issues
- Run speed test (speedtest.net)
- Close bandwidth-heavy applications
- Switch to 5GHz network if available
- Consider ethernet connection for important tasks

**Note**: Personal devices must be registered with IT before connecting to corporate WiFi`,
          category: "Network",
          tags: ["wifi", "network", "connectivity", "troubleshooting"],
          author_email: "netadmin@company.com",
          status: "published",
          views: 189,
          helpful_votes: 34,
        },
        {
          title: "Software Installation and Updates",
          content: `# Software Installation Guide

## Approved Software Installation

### Through Company Portal
1. Open Company Software Center
2. Browse or search for required software
3. Click Install and wait for completion
4. Restart if prompted

### Application Updates
- Most business apps update automatically
- Adobe/Office apps: Update through respective clients
- Chrome/Firefox: Updates happen automatically

## Installation Issues

### "Administrator Rights Required"
- Submit IT ticket for software installation
- Provide business justification
- Include software name and version

### "Installation Failed"
1. Run Windows Update
2. Clear temporary files
3. Restart and try again
4. Contact IT if error persists

### Prohibited Software
- Peer-to-peer applications
- Cracked/pirated software
- Personal gaming software
- Unapproved browser extensions

**Security Note**: Only install software from official sources and company-approved lists`,
          category: "Software",
          tags: ["installation", "updates", "applications", "security"],
          author_email: "support@company.com",
          status: "published",
          views: 134,
          helpful_votes: 22,
        },
        {
          title: "Computer Running Slow - Performance Guide",
          content: `# Computer Performance Optimization

## Immediate Quick Fixes

### 1. Close Unnecessary Programs
- Press Ctrl+Shift+Esc to open Task Manager
- End high CPU/memory usage programs
- Disable startup programs you don't need

### 2. Restart Your Computer
- Close all programs and restart
- Install pending Windows updates
- Allow 5-10 minutes for startup optimization

### 3. Free Up Disk Space
- Empty Recycle Bin
- Clear Downloads folder
- Use Disk Cleanup tool (cleanmgr.exe)
- Remove temporary files

## Performance Monitoring

### Check System Resources
- **CPU Usage**: Should be <80% when idle
- **Memory**: Upgrade needed if consistently >85%
- **Disk Space**: Keep at least 15% free

### Task Manager Analysis
- **Processes Tab**: Identify resource-heavy programs
- **Startup Tab**: Disable unnecessary startup items
- **Performance Tab**: Monitor real-time usage

## Long-term Solutions

### Regular Maintenance
- Restart weekly (don't just sleep/hibernate)
- Run Windows Update monthly
- Clear browser cache weekly
- Scan for malware monthly

### Hardware Considerations
- **RAM**: Upgrade if <8GB
- **Storage**: Consider SSD upgrade
- **Age**: Computers >4 years may need replacement

## When to Contact IT
- Consistent high CPU with no heavy programs
- Blue screen errors (BSOD)
- Frequent freezing or crashes
- Performance hasn't improved after following this guide

**Prevention**: Avoid installing unnecessary software and keep files organized`,
          category: "Performance",
          tags: ["slow", "performance", "optimization", "maintenance"],
          author_email: "support@company.com",
          status: "published",
          views: 267,
          helpful_votes: 52,
        },
        {
          title: "Two-Factor Authentication Setup",
          content: `# Two-Factor Authentication (2FA) Setup

## Why 2FA is Required
- Protects against password breaches
- Required for accessing sensitive company data
- Compliance with security policies
- Reduces risk of account compromise

## Setting Up 2FA

### Microsoft Authenticator (Recommended)
1. **Download App**: Install Microsoft Authenticator from app store
2. **Add Account**: Open app, tap "+", select "Work or school account"
3. **Scan QR Code**: Follow prompts in company portal
4. **Verify**: Enter code from app to complete setup

### Alternative Methods
- **Text Messages**: Less secure, use only if app unavailable
- **Phone Calls**: For the next line.
smartphones
- **Hardware Tokens**: For high-security accounts

## Using 2FA Daily

### Login Process
1. Enter username and password normally
2. Wait for push notification OR open authenticator app
3. Approve notification or enter 6-digit code
4. Complete login

### Backup Codes
- Save backup codes in secure location
- Use if phone is unavailable
- Generate new codes after use

## Troubleshooting 2FA

### Common Issues
- **Time Sync**: Ensure phone time is correct
- **No Notifications**: Check app permissions
- **Wrong Codes**: Verify correct account selected

### Lost Phone/Device
1. Contact IT immediately
2. Use backup codes for temporary access
3. Setup 2FA on replacement device
4. Invalidate old device access

**Security Tip**: Never share 2FA codes with anyone, including IT staff`,
          category: "Security",
          tags: ["2fa", "authentication", "security", "microsoft"],
          author_email: "security@company.com",
          status: "published",
          views: 198,
          helpful_votes: 41,
        },
        {
          title: "File Sharing and OneDrive Issues",
          content: `# File Sharing and OneDrive Guide

## OneDrive Sync Issues

### Files Not Syncing
1. **Check Sync Status**: Look for OneDrive icon in system tray
2. **Pause and Resume**: Right-click OneDrive icon > Pause/Resume sync
3. **Restart OneDrive**: Exit completely and restart application
4. **Check Available Space**: Ensure sufficient local and cloud storage

### Sync Errors
- **File in Use**: Close file and wait for sync
- **Path Too Long**: Shorten folder/file names
- **Invalid Characters**: Remove special characters (< > : " | ? * \\)
- **Large Files**: Files >100GB need special handling

## File Sharing Best Practices

### Internal Sharing
1. **Right-click** file/folder in OneDrive
2. **Select "Share"**
3. **Enter colleague's email**
4. **Set permissions** (View/Edit)
5. **Add message** and send

### External Sharing
- Requires approval for external recipients
- Use "Anyone with link" sparingly
- Set expiration dates for sensitive documents
- Remove access when no longer needed

## Common File Issues

### Cannot Open Shared File
- Check if you have correct permissions
- Try opening in web browser
- Clear browser cache/cookies
- Ask sender to reshare file

### Version Conflicts
- OneDrive creates copies for conflicting versions
- Review "ConflictedCopy" files manually
- Merge changes if necessary
- Delete conflicted copies after merging

### Storage Quota Issues
- **Check Usage**: OneDrive settings > Account
- **Free Up Space**: Delete unnecessary files
- **Archive Old Files**: Move to SharePoint or local backup
- **Request Increase**: Submit IT ticket for more storage

**Collaboration Tip**: Use "Co-authoring" in Office apps for real-time collaboration`,
          category: "Collaboration",
          tags: ["onedrive", "sharing", "sync", "collaboration"],
          author_email: "support@company.com",
          status: "published",
          views: 145,
          helpful_votes: 31,
        },
        {
          title: "Video Conferencing - Teams & Zoom Issues",
          content: `# Video Conferencing Troubleshooting

## Microsoft Teams Issues

### Cannot Join Meeting
1. **Use Web Browser**: Try joining through browser instead of app
2. **Update Teams**: Ensure latest version installed
3. **Check URL**: Verify meeting link is correct and not expired
4. **Phone Backup**: Use dial-in number if available

### Audio/Video Problems
- **Microphone**: Check if muted in Teams and Windows
- **Camera**: Verify camera permissions in Windows Privacy settings
- **Speakers**: Test audio devices in Teams settings
- **Bandwidth**: Close other applications using internet

### Screen Sharing Issues
- **Permission**: Allow Teams to record screen in Windows settings
- **Multiple Monitors**: Select correct monitor to share
- **Performance**: Close unnecessary applications before sharing

## Zoom Troubleshooting

### Poor Video Quality
1. **Check Internet**: Run speed test (minimum 1Mbps up/down)
2. **Close Apps**: Shut down bandwidth-heavy applications
3. **Lower Quality**: Reduce video quality in Zoom settings
4. **Use Ethernet**: Wired connection more stable than WiFi

### Echo or Audio Issues
- **Headphones**: Use headphones to prevent echo
- **Mute When Not Speaking**: Reduce background noise
- **Audio Settings**: Test microphone and speakers before meetings
- **Phone Audio**: Dial in for better audio quality

## Best Practices

### Before Important Meetings
- Test audio/video 15 minutes early
- Ensure good lighting (face toward light source)
- Use professional background or blur
- Charge laptop and have power cable ready

### During Meetings
- Mute when not speaking
- Use chat for questions during presentations
- Have backup dial-in number ready
- Keep meeting software updated

**Pro Tip**: Keep a backup device (phone/tablet) ready for critical meetings`,
          category: "Collaboration",
          tags: ["teams", "zoom", "video", "meetings", "audio"],
          author_email: "support@company.com",
          status: "published",
          views: 312,
          helpful_votes: 67,
        },
      ];

      await db.insert(knowledgeBase).values(sampleArticles);
      console.log("Sample knowledge base articles created successfully");
    } catch (error) {
      console.error("Error creating sample KB articles:", error);
    }
  }
  async getDevices(): Promise<Device[]> {
    try {
      // Try database first
      const { pool } = await import("./db");

      const result = await pool.query(`
        SELECT d.*, dr.cpu_usage, dr.memory_usage, dr.disk_usage, dr.network_io, dr.collected_at, dr.raw_data
        FROM devices d
        LEFT JOIN device_reports dr ON d.id = dr.device_id
        AND dr.id = (
          SELECT id FROM device_reports
          WHERE device_id = d.id
          ORDER BY collected_at DESC
          LIMIT 1
        )
        ORDER BY d.created_at DESC
      `);

      const now = new Date();

      return result.rows.map(row => {
        // Check if device has recent activity (within 10 minutes)
        const lastSeen = row.last_seen ? new Date(row.last_seen) : null;
        const lastReport = row.collected_at ? new Date(row.collected_at) : null;

        const minutesSinceLastSeen = lastSeen ?
          Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60)) : null;
        const minutesSinceLastReport = lastReport ?
          Math.floor((now.getTime() - lastReport.getTime()) / (1000 * 60)) : null;

        // Consider device online if it has recent activity
        const isOnline = (minutesSinceLastSeen !== null && minutesSinceLastSeen < 10) ||
                        (minutesSinceLastReport !== null && minutesSinceLastReport < 10);

        return {
          ...row,
          status: isOnline ? 'online' : 'offline',
          latest_report: row.cpu_usage ? {
            cpu_usage: row.cpu_usage,
            memory_usage: row.memory_usage,
            disk_usage: row.disk_usage,
            network_io: row.network_io,
            collected_at: row.collected_at,
            raw_data: row.raw_data
          } : null
        };
      });
    } catch (error) {
      console.error("Database error in getDevices:", error);

      // Return sample data if database fails
      return [
        {
          id: "1",
          hostname: "DESKTOP-CMMBJHC",
          assigned_user: "admin@company.com",
          os_name: "Windows 11 Pro",
          os_version: "Build 22621",
          ip_address: "192.168.1.101",
          status: "online",
          last_seen: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          latest_report: {
            cpu_usage: "45",
            memory_usage: "67",
            disk_usage: "34",
            network_io: "1200000",
            collected_at: new Date(),
          }
        }
      ];
    }
  }

  async getDevice(id: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device || undefined;
  }

  async getDeviceByHostname(hostname: string): Promise<Device | undefined> {
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.hostname, hostname));
    return device || undefined;
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const id = this.generateId();
    const newDevice: Device = {
      ...device,
      id,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.devices.set(id, newDevice);
    return newDevice;
  }

  async updateDevice(
    id: string,
    device: Partial<InsertDevice>,
  ): Promise<Device | undefined> {
    try {
      // Try database first
      const { pool } = await import("./db");

      const result = await pool.query(
        `UPDATE devices 
         SET hostname = COALESCE($2, hostname),
             assigned_user = COALESCE($3, assigned_user),
             os_name = COALESCE($4, os_name),
             os_version = COALESCE($5, os_version),
             ip_address = COALESCE($6, ip_address),
             status = COALESCE($7, status),
             last_seen = COALESCE($8, last_seen),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          device.hostname,
          device.assigned_user,
          device.os_name,
          device.os_version,
          device.ip_address,
          device.status,
          device.last_seen,
        ]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      return undefined;
    } catch (error) {
      console.error("Database update failed, using fallback:", error);

      // Fallback to in-memory storage
      if (!this.devices) {
        this.devices = new Map();
      }

      const existing = this.devices.get(id);
      if (!existing) return undefined;

      const updated: Device = {
        ...existing,
        ...device,
        updated_at: new Date(),
      };
      this.devices.set(id, updated);
      return updated;
    }
  }

  async createDeviceReport(report: InsertDeviceReport): Promise<DeviceReport> {
    const id = this.generateId();
    const newReport: DeviceReport = {
      ...report,
      id,
      collected_at: new Date(),
    };
    this.deviceReports.set(id, newReport);
    return newReport;
  }

  async getDeviceReports(deviceId: string, limit: number = 10): Promise<any[]> {
    try {
      const { pool } = await import('./db');
      const result = await pool.query(
        `SELECT * FROM device_reports WHERE device_id = $1 ORDER BY collected_at DESC LIMIT $2`,
        [deviceId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching device reports:', error);
      return [];
    }
  }

  async getRecentDeviceReports(deviceId: string, days: number = 7): Promise<any[]> {
    try {
      const { pool } = await import('./db');
      const result = await pool.query(
        `SELECT * FROM device_reports
         WHERE device_id = $1
         AND collected_at >= NOW() - INTERVAL '${days} days'
         ORDER BY collected_at DESC`,
        [deviceId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching recent device reports:', error);
      return [];
    }
  }

  async getLatestDeviceReport(
    deviceId: string,
  ): Promise<DeviceReport | undefined> {
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

  async getActiveAlertByDeviceAndMetric(
    deviceId: string,
    metric: string,
  ): Promise<Alert | null> {
    const result = await db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.device_id, deviceId),
          eq(alerts.is_active, true),
          sql`${alerts.metadata}->>'metric' = ${metric}`,
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  async updateAlert(alertId: string, updates: any) {
    await db
      .update(alerts)
      .set({
        ...updates,
        triggered_at: new Date(), // Update timestamp when alert is updated
      })
      .where(eq(alerts.id, alertId));
  }

  async getAlertById(alertId: string): Promise<Alert | null> {
    try {
      const [alert] = await db
        .select()
        .from(alerts)
        .where(eq(alerts.id, alertId));

      return alert || null;
    } catch (error) {
      console.error("Error fetching alert by ID:", error);
      return null;
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    console.log(`Resolving alert in database: ${alertId}`);

    const result = await db
      .update(alerts)
      .set({
        is_active: false,
        resolved_at: new Date(),
      })
      .where(eq(alerts.id, alertId))
      .returning();

    if (result.length === 0) {
      throw new Error(`Alert with ID ${alertId} not found`);
    }

    console.log(`Alert ${alertId} successfully resolved in database`);
  }

  async getUSBDevicesForDevice(deviceId: string): Promise<any[]> {
    try {
      const { db } = await import("./db");
      const { usb_devices } = await import("../shared/schema");
      const { eq, desc } = await import("drizzle-orm");

      const result = await db
        .select()
        .from(usb_devices)
        .where(eq(usb_devices.device_id, deviceId))
        .orderBy(desc(usb_devices.last_seen));

      return result;
    } catch (error) {
      console.error("Error fetching USB devices for device:", error);
      return [];
    }
  }

  async updateUSBDevices(deviceId: string, usbDevices: any[]): Promise<void> {
    try {
      const { db } = await import("./db");
      const { usb_devices } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");

      // First, mark all existing devices for this device as disconnected
      // Only update last_seen for devices that are actually changing from connected to disconnected
      await db
        .update(usb_devices)
        .set({ is_connected: false })
        .where(eq(usb_devices.device_id, deviceId));

      // Process each USB device from the current report
      for (const device of usbDevices) {
        // Extract vendor_id and product_id from device_id if not directly available
        let vendor_id = device.vendor_id;
        let product_id = device.product_id;
        let serial_number = device.serial_number;

        // Parse Windows-style device ID: USB\VID_0408&PID_5425\0001
        if (!vendor_id && !product_id && device.device_id) {
          const vidMatch = device.device_id.match(/VID_([0-9A-Fa-f]+)/);
          const pidMatch = device.device_id.match(/PID_([0-9A-Fa-f]+)/);
          const serialMatch = device.device_id.match(/\\([^\\]+)$/);

          if (vidMatch) vendor_id = vidMatch[1];
          if (pidMatch) product_id = pidMatch[1];
          if (serialMatch && !serial_number) serial_number = serialMatch[1];
        }

        console.log(
          `Processing USB device: ${device.description}, VID: ${vendor_id}, PID: ${product_id}, Serial: ${serial_number}`,
        );

        // Create a unique identifier for the device (prefer vendor_id:product_id combo or serial)
        const deviceIdentifier =
          vendor_id && product_id
            ? `${vendor_id}:${product_id}:${serial_number || "no-serial"}`
            : device.device_id ||
              device.serial_number ||
              `unknown-${Date.now()}`;

        // Check if this device already exists
        const existingDevices = await db
          .select()
          .from(usb_devices)
          .where(
            and(
              eq(usb_devices.device_id, deviceId),
              eq(usb_devices.device_identifier, deviceIdentifier),
            ),
          );

        if (existingDevices.length > 0) {
          // Update existing device - mark as connected and update last seen
          await db
            .update(usb_devices)
            .set({
              description: device.description || device.name,
              vendor_id: vendor_id,
              product_id: product_id,
              manufacturer: device.manufacturer,
              serial_number: serial_number,
              device_class: device.device_class || device.class,
              location: device.location,
              speed: device.speed,
              last_seen: new Date(),
              is_connected: true,
              raw_data: device,
            })
            .where(eq(usb_devices.id, existingDevices[0].id));
        } else {
          // Insert new device
          await db.insert(usb_devices).values({
            device_id: deviceId,
            device_identifier: deviceIdentifier,
            description: device.description || device.name,
            vendor_id: vendor_id,
            product_id: product_id,
            manufacturer: device.manufacturer,
            serial_number: serial_number,
            device_class: device.device_class || device.class,
            location: device.location,
            speed: device.speed,
            first_seen: new Date(),
            last_seen: new Date(),
            is_connected: true,
            raw_data: device,
          });
        }
      }

      console.log(
        `Updated USB devices for device ${deviceId}: ${usbDevices.length} devices processed`,
      );
    } catch (error) {
      console.error("Error updating USB devices:", error);
    }
  }

  // Knowledge Base methods - Database storage
  async getKBArticle(id) {
    try {
      // Try database first
      const { pool } = await import("./db");
      const result = await pool.query(
        `
        SELECT
          id, title, content, author_email, category, tags,
          created_at, updated_at, views, helpful_votes, status
        FROM knowledge_base
        WHERE id = $1
      `,
        [id],
      );

      if (result.rows.length > 0) {
        const article = result.rows[0];
        // Parse tags if they're stored as JSON
        if (typeof article.tags === "string") {
          try {
            article.tags = JSON.parse(article.tags);
          } catch {
            article.tags = [];
          }
        }
        return article;
      }
    } catch (dbError) {
      console.log("Database query failed for single article:", dbError.message);
    }

    // Return null if not found in database
    return null;
  }

  async incrementArticleViews(id) {
    try {
      const { pool } = await import("./db");
      await pool.query(
        `
        UPDATE knowledge_base
        SET views = COALESCE(views, 0) + 1
        WHERE id = $1
      `,
        [id],
      );
    } catch (error) {
      console.warn("Failed to increment article views in database:", error);
    }
  }

  // User management methods for database storage
  async getUsers(
    filters: { search?: string; role?: string } = {},
  ): Promise<any[]> {
    try {
      console.log("DatabaseStorage.getUsers called with filters:", filters);

      // Try database first
      try {
        const { pool } = await import("./db");

        // First, let's check if the users table exists and what columns it has
        const tableCheck = await pool.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = 'users'
          ORDER BY ordinal_position
        `);

        console.log("Users table columns:", tableCheck.rows);

        // Build query with proper WHERE clause structure
        let query = `
          SELECT
            id, email,
            CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) as name,
            COALESCE(role, 'user') as role,
            COALESCE(department, location, '') as department,
            COALESCE(phone, '') as phone,
            COALESCE(is_active, true) as is_active,
            created_at, updated_at,
            first_name, last_name, username, job_title, location, employee_id, manager_id,
            last_login, is_locked, failed_login_attempts
          FROM users
          WHERE COALESCE(is_active, true) = true
        `;

        const params: any[] = [];
        let paramCount = 0;

        if (filters.search) {
          paramCount++;
          query += ` AND (
            COALESCE(first_name, '') ILIKE $${paramCount} OR
            COALESCE(last_name, '') ILIKE $${paramCount} OR
            email ILIKE $${paramCount} OR
            COALESCE(username, '') ILIKE $${paramCount}
          )`;
          params.push(`%${filters.search}%`);
        }

        if (filters.role && filters.role !== "all") {
          paramCount++;
          query += ` AND COALESCE(role, 'user') = $${paramCount}`;
          params.push(filters.role);
        }

        query += ` ORDER BY email`;

        console.log("Executing query:", query);
        console.log("With params:", params);

        const result = await pool.query(query, params);
        console.log(`Database returned ${result.rows.length} users`);

        const users = result.rows.map((user) => ({
          ...user,
          // Ensure consistent field names
          name:
            user.name ||
            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
            user.username ||
            user.email?.split("@")[0] ||
            "Unknown User",
          department: user.department || user.location || "",
          phone: user.phone || "",
          role: user.role || "user",
        }));

        console.log(
          "Processed users:",
          users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
          })),
        );
        return users;
      } catch (dbError) {
        console.error("Database query failed:", dbError);
        console.log("Falling back to in-memory storage");

        // Fallback to in-memory storage
        const memUsers = Array.from(this.users?.values() || []);
        let users = memUsers.filter((user) => user.is_active !== false);

        if (filters.search) {
          const search = filters.search.toLowerCase();
          users = users.filter(
            (user) =>
              (user.name || "").toLowerCase().includes(search) ||
              (user.email || "").toLowerCase().includes(search),
          );
        }

        if (filters.role && filters.role !== "all") {
          users = users.filter((user) => user.role === filters.role);
        }

        return users.map((user) => {
          const { password_hash, ...userWithoutPassword } = user;
          return {
            ...userWithoutPassword,
            name: user.name || user.email?.split("@")[0] || "Unknown User",
          };
        });
      }
    } catch (error) {
      console.error("Error in getUsers:", error);
      return [];
    }
  }

  async getUserById(id: string): Promise<any | null> {
    try {
      const { pool } = await import("./db");
      const result = await pool.query(
        `
        SELECT
          id, email, name, role, department, phone, is_active,
          created_at, updated_at, first_name, last_name, username
        FROM users
        WHERE id = $1
      `,
        [id],
      );

      if (result.rows.length === 0) return null;

      const user = result.rows[0];
      return {
        ...user,
        name:
          user.name ||
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.username ||
          user.email.split("@")[0],
      };
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return null;
    }
  }

  async createUser(data: any): Promise<any> {
    try {
      const { pool } = await import("./db");

      // Parse name into first and last name
      const nameParts = (data.name || "").trim().split(" ");
      const first_name = nameParts[0] || "";
      const last_name = nameParts.slice(1).join(" ") || "";
      const username = data.email?.split("@")[0] || "";

      const result = await pool.query(
        `
        INSERT INTO users (
          first_name, last_name, username, email, password_hash, role,
          department, phone, employee_id, job_title, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING
          id, email, username, first_name, last_name, role, department,
          phone, employee_id, job_title, is_active, created_at, updated_at
      `,
        [
          first_name,
          last_name,
          username,
          data.email,
          data.password_hash,
          data.role || "end_user",
          data.department || "",
          data.phone || "",
          data.employee_id || "",
          data.job_title || "",
          data.is_active !== undefined ? data.is_active : true,
        ],
      );

      const user = result.rows[0];
      // Add computed name field for consistency
      user.name =
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        user.username ||
        user.email?.split("@")[0];

      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: string, updates: any): Promise<any | null> {
    try {
      const { pool } = await import("./db");

      const setClause = [];
      const params = [];
      let paramCount = 0;

      // Handle name field by converting to first_name and last_name
      const validUpdates = { ...updates };
      if (validUpdates.name) {
        const nameParts = validUpdates.name.trim().split(' ');
        validUpdates.first_name = nameParts[0] || '';
        validUpdates.last_name = nameParts.slice(1).join(' ') || '';
        delete validUpdates.name; // Remove name field as it doesn't exist in DB
      }

      Object.keys(validUpdates).forEach((key) => {
        if (validUpdates[key] !== undefined) {
          paramCount++;
          setClause.push(`${key} = $${paramCount}`);
          params.push(validUpdates[key]);
        }
      });

      if (setClause.length === 0) return null;

      paramCount++;
      setClause.push(`updated_at = $${paramCount}`);
      params.push(new Date());

      paramCount++;
      params.push(id);

      const query = `
        UPDATE users
        SET ${setClause.join(", ")}
        WHERE id = $${paramCount}
        RETURNING
          id, email, username, first_name, last_name, role,
          department, phone, is_active, created_at, updated_at,
          job_title, location, employee_id, manager_id, last_login,
          is_locked, failed_login_attempts
      `;

      const result = await pool.query(query, params);

      if (result.rows.length > 0) {
        const user = result.rows[0];
        // Add computed name field for consistency
        user.name = `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
                   user.username || user.email?.split('@')[0];
        return user;
      }

      return null;
    } catch (error) {
      console.error("Error updating user:", error);
      return null;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const { pool } = await import("./db");
      const result = await pool.query(
        `
        UPDATE users SET is_active = false WHERE id = $1
      `,
        [id],
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  // Knowledge Base methods for database storage
  async getKBArticles(page: number = 1, limit: number = 20, filters: any = {}): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    try {
      const { pool } = await import("./db");
      const offset = (page - 1) * limit;

      let query = `
        SELECT
          id, title, content, author_email, category, tags,
          created_at, updated_at, views, helpful_votes, status
        FROM knowledge_base
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (filters.category && filters.category !== "all") {
        paramCount++;
        query += ` AND category = $${paramCount}`;
        params.push(filters.category);
      }

      if (
        filters.search &&
        typeof filters.search === "string" &&
        filters.search.trim()
      ) {
        paramCount++;
        query += ` AND (title ILIKE $${paramCount} OR content ILIKE $${paramCount})`;
        params.push(`%${filters.search.trim()}%`);
      }

      if (filters.status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
      }

      // Count total
      const countQuery = query.replace(
        /SELECT.*FROM/,
        "SELECT COUNT(*) as total FROM",
      );
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Add ordering and pagination
      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      const articles = result.rows.map((article) => ({
        ...article,
        tags:
          typeof article.tags === "string"
            ? JSON.parse(article.tags || "[]")
            : article.tags || [],
      }));

      console.log(`Returning ${articles.length} KB articles from database`);

      return {
        data: articles,
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error("Error loading KB articles from database:", error);
      return { data: [], total: 0, page, limit };
    }
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db
      .insert(alerts)
      .values({
        ...alert,
        triggered_at: new Date(),
        is_read: false, // Initialize as not read
        read_by: null,
        read_at: null,
      })
      .returning();
    return newAlert;
  }

  async getAlerts(): Promise<Alert[]> {
    try {
      const allAlerts = await db
        .select()
        .from(alerts)
        .orderBy(desc(alerts.triggered_at));
      return allAlerts;
    } catch (error) {
      console.error("Error fetching alerts:", error);
      return [];
    }
  }

  async getDashboardSummary(): Promise<{
    total_devices: number;
    online_devices: number;
    offline_devices: number;
    active_alerts: number;
  }> {
    const devices = await this.getDevices();
    const alerts = await this.getAlerts();

    // Use consistent status calculation
    const now = new Date();
    let onlineCount = 0;
    let offlineCount = 0;

    devices.forEach(device => {
      const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
      const minutesSinceLastSeen = lastSeen ?
        Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60)) : null;

      if (minutesSinceLastSeen !== null && minutesSinceLastSeen < 5) {
        onlineCount++;
      } else {
        offlineCount++;
      }
    });

    return {
      total_devices: devices.length,
      online_devices: onlineCount,
      offline_devices: offlineCount,
      active_alerts: alerts.filter(a => a.is_active).length,
    };
  }

  // Database connection instance
  private db = db;

  // Helper to update device last seen and status (for database storage)
  private async updateDeviceLastSeen(deviceId: string): Promise<void> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Fetch current device status
      const currentDevice = await this.getDevice(deviceId);
      if (!currentDevice) {
        console.warn(`Device ${deviceId} not found for last seen update.`);
        return;
      }

      // Update status based on last seen time
      let newStatus = currentDevice.status;
      if (currentDevice.last_seen && new Date(currentDevice.last_seen) < fiveMinutesAgo) {
        newStatus = "offline";
      } else {
        newStatus = "online"; // Assume online if report is being saved
      }

      await this.updateDevice(deviceId, {
        last_seen: now,
        status: newStatus,
      });

    } catch (error) {
      console.error(`Error updating last seen for device ${deviceId}:`, error);
    }
  }

  // saveDeviceReport method is directly implemented here for DatabaseStorage
  async saveDeviceReport(deviceId: string, data: any): Promise<void> {
    try {
      console.log('Saving device report for:', deviceId);

      // Extract basic metrics with comprehensive error handling and fallbacks
      let cpuUsage = null;
      let memoryUsage = null;
      let diskUsage = null;
      let networkIo = 0;

      // Enhanced CPU extraction with multiple fallbacks
      if (data.system_health?.cpu_usage !== undefined && data.system_health.cpu_usage !== null) {
        cpuUsage = parseFloat(data.system_health.cpu_usage);
        console.log('CPU from system_health:', cpuUsage);
      } else if (data.hardware?.cpu?.usage_percent !== undefined && data.hardware.cpu.usage_percent !== null) {
        cpuUsage = parseFloat(data.hardware.cpu.usage_percent);
        console.log('CPU from hardware.cpu:', cpuUsage);
      } else if (data.hardware?.cpu?.percent !== undefined && data.hardware.cpu.percent !== null) {
        cpuUsage = parseFloat(data.hardware.cpu.percent);
        console.log('CPU from hardware.cpu.percent:', cpuUsage);
      } else if (data.cpu_usage !== undefined && data.cpu_usage !== null) {
        cpuUsage = parseFloat(data.cpu_usage);
        console.log('CPU from direct field:', cpuUsage);
      }

      // Additional check for Windows-style CPU data
      if (cpuUsage === null && data.hardware?.cpu?.cores) {
        const cores = data.hardware.cpu.cores;
        if (Array.isArray(cores) && cores.length > 0) {
          const avgUsage = cores.reduce((sum, core) => sum + (core.usage_percent || 0), 0) / cores.length;
          if (avgUsage > 0) {
            cpuUsage = avgUsage;
            console.log('CPU from core average:', cpuUsage);
          }
        }
      }

      // Enhanced Memory extraction with multiple fallbacks
      if (data.system_health?.memory_usage !== undefined && data.system_health.memory_usage !== null) {
        memoryUsage = parseFloat(data.system_health.memory_usage);
        console.log('Memory from system_health:', memoryUsage);
      } else if (data.hardware?.memory?.percentage !== undefined && data.hardware.memory.percentage !== null) {
        memoryUsage = parseFloat(data.hardware.memory.percentage);
        console.log('Memory from hardware.memory:', memoryUsage);
      } else if (data.hardware?.memory?.percent !== undefined && data.hardware.memory.percent !== null) {
        memoryUsage = parseFloat(data.hardware.memory.percent);
        console.log('Memory from hardware.memory.percent:', memoryUsage);
      } else if (data.memory_usage !== undefined && data.memory_usage !== null) {
        memoryUsage = parseFloat(data.memory_usage);
        console.log('Memory from direct field:', memoryUsage);
      }

      // Calculate from total/used if percentage not available
      if (memoryUsage === null && data.hardware?.memory?.total && data.hardware?.memory?.used) {
        const total = parseFloat(data.hardware.memory.total);
        const used = parseFloat(data.hardware.memory.used);
        if (total > 0) {
          memoryUsage = (used / total) * 100;
          console.log('Memory calculated from used/total:', memoryUsage);
        }
      }

      // Enhanced Disk extraction with multiple fallbacks
      if (data.storage?.disks && Array.isArray(data.storage.disks) && data.storage.disks.length > 0) {
        // Find C:\ drive first (Windows), then / (Linux), then any drive
        const primaryDisk = data.storage.disks.find(disk =>
          disk.device === 'C:\\' || disk.mountpoint === 'C:\\' || 
          disk.device?.includes('C:') || disk.mountpoint?.includes('C:')
        ) || data.storage.disks.find(disk =>
          disk.mountpoint === '/' || disk.device === '/'
        ) || data.storage.disks[0];

        if (primaryDisk) {
          if (primaryDisk.percentage !== undefined && primaryDisk.percentage !== null) {
            diskUsage = parseFloat(primaryDisk.percentage);
            console.log('Disk from storage.disks.percentage:', diskUsage);
          } else if (primaryDisk.percent !== undefined && primaryDisk.percent !== null) {
            diskUsage = parseFloat(primaryDisk.percent);
            console.log('Disk from storage.disks.percent:', diskUsage);
          } else if (primaryDisk.usage_percent !== undefined) {
            diskUsage = parseFloat(primaryDisk.usage_percent);
            console.log('Disk from storage.disks.usage_percent:', diskUsage);
          } else if (primaryDisk.used && primaryDisk.total) {
            const used = parseFloat(primaryDisk.used);
            const total = parseFloat(primaryDisk.total);
            if (total > 0) {
              diskUsage = (used / total) * 100;
              console.log('Disk calculated from used/total:', diskUsage);
            }
          }
        }
      } else if (data.disk_usage !== undefined && data.disk_usage !== null) {
        diskUsage = parseFloat(data.disk_usage);
        console.log('Disk from direct field:', diskUsage);
      }

      // Enhanced Network I/O extraction
      if (data.network?.io_counters) {
        const bytesSent = parseInt(data.network.io_counters.bytes_sent || 0);
        const bytesRecv = parseInt(data.network.io_counters.bytes_recv || 0);
        networkIo = bytesSent + bytesRecv;
        console.log('Network I/O from io_counters:', networkIo);
      } else if (data.network_io !== undefined) {
        networkIo = parseInt(data.network_io || 0);
        console.log('Network I/O from direct field:', networkIo);
      }

      // Validate extracted values
      if (cpuUsage !== null && (isNaN(cpuUsage) || cpuUsage < 0 || cpuUsage > 100)) {
        console.warn('Invalid CPU usage value:', cpuUsage, 'setting to null');
        cpuUsage = null;
      }
      if (memoryUsage !== null && (isNaN(memoryUsage) || memoryUsage < 0 || memoryUsage > 100)) {
        console.warn('Invalid memory usage value:', memoryUsage, 'setting to null');
        memoryUsage = null;
      }
      if (diskUsage !== null && (isNaN(diskUsage) || diskUsage < 0 || diskUsage > 100)) {
        console.warn('Invalid disk usage value:', diskUsage, 'setting to null');
        diskUsage = null;
      }

      console.log('Final extracted metrics:', {
        cpu_usage: cpuUsage,
        memory_usage: memoryUsage,
        disk_usage: diskUsage,
        network_io: networkIo
      });

      const reportData = {
        cpu_usage: cpuUsage,
        memory_usage: memoryUsage,
        disk_usage: diskUsage,
        network_io: networkIo,
        created_at: new Date(),
      };

      // Handle USB devices if present
      if (data.usb_devices || data.usb?.usb_devices) {
        const usbDevices = data.usb_devices || data.usb?.usb_devices || [];
        console.log(`Processing ${usbDevices.length} USB devices for device ${deviceId}`);

        // Store USB devices in the raw_data for later processing
        if (!reportData.raw_data) {
          reportData.raw_data = {};
        }
        reportData.raw_data.usb_devices = usbDevices;
      }

      await this.pool.query(
        `INSERT INTO device_reports (device_id, raw_data, cpu_usage, memory_usage, disk_usage, network_io, collected_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [deviceId, reportData.raw_data, reportData.cpu_usage, reportData.memory_usage,
         reportData.disk_usage, reportData.network_io, reportData.created_at, reportData.created_at]
      );

      // Update device's latest report info
      await this.updateDeviceLastSeen(deviceId);

      console.log(`Device report saved successfully for ${deviceId} with metrics:`, {
        cpu: cpuUsage,
        memory: memoryUsage,
        disk: diskUsage,
        network: networkIo
      });

      // Update performance baselines if we have valid metrics
      if (cpuUsage !== null || memoryUsage !== null || diskUsage !== null) {
        try {
          const { performanceService } = await import('./services/performance-service');
          await performanceService.updateBaselines(deviceId, {
            cpu_usage: cpuUsage,
            memory_usage: memoryUsage,
            disk_usage: diskUsage
          });
        } catch (perfError) {
          console.warn('Failed to update performance baselines:', perfError);
        }
      }

    } catch (error) {
      console.error('Error saving device report:', error);
      throw error;
    }
  }

}

// Create storage instance
const createStorage = async (): Promise<IStorage> => {
  try {
    // Try to use database storage
    const dbStorage = new DatabaseStorage();
    await dbStorage.initializeDemoUsers();
    return dbStorage;
  } catch (error) {
    console.error("Database storage failed, falling back to memory storage:", error);
    return new MemStorage();
  }
};

// Initialize storage
let storageInstance: IStorage | null = null;

export const getStorage = async (): Promise<IStorage> => {
  if (!storageInstance) {
    storageInstance = await createStorage();
  }
  return storageInstance;
};

// For backward compatibility
export const storage: IStorage = new DatabaseStorage();

import os from "os";

export async function registerAgent(
  hostname: string,
  ip_address: string,
  currentUser: string | null,
) {
  try {
    const osInfo = {
      platform: os.platform(),
      version: os.release(),
      name: os.type(),
    };

    // Check if device already exists
    let device = await storage.getDeviceByHostname(hostname);

    if (!device) {
      device = await storage.createDevice({
        hostname: hostname,
        assigned_user: currentUser,
        os_name: osInfo.name || osInfo.platform || osInfo.system || null,
        os_version:
          osInfo.version || osInfo.release || osInfo.version_info || null,
        ip_address: ip_address,
        status: "online",
        last_seen: new Date(),
      });
      console.log(
        "🆕 Created new device:",
        device.id,
        "Hostname:",
        hostname,
        "User:",
        currentUser,
        "IP:",
        ip_address,
      );
    } else {
      // Update existing device including IP address and user
      await storage.updateDevice(device.id, {
        assigned_user: currentUser || device.assigned_user,
        os_name:
          osInfo.name || osInfo.platform || osInfo.system || device.os_name,
        os_version:
          osInfo.version ||
          osInfo.release ||
          osInfo.version_info ||
          device.os_version,
        ip_address: ip_address || device.ip_address,
        status: "online",
        last_seen: new Date(),
      });
      console.log(
        "🔄 Updated existing device:",
        device.id,
        "Hostname:",
        hostname,
        "User:",
        currentUser,
        "IP:",
        ip_address,
        "Previous status:",
        device.status,
      );
    }

    return device;
  } catch (error) {
    console.error("Error registering agent:", error);
  }
}