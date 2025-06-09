import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerTicketRoutes } from "./ticket-routes";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// Removed validation schema import - using flexible data parsing
import { schema } from "@shared/schema";
import { userSchema } from "@shared/user-schema";
import { adminSchema } from "@shared/admin-schema";
import { knowledgeSchema } from "@shared/knowledge-schema";
import { tickets } from "@shared/ticket-schema";
import userStorage from './user-storage';
import knowledgeStorage from './knowledge-storage';
import ticketStorage from './ticket-storage';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Auth middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await storage.getUserById(decoded.userId);

    if (!user || !user.is_active) {
      return res.status(403).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Role check middleware
const requireRole = (roles: string | string[]) => {
  return (req: any, res: any, next: any) => {
    const userRole = req.user?.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (userRole === 'admin' || allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ message: 'Insufficient permissions' });
    }
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize demo users on startup
  try {
    await storage.initializeDemoUsers();
    console.log("Demo users initialized successfully");
  } catch (error) {
    console.log("Demo users may already exist, continuing...", error);
  }

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      console.log(`Login attempt for: ${email}`);

      let user = null;
      let isValidPassword = false;

      // First, try to find user in the database (Drizzle ORM system)
      try {
        const { db } = await import("./db");
        const { users } = await import("../shared/user-schema");
        const { eq } = await import("drizzle-orm");

        const dbUsers = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

        if (dbUsers.length > 0) {
          user = dbUsers[0];
          console.log(`Found user in database: ${user.email}`);

          // Check if user is active
          if (!user.is_active) {
            return res.status(403).json({ message: "Account is suspended" });
          }

          // Verify password
          if (user.password_hash) {
            isValidPassword = await bcrypt.compare(password, user.password_hash);
            console.log(`Database user password check: ${isValidPassword}`);
          }

          if (isValidPassword) {
            // Update last login
            await db.update(users)
              .set({ last_login: new Date() })
              .where(eq(users.id, user.id));
          }
        }
      } catch (dbError) {
        console.log("Database lookup failed, trying file storage:", dbError.message);
      }

      // If not found in database, try file-based storage system
      if (!user || !isValidPassword) {
        const storageUsers = await storage.getUsers({ search: email });
        const storageUser = storageUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (storageUser) {
          user = storageUser;
          console.log(`Found user in file storage: ${user.email}`);

          // Check if user is active
          if (!user.is_active) {
            return res.status(403).json({ message: "Account is suspended" });
          }

          // Demo credentials for testing
          const demoCredentials = {
            "admin@company.com": "admin123",
            "tech@company.com": "tech123", 
            "manager@company.com": "demo123",
            "user@company.com": "demo123"
          };

          // First check if it's a demo account with plain text password
          if (demoCredentials[email.toLowerCase()] === password) {
            console.log(`Demo credentials match for ${email}`);
            isValidPassword = true;

            // Update user with properly hashed password for security
            const hashedPassword = await bcrypt.hash(password, 10);
            await storage.updateUser(user.id, { password_hash: hashedPassword });
            console.log(`Updated demo user ${email} with hashed password`);
          } 
          // Then try bcrypt comparison for properly hashed passwords
          else if (user.password_hash) {
            console.log(`Trying bcrypt comparison for ${email}`);
            isValidPassword = await bcrypt.compare(password, user.password_hash);
            console.log(`File storage password check: ${isValidPassword}`);
          }

          if (isValidPassword) {
            // Update last login
            await storage.updateUser(user.id, { last_login: new Date() });
          }
        }
      }

      if (!user) {
        console.log(`User not found for email: ${email}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!isValidPassword) {
        console.log(`Invalid password for user: ${email}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Return user data without password
      const { password_hash, ...userWithoutPassword } = user as any;

      res.json({
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, email, password, role, department, phone } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email and password required" });
      }

      // Check if user already exists
      const existingUsers = await storage.getUsers({ search: email });
      if (existingUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.createUser({
        name,
        email: email.toLowerCase(),
        password_hash,
        role: role || 'user',
        department: department || '',
        phone: phone || '',
        is_active: true
      });

      // Return user data without password
      const { password_hash: _, ...userWithoutPassword } = newUser as any;

      res.status(201).json({
        message: "Account created successfully",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Signup error:", error);
      if (error.message?.includes("duplicate")) {
        res.status(400).json({ message: "Email already exists" });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get("/api/auth/verify", authenticateToken, async (req: any, res) => {
    try {
      const { password_hash, ...userWithoutPassword } = req.user as any;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    // In a more sophisticated setup, you'd invalidate the token
    res.json({ message: "Logged out successfully" });
  });

  // Dashboard summary endpoint
  app.get("/api/dashboard/summary", authenticateToken, async (req, res) => {
    try {
      const summary = await storage.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all alerts
  app.get("/api/alerts", authenticateToken, async (req, res) => {
    try {
      const alerts = await storage.getActiveAlerts();

      // Enhance alerts with device hostname
      const enhancedAlerts = await Promise.all(
        alerts.map(async (alert) => {
          const device = await storage.getDevice(alert.device_id);
          return {
            ...alert,
            device_hostname: device?.hostname || 'Unknown Device'
          };
        })
      );

      res.json(enhancedAlerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single alert endpoint  
  app.get("/api/alerts/:id", authenticateToken, async (req, res) => {
    try {
      const alertId = req.params.id;
      console.log(`Fetching alert: ${alertId}`);
      
      const alert = await storage.getAlertById(alertId);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error fetching alert:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Resolve alert endpoint
  app.post("/api/alerts/:id/resolve", authenticateToken, async (req, res) => {
    try {
      const alertId = req.params.id;
      console.log(`Attempting to resolve alert: ${alertId}`);
      
      // Check if alert exists first
      const alert = await storage.getAlertById(alertId);
      if (!alert) {
        return res.status(404).json({ 
          message: "Alert not found",
          alertId: alertId 
        });
      }
      
      if (!alert.is_active) {
        return res.status(400).json({ 
          message: "Alert is already resolved",
          alertId: alertId 
        });
      }
      
      await storage.resolveAlert(alertId);
      console.log(`Alert ${alertId} resolved successfully`);
      
      res.json({ 
        message: "Alert resolved successfully",
        alertId: alertId,
        success: true
      });
    } catch (error) {
      console.error("Error resolving alert:", error);
      res.status(500).json({ 
        message: "Internal server error",
        error: error.message 
      });
    }
  });

  // Get all devices
  app.get("/api/devices", authenticateToken, async (req, res) => {
    try {
      const devices = await storage.getDevices();

      // Enhance devices with latest report data and update offline status
      const devicesWithReports = await Promise.all(
        devices.map(async (device) => {
          const latestReport = await storage.getLatestDeviceReport(device.id);

          // Check if device should be marked offline (no activity for 5 minutes)
          const now = new Date();
          const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

          let currentStatus = device.status;
          if (lastSeen && lastSeen < fiveMinutesAgo && device.status === "online") {
            // Mark device as offline but don't delete data
            await storage.updateDevice(device.id, { status: "offline" });
            currentStatus = "offline";
          }

          return {
            ...device,
            status: currentStatus,
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

      // Extract IP address and MAC addresses from various possible locations
      let ip_address = network.ip_address || network.ip || null;
      let mac_addresses = [];

      // Try to extract IP and MAC from network interfaces if not found directly
      if (data.network && typeof data.network === 'object') {
        // Look for IP addresses and MAC addresses in network interface objects
        for (const [key, iface] of Object.entries(data.network)) {
          if (typeof iface === 'object' && iface !== null) {
            if (!ip_address) {
              if ((iface as any).ip_address) {
                ip_address = (iface as any).ip_address;
              } else if ((iface as any).ip) {
                ip_address = (iface as any).ip;
              }
            }

            // Collect MAC addresses
            if ((iface as any).mac_address) {
              mac_addresses.push({
                interface: key,
                mac: (iface as any).mac_address
              });
            } else if ((iface as any).mac) {
              mac_addresses.push({
                interface: key,
                mac: (iface as any).mac
              });
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
        let totalSpace = 0;
        let usedSpace = 0;
        let storageUsages = [];

        if (Array.isArray(data.storage)) {
          // Handle array format - calculate combined usage
          data.storage.forEach(disk => {
            if (disk.usage && disk.usage.total && disk.usage.used) {
              totalSpace += disk.usage.total;
              usedSpace += disk.usage.used;
            } else {
              // Fallback to percentage if detailed usage not available
              const usage = extractNumericValue(disk.usage_percent) || extractNumericValue(disk.percent);
              if (usage !== null) {
                storageUsages.push(usage);
              }
            }
          });
        } else if (typeof data.storage === 'object') {
          // Handle object format like { "C:": { percent: 45.2, ... } }
          if (data.storage.disks && Array.isArray(data.storage.disks)) {
            // Handle nested disks array
            data.storage.disks.forEach(disk => {
              if (disk.usage && disk.usage.total && disk.usage.used) {
                totalSpace += disk.usage.total;
                usedSpace += disk.usage.used;
              } else {
                const usage = extractNumericValue(disk.usage_percent) || extractNumericValue(disk.percent);
                if (usage !== null) {
                  storageUsages.push(usage);
                }
              }
            });
          } else {
            // Handle direct object format
            Object.values(data.storage).forEach((disk: any) => {
              if (disk.usage && disk.usage.total && disk.usage.used) {
                totalSpace += disk.usage.total;
                usedSpace += disk.usage.used;
              } else {
                const usage = extractNumericValue(disk.usage_percent) || extractNumericValue(disk.percent);
                if (usage !== null) {
                  storageUsages.push(usage);
                }
              }
            });
          }
        }

        // Calculate combined usage percentage
        if (totalSpace > 0 && usedSpace > 0) {
          disk_usage = (usedSpace / totalSpace) * 100;
        } else if (storageUsages.length > 0) {
          // Fallback to average of all disk usage percentages
          disk_usage = storageUsages.reduce((sum, usage) => sum + usage, 0) / storageUsages.length;
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

      // USB device detection and tracking - check multiple possible locations
      let usbDevices = [];
      
      // Check various possible locations for USB device data
      const possibleUSBLocations = [
        data.usb_devices,
        data.hardware?.usb_devices,
        data.system_info?.usb_devices,
        data.devices?.usb,
        data.usb
      ];
      
      for (const location of possibleUSBLocations) {
        if (location && Array.isArray(location) && location.length > 0) {
          usbDevices = location;
          console.log(`Found USB devices in location:`, location);
          break;
        }
      }
      
      console.log("Final USB devices for storage:", usbDevices);

      // Create device report with enhanced data
      await storage.createDeviceReport({
        device_id: device.id,
        cpu_usage: cpu_usage?.toString() || null,
        memory_usage: memory_usage?.toString() || null,
        disk_usage: disk_usage?.toString() || null,
        network_io: network_io?.toString() || null,
        raw_data: JSON.stringify({
          ...req.body,
          extracted_mac_addresses: mac_addresses,
          extracted_usb_devices: usbDevices,
          processed_at: new Date().toISOString()
        })
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
        await checkAndManageAlert("cpu", cpu_usage, { critical: 95, high: 85, warning: 75 }, "performance");
      }

      if (memory_usage !== null && memory_usage !== undefined) {
        await checkAndManageAlert("memory", memory_usage, { critical: 95, high: 85, warning: 75 }, "performance");
      }

      if (disk_usage !== null && disk_usage !== undefined) {
        await checkAndManageAlert("disk", disk_usage, { critical: 95, high: 85, warning: 75 }, "storage");
      }

      // Update USB device tracking
      await storage.updateUSBDevices(device.id, usbDevices);

      // Check for existing USB alert
      const existingUsbAlert = await storage.getActiveAlertByDeviceAndMetric(device.id, "usb");

      if (usbDevices && Array.isArray(usbDevices) && usbDevices.length > 0) {
        const message = `USB device(s) detected - ${usbDevices.length} device(s) connected`;

        if (existingUsbAlert) {
          // Update existing USB alert
          await storage.updateAlert(existingUsbAlert.id, {
            severity: "info",
            message: message,
            metadata: { 
              usb_count: usbDevices.length, 
              devices: usbDevices.slice(0, 3), // First 3 devices for reference
              metric: "usb",
              last_updated: new Date().toISOString()
            }
          });
        } else {
          // Create new USB alert
          await storage.createAlert({
            device_id: device.id,
            category: "security",
            severity: "info",
            message: message,
            metadata: { 
              usb_count: usbDevices.length, 
              devices: usbDevices.slice(0, 3), // First 3 devices for reference
              metric: "usb"
            },
            is_active: true
          });
        }
      } else {
        // No USB devices detected, resolve existing alert if any
        if (existingUsbAlert) {
          await storage.resolveAlert(existingUsbAlert.id);
        }
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

// Notifications endpoint
  app.get('/api/notifications', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.id;

        // Get tickets from database for notifications
        const { db } = await import("./db");
        const { desc } = await import("drizzle-orm");
        const ticketsList = await db
          .select()
          .from(tickets)
          .orderBy(desc(tickets.updated_at));

        const userTickets = ticketsList.filter(ticket => 
          ticket.assigned_to === userId || ticket.requester_email === decoded.email
        );

        // Create notifications for recent ticket updates
        const notifications = userTickets
          .filter(ticket => {
            const updatedAt = new Date(ticket.updated_at);
            const now = new Date();
            const diffHours = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
            return diffHours <= 24; // Only show notifications for tickets updated in last 24 hours
          })
          .map(ticket => ({
            id: ticket.id,
            type: 'ticket_update',
            title: `Ticket ${ticket.ticket_number} updated`,
            message: `${ticket.title} - Status: ${ticket.status}`,
            timestamp: ticket.updated_at,
            read: false
          }));

        res.json(notifications);
      } catch (jwtError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    } catch (error) {
      console.error('Error fetching tickets for notifications:', error);
      res.json([]); // Return empty array on error to prevent client issues
    }
  });

  app.post("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      const notificationId = req.params.id;

      // In a real implementation, you'd store read status in database
      // For now, we'll just return success
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notifications/mark-all-read", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // In a real implementation, you'd update all notifications for the user in database
      // For now, we'll just return success with a more detailed response
      console.log(`Marking all notifications as read for user: ${userId}`);

      res.json({ 
        message: "All notifications marked as read",
        success: true,
        markedCount: 0 // Would be actual count in real implementation
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/notifications/:id", authenticateToken, async (req, res) => {
    try {
      const notificationId = req.params.id;

      // In a real implementation, you'd delete the notification from database
      // For now, we'll just return success
      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Register ticket routes
  registerTicketRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}