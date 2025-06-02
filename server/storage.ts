import { devices, device_reports, alerts, type Device, type InsertDevice, type DeviceReport, type InsertDeviceReport, type Alert, type InsertAlert } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, or, like, count } from "drizzle-orm";

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
        updated_at: new Date()
      },
      {
        id: this.generateId(),
        email: "tech@company.com",
        name: "John Technician",
        password_hash: "$2b$10$dummy.hash.for.demo", // Demo: tech123
        role: "technician",
        department: "IT",
        phone: "+1 (555) 123-4568",
        is_active: true,
        last_login: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        created_at: new Date(),
        updated_at: new Date()
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
        updated_at: new Date()
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
        updated_at: new Date()
      }
    ];

    this.users = new Map();
    sampleUsers.forEach(user => {
      this.users.set(user.id, user);
    });
  }

  // User management methods for in-memory storage
  async getUsers(filters: { search?: string; role?: string } = {}): Promise<any[]> {
    let users = Array.from(this.users.values());

    if (filters.search) {
      const search = filters.search.toLowerCase();
      users = users.filter(user => 
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    }

    if (filters.role && filters.role !== "all") {
      users = users.filter(user => user.role === filters.role);
    }

    return users.map(user => {
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
      updated_at: new Date()
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
      updated_at: new Date()
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

  async getActiveAlertByDeviceAndMetric(deviceId: string, metric: string): Promise<Alert | null> {
    const alert = Array.from(this.alerts.values()).find(alert => 
      alert.device_id === deviceId && 
      alert.is_active && 
      alert.metadata && 
      (alert.metadata as any).metric === metric
    );
    return alert || null;
  }

  async updateAlert(alertId: string, updates: Partial<Alert>): Promise<void> {
    const existing = this.alerts.get(alertId);
    if (existing) {
      const updated: Alert = {
        ...existing,
        ...updates,
        triggered_at: new Date()
      };
      this.alerts.set(alertId, updated);
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const existing = this.alerts.get(alertId);
    if (existing) {
      const updated: Alert = {
        ...existing,
        is_active: false,
        resolved_at: new Date()
      };
      this.alerts.set(alertId, updated);
    }
  }

  async getActiveAlertByDeviceAndMetric(deviceId: string, metric: string): Promise<Alert | null> {
    const alert = Array.from(this.alerts.values()).find(alert => 
      alert.device_id === deviceId && 
      alert.is_active && 
      alert.metadata && 
      (alert.metadata as any).metric === metric
    );
    return alert || null;
  }

  async updateAlert(alertId: string, updates: Partial<Alert>): Promise<void> {
    const existing = this.alerts.get(alertId);
    if (existing) {
      const updated: Alert = {
        ...existing,
        ...updates,
        triggered_at: new Date()
      };
      this.alerts.set(alertId, updated);
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const existing = this.alerts.get(alertId);
    if (existing) {
      const updated: Alert = {
        ...existing,
        is_active: false,
        resolved_at: new Date()
      };
      this.alerts.set(alertId, updated);
    }
  }

  async getDashboardSummary(): Promise<{
    total_devices: number;
    online_devices: number;
    offline_devices: number;
    active_alerts: number;
  }> {
    const allDevices = Array.from(this.devices.values());
    const activeAlerts = Array.from(this.alerts.values()).filter(alert => alert.is_active);

    // Update offline status for devices that haven't been seen for 5+ minutes
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    allDevices.forEach(device => {
      const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
      if (lastSeen && lastSeen < fiveMinutesAgo && device.status === "online") {
        device.status = "offline";
        this.devices.set(device.id, device);
      }
    });

    return {
      total_devices: allDevices.length,
      online_devices: allDevices.filter(device => device.status === "online").length,
      offline_devices: allDevices.filter(device => device.status === "offline").length,
      active_alerts: activeAlerts.length
    };
  }
}

export class DatabaseStorage implements IStorage {
  // Initialize demo users if they don't exist
  async initializeDemoUsers() {
    try {
      const { users } = await import("@shared/user-schema");
      const bcrypt = await import("bcrypt");

      // Check if demo users already exist
      const existingUsers = await db.select().from(users);
      if (existingUsers.length > 0) {
        console.log("Demo users already exist, skipping initialization");
      } else {
        const demoUsers = [
          {
            email: "admin@company.com",
            name: "System Administrator",
            password_hash: await bcrypt.hash("admin123", 10),
            role: "admin",
            department: "IT",
            phone: "+1-555-0101",
            is_active: true
          },
          {
            email: "manager@company.com", 
            name: "IT Manager",
            password_hash: await bcrypt.hash("demo123", 10),
            role: "manager",
            department: "IT",
            phone: "+1-555-0102",
            is_active: true
          },
          {
            email: "tech@company.com",
            name: "Senior Technician",
            password_hash: await bcrypt.hash("tech123", 10),
            role: "technician",
            department: "IT Support",
            phone: "+1-555-0103",
            is_active: true
          },
          {
            email: "user@company.com",
            name: "End User",
            password_hash: await bcrypt.hash("demo123", 10),
            role: "user",
            department: "Sales",
            phone: "+1-555-0104",
            is_active: true
          }
        ];

        await db.insert(users).values(demoUsers);
        console.log("Demo users created successfully");
      }

      // Initialize sample knowledge base articles
      await this.initializeSampleKBArticles();
    } catch (error) {
      console.error("Error creating demo users:", error);
    }
  }

  async initializeSampleKBArticles() {
    try {
      const { knowledgeBase } = await import("@shared/ticket-schema");

      // Check if articles already exist
      const existingArticles = await db.select().from(knowledgeBase);
      if (existingArticles.length > 0) {
        console.log("Knowledge base articles already exist, skipping initialization");
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
          category: "General",
          tags: ["password", "login", "security"],
          author_email: "admin@company.com",
          status: "published",
          views: 45,
          helpful_votes: 12
        },
        {
          title: "VPN Setup Instructions",
          content: `# VPN Configuration Guide

## Windows Setup
1. Download the VPN client from the IT portal
2. Install the application
3. Use your domain credentials to connect
4. Select the appropriate server location

## macOS Setup
1. Open System Preferences > Network
2. Click the + button to add a new connection
3. Choose VPN from the Interface dropdown
4. Enter the server details provided by IT

## Troubleshooting
- Check your internet connection
- Verify your credentials
- Try different server locations
- Contact IT if connection fails`,
          category: "Technical",
          tags: ["vpn", "network", "remote-access"],
          author_email: "tech@company.com",
          status: "published",
          views: 78,
          helpful_votes: 25
        },
        {
          title: "Software Installation Policy",
          content: `# Software Installation Guidelines

## Approved Software
All software installations must be approved by IT before installation.

## Request Process
1. Submit a software request ticket
2. Include business justification
3. Wait for IT approval
4. Schedule installation with IT team

## Prohibited Software
- File sharing applications
- Unauthorized communication tools
- Games and entertainment software
- Software from untrusted sources

## Security Considerations
All software is scanned for security vulnerabilities before approval.`,
          category: "Policy",
          tags: ["software", "policy", "security"],
          author_email: "manager@company.com",
          status: "published",
          views: 32,
          helpful_votes: 8
        },
        {
          title: "Email Configuration for Mobile Devices",
          content: `# Mobile Email Setup

## iPhone/iPad Setup
1. Go to Settings > Mail > Accounts
2. Tap "Add Account"
3. Select "Microsoft Exchange"
4. Enter your email and password
5. Configure server settings as provided

## Android Setup
1. Open the Email app
2. Tap "Add Account"
3. Choose "Microsoft Exchange"
4. Enter your credentials
5. Allow the security policy

## Server Settings
- Server: mail.company.com
- Domain: company.com
- Use SSL: Yes
- Port: 443`,
          category: "Technical",
          tags: ["email", "mobile", "configuration"],
          author_email: "tech@company.com",
          status: "published",
          views: 56,
          helpful_votes: 18
        },
        {
          title: "Hardware Request Process",
          content: `# Hardware Request Guidelines

## Eligible Equipment
- Laptops and desktops
- Monitors and peripherals
- Mobile devices
- Specialized software tools

## Request Process
1. Submit hardware request ticket
2. Include business justification
3. Get manager approval
4. Wait for procurement processing
5. Schedule delivery and setup

## Timeline
- Standard requests: 5-7 business days
- Specialized equipment: 2-3 weeks
- Emergency requests: 24-48 hours

Contact your manager for approval before submitting requests.`,
          category: "Hardware",
          tags: ["hardware", "request", "procurement"],
          author_email: "manager@company.com",
          status: "published",
          views: 23,
          helpful_votes: 5
        }
      ];

      await db.insert(knowledgeBase).values(sampleArticles);
      console.log("Sample knowledge base articles created successfully");
    } catch (error) {
      console.error("Error creating sample KB articles:", error);
    }
  }
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

  // Knowledge Base methods
  async getKBArticles(page: number = 1, limit: number = 20, filters: any = {}) {
    const { knowledgeBase } = await import("@shared/ticket-schema");
    const { and, or, like, count, desc } = await import("drizzle-orm");

    const conditions = [];

    if (filters.category) {
      conditions.push(eq(knowledgeBase.category, filters.category));
    }

    if (filters.status) {
      conditions.push(eq(knowledgeBase.status, filters.status));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(knowledgeBase.title, `%${filters.search}%`),
          like(knowledgeBase.content, `%${filters.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(knowledgeBase)
      .where(whereClause);

    const data = await db
      .select()
      .from(knowledgeBase)
      .where(whereClause)
      .orderBy(desc(knowledgeBase.created_at))
      .limit(limit)
      .offset(offset);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getKBArticleById(id: string) {
    const { knowledgeBase } = await import("@shared/ticket-schema");

    const [article] = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.id, id));

    return article || null;
  }

  async createKBArticle(data: any) {
    const { knowledgeBase } = await import("@shared/ticket-schema");

    const [article] = await db
      .insert(knowledgeBase)
      .values(data)
      .returning();

    return article;
  }

  async updateKBArticle(id: string, updates: any) {
    const { knowledgeBase } = await import("@shared/ticket-schema");

    const [updatedArticle] = await db
      .update(knowledgeBase)
      .set({
        ...updates,
        updated_at: new Date()
      })
      .where(eq(knowledgeBase.id, id))
      .returning();

    return updatedArticle || null;
  }

  async deleteKBArticle(id: string) {
    const { knowledgeBase } = await import("@shared/ticket-schema");

    const result = await db
      .delete(knowledgeBase)
      .where(eq(knowledgeBase.id, id));

    return result.rowCount > 0;
  }

  // User Management methods
  async getUsers(filters: { search?: string; role?: string } = {}) {
    const { users } = await import("@shared/user-schema");
    const { and, or, like } = await import("drizzle-orm");

    const conditions = [];

    if (filters.search) {
      conditions.push(
        or(
          like(users.name, `%${filters.search}%`),
          like(users.email, `%${filters.search}%`)
        )
      );
    }

    if (filters.role && filters.role !== "all") {
      conditions.push(eq(users.role, filters.role));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        department: users.department,
        phone: users.phone,
        is_active: users.is_active,
        last_login: users.last_login,
        created_at: users.created_at
      })
      .from(users)
      .where(whereClause)
      .orderBy(users.created_at);

    return result;
  }

  async getUserById(id: string) {
    const { users } = await import("@shared/user-schema");

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        department: users.department,
        phone: users.phone,
        is_active: users.is_active,
        last_login: users.last_login,
        created_at: users.created_at
      })
      .from(users)
      .where(eq(users.id, id));

    return user || null;
  }

  async createUser(data: any) {
    const { users } = await import("@shared/user-schema");
    const bcrypt = await import("bcrypt");

    // Hash password
    const password_hash = await bcrypt.hash(data.password, 10);

    const [user] = await db
      .insert(users)
      .values({
        ...data,
        password_hash,
        password: undefined // Remove plain password
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        department: users.department,
        phone: users.phone,
        is_active: users.is_active,
        created_at: users.created_at
      });

    return user;
  }

  async updateUser(id: string, updates: any) {
    const { users } = await import("@shared/user-schema");

    // Remove password from updates if not provided
    const updateData = { ...updates };
    if (updateData.password) {
      const bcrypt = await import("bcrypt");
      updateData.password_hash = await bcrypt.hash(updateData.password, 10);delete updateData.password;
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        ...updateData,
        updated_at: new Date()
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        department: users.department,
        phone: users.phone,
        is_active: users.is_active,
        created_at: users.created_at
      });

    return updatedUser || null;
  }

  async deleteUser(id: string) {
    const { users } = await import("@shared/user-schema");

    const result = await db
      .delete(users)
      .where(eq(users.id, id));

    return result.rowCount > 0;
  }
  // Dashboard summary
  async getDashboardSummary() {
    const { devices, alerts } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const allDevices = await db.select().from(devices);
    const activeAlerts = await db.select().from(alerts).where(eq(alerts.is_active, true));

    // Update offline status for devices that haven't been seen for 5+ minutes
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    for (const device of allDevices) {
      const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
      if (lastSeen && lastSeen < fiveMinutesAgo && device.status === "online") {
        await db
          .update(devices)
          .set({ status: "offline" })
          .where(eq(devices.id, device.id));
        device.status = "offline";
      }
    }

    const onlineDevices = allDevices.filter(device => device.status === "online").length;
    const offlineDevices = allDevices.filter(device => device.status === "offline").length;

    return {
      total_devices: allDevices.length,
      online_devices: onlineDevices,
      offline_devices: offlineDevices,
      active_alerts: activeAlerts.length
    };
  }
}

export const storage = new DatabaseStorage();