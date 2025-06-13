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
import userStorage from "./user-storage";
import knowledgeStorage from "./knowledge-storage";
import ticketStorage from "./ticket-storage";
import { securityService } from "./security-service";
import { performanceService } from "./performance-service";
import { automationService } from "./automation-service";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Auth middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    console.log("Decoded token:", decoded);

    // Try to get user from database first
    try {
      const { pool } = await import("./db");
      const result = await pool.query(
        `
        SELECT id, email, role, first_name, last_name, username, is_active, phone, location 
        FROM users WHERE id = $1
      `,
        [decoded.userId || decoded.id],
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];

        // Build name from available fields
        let displayName = "";
        if (user.first_name || user.last_name) {
          displayName =
            `${user.first_name || ""} ${user.last_name || ""}`.trim();
        } else if (user.username) {
          displayName = user.username;
        } else {
          displayName = user.email.split("@")[0];
        }

        user.name = displayName;

        if (!user.is_active) {
          return res.status(403).json({ message: "User account is inactive" });
        }

        req.user = user;
        return next();
      }
    } catch (dbError) {
      console.log(
        "Database lookup failed, trying file storage:",
        dbError.message,
      );
    }

    // Fallback to file storage
    const user = await storage.getUserById(decoded.userId || decoded.id);
    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }

    if (user.is_active === false) {
      return res.status(403).json({ message: "User account is inactive" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(403).json({ message: "Invalid token" });
  }
};

// Role check middleware
const requireRole = (roles: string | string[]) => {
  return (req: any, res: any, next: any) => {
    const userRole = req.user?.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (userRole === "admin" || allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ message: "Insufficient permissions" });
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

  // Initialize enhanced storage tables
  try {
    const { enhancedStorage } = await import("./enhanced-storage");
    await enhancedStorage.initializeEnhancedTables();
    console.log("Enhanced storage tables initialized successfully");
  } catch (error) {
    console.log("Enhanced storage initialization error:", error);
  }

  // Authentication routes
  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("Login attempt for:", email);

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      try {
        // Try database query using raw SQL - use only columns that definitely exist
        const { pool } = await import("./db");

        // First check what columns exist in the users table
        const columnsResult = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND table_schema = 'public'
        `);

        const availableColumns = columnsResult.rows.map(
          (row) => row.column_name,
        );
        console.log("Available columns in users table:", availableColumns);

        // Build query with only available columns
        let selectColumns = ["id", "email", "role"];
        let optionalColumns = [
          "password_hash",
          "is_active",
          "is_locked",
          "last_login",
          "phone",
          "location",
          "first_name",
          "last_name",
          "username",
          "name",
        ];

        optionalColumns.forEach((col) => {
          if (availableColumns.includes(col)) {
            selectColumns.push(col);
          }
        });

        const query = `SELECT ${selectColumns.join(", ")} FROM users WHERE email = $1`;
        console.log("Executing query:", query);

        const result = await pool.query(query, [email.toLowerCase()]);

        if (result.rows.length === 0) {
          console.log("User not found in database:", email);
          // Try file storage fallback
          throw new Error("User not found in database, trying file storage");
        }

        const user = result.rows[0];
        console.log("Found user:", user.email, "Role:", user.role);

        // Check if user is locked (if column exists)
        if (user.is_locked) {
          return res
            .status(401)
            .json({ message: "Account is locked. Contact administrator." });
        }

        // Check if user is active (if column exists)
        if (user.is_active === false) {
          return res
            .status(401)
            .json({ message: "Account is inactive. Contact administrator." });
        }

        // Verify password if password_hash exists
        if (user.password_hash) {
          const isValidPassword = await bcrypt.compare(
            password,
            user.password_hash,
          );
          if (!isValidPassword) {
            console.log("Invalid password for user:", email);
            return res.status(401).json({ message: "Invalid credentials" });
          }
        } else {
          // No password hash stored, check against default passwords
          const validPasswords = [
            "Admin123!",
            "Tech123!",
            "Manager123!",
            "User123!",
          ];
          if (!validPasswords.includes(password)) {
            return res.status(401).json({ message: "Invalid credentials" });
          }
        }

        // Update last login if column exists
        if (availableColumns.includes("last_login")) {
          await pool.query(
            `UPDATE users SET last_login = NOW() WHERE id = $1`,
            [user.id],
          );
        }

        // Generate JWT token
        const token = jwt.sign(
          { userId: user.id, id: user.id, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: "24h" },
        );

        // Return user data without password
        const { password_hash, ...userWithoutPassword } = user;

        // Build name from available fields
        let displayName = "";
        if (user.name) {
          displayName = user.name;
        } else if (user.first_name || user.last_name) {
          displayName =
            `${user.first_name || ""} ${user.last_name || ""}`.trim();
        } else if (user.username) {
          displayName = user.username;
        } else {
          displayName = user.email.split("@")[0];
        }

        userWithoutPassword.name = displayName;

        console.log("Login successful for:", email);
        res.json({
          message: "Login successful",
          token,
          user: userWithoutPassword,
        });
      } catch (dbError) {
        console.log(
          "Database lookup failed, trying file storage:",
          dbError.message,
        );

        // Fallback to file storage for demo users
        try {
          const demoUsers = await storage.getUsers({ search: email });
          const user = demoUsers.find(
            (u) => u.email.toLowerCase() === email.toLowerCase(),
          );

          if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
          }

          // For demo users, check simple password
          const validPasswords = [
            "Admin123!",
            "Tech123!",
            "Manager123!",
            "User123!",
          ];
          if (!validPasswords.includes(password)) {
            return res.status(401).json({ message: "Invalid credentials" });
          }

          // Generate JWT token
          const token = jwt.sign(
            { userId: user.id, id: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "24h" },
          );

          console.log("File storage login successful for:", email);
          res.json({
            message: "Login successful",
            token,
            user: user,
          });
        } catch (fileError) {
          console.error("File storage also failed:", fileError);
          return res.status(401).json({ message: "Invalid credentials" });
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, email, password, role, department, phone } = req.body;

      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ message: "Name, email and password required" });
      }

      // Check if user already exists
      const existingUsers = await storage.getUsers({ search: email });
      if (
        existingUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())
      ) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.createUser({
        name,
        email: email.toLowerCase(),
        password_hash,
        role: role || "user",
        department: department || "",
        phone: phone || "",
        is_active: true,
      });

      // Return user data without password
      const { password_hash: _, ...userWithoutPassword } = newUser as any;

      res.status(201).json({
        message: "Account created successfully",
        user: userWithoutPassword,
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
            device_hostname: device?.hostname || "Unknown Device",
          };
        }),
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
          alertId: alertId,
        });
      }

      if (!alert.is_active) {
        return res.status(400).json({
          message: "Alert is already resolved",
          alertId: alertId,
        });
      }

      await storage.resolveAlert(alertId);
      console.log(`Alert ${alertId} resolved successfully`);

      res.json({
        message: "Alert resolved successfully",
        alertId: alertId,
        success: true,
      });
    } catch (error) {
      console.error("Error resolving alert:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
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
          if (
            lastSeen &&
            lastSeen < fiveMinutesAgo &&
            device.status === "online"
          ) {
            // Mark device as offline but don't delete data
            await storage.updateDevice(device.id, { status: "offline" });
            currentStatus = "offline";
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
      const hostname =
        data.hostname ||
        data.system_info?.hostname ||
        data.os_info?.hostname ||
        data.hardware?.hostname ||
        data.network?.hostname;

      if (!hostname) {
        console.log("No hostname found in data:", Object.keys(data));
        return res.status(400).json({ message: "Hostname is required" });
      }

      console.log("Found hostname:", hostname);

      // Check if device exists, create if not
      let device = await storage.getDeviceByHostname(hostname);

      // Extract data from various possible locations - be very flexible
      const osInfo =
        data.os_info || data.system_info || data.hardware?.os || {};
      const systemHealth =
        data.system_health || data.health || data.metrics || {};
      const hardware = data.hardware || data.system_info || {};
      const network = data.network || data.network_info || {};

      // Extract user information - try to find real user, not system accounts
      let currentUser = null;

      // First try to extract from processes (most reliable)
      if (data.processes && Array.isArray(data.processes)) {
        const userProcesses = data.processes.filter((process) => {
          const processUser = process.username || process.user;
          return (
            processUser &&
            typeof processUser === "string" &&
            !processUser.includes("NT AUTHORITY") &&
            !processUser.includes("SYSTEM") &&
            !processUser.includes("LOCAL SERVICE") &&
            !processUser.includes("NETWORK SERVICE") &&
            !processUser.includes("Window Manager") &&
            !processUser.endsWith("$") &&
            processUser !== "Unknown" &&
            processUser !== "N/A"
          );
        });

        if (userProcesses.length > 0) {
          const processUser =
            userProcesses[0].username || userProcesses[0].user;
          if (processUser.includes("\\")) {
            currentUser = processUser.split("\\").pop();
          } else {
            currentUser = processUser;
          }
        }
      }

      // If no user found from processes, try other sources
      if (!currentUser) {
        const possibleUserSources = [
          data.current_user,
          data.user,
          data.username,
          data.assigned_user,
          osInfo.current_user,
          osInfo.user,
          osInfo.username,
          systemHealth.current_user,
          hardware.current_user,
          data.system_info?.current_user,
          data.system_info?.user,
          data.system_info?.username,
        ];

        // Find first valid user that's not a system account
        for (const user of possibleUserSources) {
          if (
            user &&
            typeof user === "string" &&
            !user.endsWith("$") &&
            user !== "Unknown" &&
            user !== "N/A" &&
            !user.includes("SYSTEM") &&
            !user.includes("NETWORK SERVICE") &&
            !user.includes("LOCAL SERVICE")
          ) {
            if (user.includes("\\")) {
              currentUser = user.split("\\").pop();
            } else if (user.includes("@")) {
              currentUser = user.split("@")[0];
            } else {
              currentUser = user;
            }
            break;
          }
        }
      }

      console.log(
        "Extracted current user:",
        currentUser,
        "from hostname:",
        hostname,
        "processes count:",
        data.processes?.length || 0,
      );

      // Extract IP address and MAC addresses from various possible locations
      let ip_address =
        network.ip_address || network.ip || data.network?.primary_ip || null;
      let mac_addresses = [];

      // Check for primary MAC from new system collector
      let primary_mac = data.network?.primary_mac || null;

      // Try to extract IP from network interfaces (most reliable method)
      if (data.network?.interfaces && Array.isArray(data.network.interfaces)) {
        for (const iface of data.network.interfaces) {
          const name = iface.name?.toLowerCase() || "";

          // Prioritize Ethernet interfaces
          if (
            (name.includes("eth") ||
              name.includes("ethernet") ||
              name.includes("enet")) &&
            !name.includes("veth") &&
            !name.includes("virtual") &&
            iface.stats?.is_up !== false
          ) {
            for (const addr of iface.addresses || []) {
              if (
                addr.family === "AF_INET" &&
                !addr.address.startsWith("127.") &&
                !addr.address.startsWith("169.254.") &&
                addr.address !== "0.0.0.0"
              ) {
                ip_address = addr.address;
                break;
              }
            }
            if (ip_address) break;
          }
        }

        // If no Ethernet IP found, try WiFi
        if (!ip_address) {
          for (const iface of data.network.interfaces) {
            const name = iface.name?.toLowerCase() || "";
            if (
              (name.includes("wifi") ||
                name.includes("wlan") ||
                name.includes("wireless")) &&
              iface.stats?.is_up !== false
            ) {
              for (const addr of iface.addresses || []) {
                if (
                  addr.family === "AF_INET" &&
                  !addr.address.startsWith("127.") &&
                  !addr.address.startsWith("169.254.") &&
                  addr.address !== "0.0.0.0"
                ) {
                  ip_address = addr.address;
                  break;
                }
              }
              if (ip_address) break;
            }
          }
        }

        // If still no IP, get any active non-virtual interface
        if (!ip_address) {
          for (const iface of data.network.interfaces) {
            const name = iface.name?.toLowerCase() || "";
            const isVirtual =
              name.includes("virtual") ||
              name.includes("veth") ||
              name.includes("docker") ||
              name.includes("vmware");

            if (!isVirtual && iface.stats?.is_up !== false) {
              for (const addr of iface.addresses || []) {
                if (
                  addr.family === "AF_INET" &&
                  !addr.address.startsWith("127.") &&
                  !addr.address.startsWith("169.254.") &&
                  addr.address !== "0.0.0.0"
                ) {
                  ip_address = addr.address;
                  break;
                }
              }
              if (ip_address) break;
            }
          }
        }

        // Collect MAC addresses - new enhanced method
        for (const iface of data.network.interfaces) {
          // Check for MAC address in interface object directly
          if (iface.mac_address && iface.mac_address !== "00:00:00:00:00:00") {
            mac_addresses.push({
              interface: iface.name,
              mac: iface.mac_address,
            });
          }

          // Also check in addresses array for compatibility
          for (const addr of iface.addresses || []) {
            if (
              addr.family?.includes("AF_LINK") ||
              addr.family?.includes("AF_PACKET")
            ) {
              if (addr.address && addr.address !== "00:00:00:00:00:00") {
                mac_addresses.push({
                  interface: iface.name,
                  mac: addr.address,
                });
              }
            }
          }
        }
      }

      // Try older format network data structure
      if (!ip_address && data.network && typeof data.network === "object") {
        for (const [key, iface] of Object.entries(data.network)) {
          if (typeof iface === "object" && iface !== null) {
            if ((iface as any).ip_address) {
              ip_address = (iface as any).ip_address;
              break;
            } else if ((iface as any).ip) {
              ip_address = (iface as any).ip;
              break;
            }
          }
        }
      }

      // Fallback to other sources
      if (!ip_address) {
        ip_address =
          data.ip_address || hardware.ip_address || osInfo.ip_address || null;
      }

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
          "Created new device:",
          device.id,
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
          "Updated existing device:",
          device.id,
          "User:",
          currentUser,
          "IP:",
          ip_address,
        );
      }

      // Extract metrics from various possible locations - handle nested objects
      let cpu_usage = null;
      let memory_usage = null;
      let disk_usage = null;
      let network_io = null;

      // Try multiple possible field names and structures, extract numeric values
      const extractNumericValue = (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === "number") return value;
        if (typeof value === "string") {
          const parsed = parseFloat(value);
          return isNaN(parsed) ? null : parsed;
        }
        if (typeof value === "object") {
          // Handle nested objects like { usage_percent: 8.7 }
          return (
            value.usage_percent || value.percent || value.percentage || null
          );
        }
        return null;
      };

      // CPU usage extraction
      cpu_usage =
        extractNumericValue(systemHealth.cpu_percent) ||
        extractNumericValue(systemHealth.cpu_usage) ||
        extractNumericValue(hardware.cpu_percent) ||
        extractNumericValue(hardware.cpu) ||
        extractNumericValue(data.cpu_percent) ||
        extractNumericValue(data.cpu_usage) ||
        extractNumericValue(data.cpu_info?.usage_percent) ||
        extractNumericValue(data.metrics?.cpu_usage) ||
        null;

      // Memory usage extraction
      memory_usage =
        extractNumericValue(systemHealth.memory_percent) ||
        extractNumericValue(systemHealth.memory_usage) ||
        extractNumericValue(hardware.memory_percent) ||
        extractNumericValue(hardware.memory) ||
        extractNumericValue(data.memory_percent) ||
        extractNumericValue(data.memory_usage) ||
        extractNumericValue(data.memory_info?.percentage) ||
        extractNumericValue(data.metrics?.memory_usage) ||
        null;

      // Disk usage extraction - check storage array for disk usage
      disk_usage =
        extractNumericValue(systemHealth.disk_percent) ||
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
          data.storage.forEach((disk) => {
            if (disk.usage && disk.usage.total && disk.usage.used) {
              totalSpace += disk.usage.total;
              usedSpace += disk.usage.used;
            } else {
              // Fallback to percentage if detailed usage not available
              const usage =
                extractNumericValue(disk.usage_percent) ||
                extractNumericValue(disk.percent);
              if (usage !== null) {
                storageUsages.push(usage);
              }
            }
          });
        } else if (typeof data.storage === "object") {
          // Handle object format like { "C:": { percent: 45.2, ... } }
          if (data.storage.disks && Array.isArray(data.storage.disks)) {
            // Handle nested disks array
            data.storage.disks.forEach((disk) => {
              if (disk.usage && disk.usage.total && disk.usage.used) {
                totalSpace += disk.usage.total;
                usedSpace += disk.usage.used;
              } else {
                const usage =
                  extractNumericValue(disk.usage_percent) ||
                  extractNumericValue(disk.percent);
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
                const usage =
                  extractNumericValue(disk.usage_percent) ||
                  extractNumericValue(disk.percent);
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
          disk_usage =
            storageUsages.reduce((sum, usage) => sum + usage, 0) /
            storageUsages.length;
        }
      }

      // Network I/O extraction
      network_io =
        extractNumericValue(systemHealth.network_bytes) ||
        extractNumericValue(systemHealth.network_io) ||
        extractNumericValue(network.bytes) ||
        extractNumericValue(network.io) ||
        extractNumericValue(data.network_bytes) ||
        extractNumericValue(data.network_io) ||
        extractNumericValue(data.network_info?.bytes_sent) ||
        extractNumericValue(data.metrics?.network_io) ||
        null;

      // If no direct network I/O found, try to calculate from network interfaces
      if (
        network_io === null &&
        data.network &&
        typeof data.network === "object"
      ) {
        let totalBytes = 0;
        Object.values(data.network).forEach((iface: any) => {
          if (typeof iface === "object" && iface.bytes_sent !== undefined) {
            totalBytes += (iface.bytes_sent || 0) + (iface.bytes_recv || 0);
          }
        });
        if (totalBytes > 0) {
          network_io = totalBytes;
        }
      }

      console.log("Extracted metrics:", {
        cpu_usage,
        memory_usage,
        disk_usage,
        network_io,
      });

      // USB device detection and tracking - check multiple possible locations
      let usbDevices = [];

      // Check various possible locations for USB device data
      const possibleUSBLocations = [
        data.usb_devices,
        data.hardware?.usb_devices,
        data.system_info?.usb_devices,
        data.devices?.usb,
        data.usb,
      ];

      for (const location of possibleUSBLocations) {
        if (location && Array.isArray(location) && location.length > 0) {
          usbDevices = location;
          console.log(`Found USB devices in location:`, location);
          break;
        }
      }

      console.log("Final USB devices for storage:", usbDevices);

      // Extract update information - enhanced to handle new structure
      const securityInfo = data.security || {};
      const updateHistory = data.update_history || {};
      const windowsUpdates = securityInfo.windows_updates || {};

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
          extracted_primary_mac: primary_mac,
          extracted_usb_devices: usbDevices,
          extracted_current_user: currentUser,
          extracted_ip_address: ip_address,
          extracted_update_info: {
            last_boot_time: updateHistory.last_boot_time || osInfo.boot_time,
            system_uptime_hours:
              updateHistory.system_uptime_hours ||
              (osInfo.uptime_seconds
                ? Math.floor(osInfo.uptime_seconds / 3600)
                : null),
            pending_reboot: updateHistory.pending_reboot,
            last_update_check: windowsUpdates.last_update_check,
            recent_updates: windowsUpdates.recent_updates,
            last_update: osInfo.last_update,
            windows_build: osInfo.build_number,
            windows_version: osInfo.display_version || osInfo.product_name,
          },
          extracted_security_info: {
            firewall_status: securityInfo.firewall_status,
            antivirus_status: securityInfo.antivirus_status,
            last_scan: securityInfo.last_scan,
          },
          extracted_virtualization: data.virtualization,
          processed_at: new Date().toISOString(),
        }),
      });

      // Process data through security service
      try {
        if (usbDevices.length > 0) {
          await securityService.checkUSBCompliance(device.id, usbDevices);
        }

        if (data.installed_software) {
          await securityService.checkSoftwareLicenseCompliance(
            device.id,
            data.installed_software,
          );
        }
      } catch (securityError) {
        console.warn("Security service processing failed:", securityError);
      }

      // Process data through performance service
      await performanceService.updateBaselines(device.id, {
        cpu_usage,
        memory_usage,
        disk_usage,
      });

      // Smart alert system - update existing alerts instead of creating duplicates
      const checkAndManageAlert = async (
        metric: string,
        value: number,
        thresholds: { critical: number; high: number; warning: number },
        category: string,
      ) => {
        // Determine current severity
        let currentSeverity = null;
        let currentThreshold = null;
        let message = "";

        if (value >= thresholds.critical) {
          currentSeverity = "critical";
          currentThreshold = thresholds.critical;
          if (metric === "cpu") {
            message = `Critical CPU usage: ${value.toFixed(1)}% - Immediate attention required`;
          } else if (metric === "memory") {
            message = `Critical memory usage: ${value.toFixed(1)}% - System at risk`;
          } else if (metric === "disk") {
            message = `Critical disk usage: ${value.toFixed(1)}% - Storage full`;
          }
        } else if (value >= thresholds.high) {
          currentSeverity = "high";
          currentThreshold = thresholds.high;
          if (metric === "cpu") {
            message = `High CPU usage: ${value.toFixed(1)}% - Performance degraded`;
          } else if (metric === "memory") {
            message = `High memory usage: ${value.toFixed(1)}% - Monitor closely`;
          } else if (metric === "disk") {
            message = `High disk usage: ${value.toFixed(1)}% - Cleanup needed`;
          }
        } else if (value >= thresholds.warning) {
          currentSeverity = "warning";
          currentThreshold = thresholds.warning;
          if (metric === "cpu") {
            message = `CPU usage elevated: ${value.toFixed(1)}% - Monitor`;
          } else if (metric === "memory") {
            message = `Memory usage elevated: ${value.toFixed(1)}% - Monitor`;
          } else if (metric === "disk") {
            message = `Disk usage elevated: ${value.toFixed(1)}% - Monitor`;
          }
        }

        // Check for existing active alert for this metric
        const existingAlert = await storage.getActiveAlertByDeviceAndMetric(
          device.id,
          metric,
        );

        if (currentSeverity) {
          // Should have an alert
          if (existingAlert) {
            // Only update if severity changed or value changed significantly (>2%)
            const lastValue = existingAlert.metadata?.[metric + "_usage"] || 0;
            const valueChange = Math.abs(value - lastValue);

            if (existingAlert.severity !== currentSeverity || valueChange > 2) {
              await storage.updateAlert(existingAlert.id, {
                severity: currentSeverity,
                message: message,
                metadata: {
                  [metric + "_usage"]: value,
                  threshold: currentThreshold,
                  metric: metric,
                  last_updated: new Date().toISOString(),
                  previous_value: lastValue,
                  value_change: valueChange,
                },
              });
              console.log(
                `Updated ${metric} alert for device ${device.hostname}: ${currentSeverity} (${value.toFixed(1)}%)`,
              );
            }
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
                created_at: new Date().toISOString(),
              },
              is_active: true,
            });
            console.log(
              `Created new ${metric} alert for device ${device.hostname}: ${currentSeverity} (${value.toFixed(1)}%)`,
            );
          }
        } else {
          // Value is below warning threshold
          if (existingAlert) {
            // Resolve existing alert
            await storage.resolveAlert(existingAlert.id);
            console.log(
              `Resolved ${metric} alert for device ${device.hostname}: value back to normal (${value.toFixed(1)}%)`,
            );
          }
        }
      };

      // Process alerts for each metric
      if (cpu_usage !== null && cpu_usage !== undefined) {
        await checkAndManageAlert(
          "cpu",
          cpu_usage,
          { critical: 95, high: 85, warning: 75 },
          "performance",
        );
      }

      if (memory_usage !== null && memory_usage !== undefined) {
        await checkAndManageAlert(
          "memory",
          memory_usage,
          { critical: 95, high: 85, warning: 75 },
          "performance",
        );
      }

      if (disk_usage !== null && disk_usage !== undefined) {
        await checkAndManageAlert(
          "disk",
          disk_usage,
          { critical: 95, high: 85, warning: 75 },
          "storage",
        );
      }

      // Update USB device tracking
      await storage.updateUSBDevices(device.id, usbDevices);

      // Check for existing USB alert
      const existingUsbAlert = await storage.getActiveAlertByDeviceAndMetric(
        device.id,
        "usb",
      );

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
              last_updated: new Date().toISOString(),
            },
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
              metric: "usb",
            },
            is_active: true,
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
        return res
          .status(400)
          .json({ message: "Invalid request data", errors: error });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notifications endpoint
  app.get("/api/notifications", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
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

        const userTickets = ticketsList.filter(
          (ticket) =>
            ticket.assigned_to === userId ||
            ticket.requester_email === decoded.email,
        );

        // Create notifications for recent ticket updates
        const notifications = userTickets
          .filter((ticket) => {
            const updatedAt = new Date(ticket.updated_at);
            const now = new Date();
            const diffHours =
              (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
            return diffHours <= 24; // Only show notifications for tickets updated in last 24 hours
          })
          .map((ticket) => ({
            id: ticket.id,
            type: "ticket_update",
            title: `Ticket ${ticket.ticket_number} updated`,
            message: `${ticket.title} - Status: ${ticket.status}`,
            timestamp: ticket.updated_at,
            read: false,
          }));

        res.json(notifications);
      } catch (jwtError) {
        return res.status(401).json({ error: "Invalid token" });
      }
    } catch (error) {
      console.error("Error fetching tickets for notifications:", error);
      res.json([]); // Return empty array on error to prevent client issues
    }
  });

  app.post(
    "/api/notifications/:id/read",
    authenticateToken,
    async (req, res) => {
      try {
        const notificationId = req.params.id;

        // In a real implementation, you'd store read status in database
        // For now, we'll just return success
        res.json({ message: "Notification marked as read" });
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/notifications/mark-all-read",
    authenticateToken,
    async (req: any, res) => {
      try {
        const userId = req.user.id;

        // In a real implementation, you'd update all notifications for the user in database
        // For now, we'll just return success with a more detailed response
        console.log(`Marking all notifications as read for user: ${userId}`);

        res.json({
          message: "All notifications marked as read",
          success: true,
          markedCount: 0, // Would be actual count in real implementation
        });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

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

  // Automation & Orchestration Endpoints
  app.get(
    "/api/automation/software-packages",
    authenticateToken,
    async (req, res) => {
      try {
        const { automationService } = await import("./automation-service");
        const packages = automationService.getSoftwarePackages();
        res.json(packages);
      } catch (error) {
        console.error("Error fetching software packages:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/automation/deploy-software",
    authenticateToken,
    requireRole(["admin", "manager"]),
    async (req, res) => {
      try {
        const { device_ids, package_id, scheduled_time } = req.body;

        if (!device_ids || !package_id) {
          return res
            .status(400)
            .json({ message: "device_ids and package_id are required" });
        }

        const { automationService } = await import("./automation-service");
        const scheduledTime = scheduled_time
          ? new Date(scheduled_time)
          : new Date();

        const deploymentIds = await automationService.scheduleDeployment(
          device_ids,
          package_id,
          scheduledTime,
        );

        res.json({
          deployment_ids: deploymentIds,
          message: "Software deployment scheduled",
          target_devices: device_ids.length,
          scheduled_time: scheduledTime,
        });
      } catch (error) {
        console.error("Error scheduling software deployment:", error);
        res
          .status(500)
          .json({ message: error.message || "Internal server error" });
      }
    },
  );

  app.get(
    "/api/automation/deployment/:deploymentId",
    authenticateToken,
    async (req, res) => {
      try {
        const { automationService } = await import("./automation-service");
        const deployment = await automationService.getDeploymentStatus(
          req.params.deploymentId,
        );

        if (!deployment) {
          return res.status(404).json({ message: "Deployment not found" });
        }

        res.json(deployment);
      } catch (error) {
        console.error("Error fetching deployment status:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/automation/remediation/:deviceId",
    authenticateToken,
    async (req, res) => {
      try {
        const { issue_type, remediation_action } = req.body;
        const deviceId = req.params.deviceId;

        // Log remediation action
        await storage.createAlert({
          device_id: deviceId,
          category: "automation",
          severity: "info",
          message: `Automated remediation initiated: ${issue_type}`,
          metadata: {
            issue_type: issue_type,
            remediation_action: remediation_action,
            initiated_by: req.user.email,
            automation_type: "remediation",
            status: "in_progress",
          },
          is_active: true,
        });

        res.json({
          message: "Remediation initiated",
          remediation_id: Date.now().toString(),
          status: "in_progress",
        });
      } catch (error) {
        console.error("Error initiating remediation:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/automation/deployments",
    authenticateToken,
    async (req, res) => {
      try {
        const alerts = await storage.getActiveAlerts();
        const deployments = alerts.filter(
          (alert) =>
            alert.category === "automation" &&
            alert.metadata?.automation_type === "software_deployment",
        );

        res.json(deployments);
      } catch (error) {
        console.error("Error fetching deployments:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Network Discovery Endpoint
  app.get("/api/network/topology", authenticateToken, async (req, res) => {
    try {
      const devices = await storage.getDevices();
      const topology = {
        nodes: devices.map((device) => ({
          id: device.id,
          hostname: device.hostname,
          ip_address: device.ip_address,
          status: device.status,
          os_name: device.os_name,
          assigned_user: device.assigned_user,
        })),
        edges: [], // Would be populated by network scanning
        subnets: [], // Would be detected from IP addresses
        last_scan: new Date(),
      };

      res.json(topology);
    } catch (error) {
      console.error("Error fetching network topology:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reports API endpoints
  app.post(
    "/api/reports/generate",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { type, period, format } = req.body;

        // Generate report data based on type and period
        let reportData = {};

        switch (type) {
          case "performance":
            const devices = await storage.getDevices();
            const performanceData = await Promise.all(
              devices.map(async (device) => {
                const reports = await storage.getDeviceReports(device.id);
                const latestReport = reports[0];
                return {
                  hostname: device.hostname,
                  cpu_usage: latestReport?.cpu_usage || "0",
                  memory_usage: latestReport?.memory_usage || "0",
                  disk_usage: latestReport?.disk_usage || "0",
                  status: device.status,
                };
              }),
            );
            reportData = {
              title: "Performance Summary Report",
              period: period,
              generated_at: new Date().toISOString(),
              devices: performanceData,
            };
            break;

          case "availability":
            const allDevices = await storage.getDevices();
            const onlineDevices = allDevices.filter(
              (d) => d.status === "online",
            );
            reportData = {
              title: "Availability Report",
              period: period,
              generated_at: new Date().toISOString(),
              total_devices: allDevices.length,
              online_devices: onlineDevices.length,
              availability_percentage: (
                (onlineDevices.length / allDevices.length) *
                100
              ).toFixed(2),
            };
            break;

          case "alerts":
            const alerts = await storage.getActiveAlerts();
            reportData = {
              title: "Alert History Report",
              period: period,
              generated_at: new Date().toISOString(),
              total_alerts: alerts.length,
              alerts: alerts.slice(0, 100), // Limit to 100 recent alerts
            };
            break;

          case "inventory":
            const inventoryDevices = await storage.getDevices();
            reportData = {
              title: "System Inventory Report",
              period: period,
              generated_at: new Date().toISOString(),
              devices: inventoryDevices.map((d) => ({
                hostname: d.hostname,
                os_name: d.os_name,
                os_version: d.os_version,
                assigned_user: d.assigned_user,
                status: d.status,
                last_seen: d.last_seen,
              })),
            };
            break;

          default:
            return res.status(400).json({ error: "Invalid report type" });
        }

        // Generate appropriate file format
        let contentType = "application/json";
        let fileContent = JSON.stringify(reportData, null, 2);

        if (format === "csv") {
          contentType = "text/csv";
          // Convert to CSV format (simplified)
          if (reportData.devices) {
            const headers = Object.keys(reportData.devices[0] || {}).join(",");
            const rows = reportData.devices
              .map((device) =>
                Object.values(device)
                  .map((v) => `"${v}"`)
                  .join(","),
              )
              .join("\n");
            fileContent = headers + "\n" + rows;
          }
        } else if (format === "excel") {
          contentType =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          // For now, return CSV content with Excel content type
          if (reportData.devices) {
            const headers = Object.keys(reportData.devices[0] || {}).join(",");
            const rows = reportData.devices
              .map((device) =>
                Object.values(device)
                  .map((v) => `"${v}"`)
                  .join(","),
              )
              .join("\n");
            fileContent = headers + "\n" + rows;
          }
        }

        res.setHeader("Content-Type", contentType);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="report.${format}"`,
        );
        res.send(fileContent);
      } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ error: "Failed to generate report" });
      }
    },
  );

  app.post("/api/reports/download", authenticateToken, async (req, res) => {
    try {
      const { reportName, format } = req.body;

      // Mock report download - in real implementation, you'd fetch from storage
      const reportData = {
        title: reportName,
        generated_at: new Date().toISOString(),
        content: "This is a sample report content for demonstration purposes.",
      };

      let contentType = "application/pdf";
      let fileContent = JSON.stringify(reportData, null, 2);

      if (format === "pdf") {
        contentType = "application/pdf";
        // For now, return JSON content - in real implementation, generate PDF
        fileContent = `PDF Report: ${reportName}\nGenerated: ${reportData.generated_at}\n\n${reportData.content}`;
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${reportName.toLowerCase().replace(/\s+/g, "-")}.${format}"`,
      );
      res.send(fileContent);
    } catch (error) {
      console.error("Error downloading report:", error);
      res.status(500).json({ error: "Failed to download report" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
  });

  // Automation API endpoints - Fixed implementation
  app.get(
    "/api/automation/software-packages",
    authenticateToken,
    (req, res) => {
      try {
        console.log("Fetching software packages");
        const packages = automationService.getSoftwarePackages();
        console.log(`Returning ${packages.length} software packages`);
        res.json(packages);
      } catch (error) {
        console.error("Error getting software packages:", error);
        res.status(500).json({
          error: "Failed to get software packages",
          message: error.message,
        });
      }
    },
  );

  app.get(
    "/api/automation/deployments",
    authenticateToken,
    async (req, res) => {
      try {
        console.log("Fetching automation deployments");
        // Get automation alerts that represent deployments
        const alerts = await storage.getActiveAlerts();
        const deployments = alerts.filter(
          (alert) => alert.category === "automation",
        );
        console.log(`Found ${deployments.length} automation deployments`);
        res.json(deployments);
      } catch (error) {
        console.error("Error getting deployments:", error);
        res
          .status(500)
          .json({ error: "Failed to get deployments", message: error.message });
      }
    },
  );

  app.post(
    "/api/automation/deploy-software",
    authenticateToken,
    requireRole(["admin", "manager"]),
    async (req, res) => {
      try {
        console.log("Processing software deployment request:", req.body);
        const { device_ids, package_id, scheduled_time } = req.body;

        if (
          !device_ids ||
          !Array.isArray(device_ids) ||
          device_ids.length === 0
        ) {
          return res.status(400).json({
            error: "device_ids is required and must be a non-empty array",
          });
        }

        if (!package_id) {
          return res.status(400).json({ error: "package_id is required" });
        }

        const scheduledDate = scheduled_time
          ? new Date(scheduled_time)
          : new Date();
        const deploymentIds = await automationService.scheduleDeployment(
          device_ids,
          package_id,
          scheduledDate,
        );

        console.log(`Deployment scheduled with IDs: ${deploymentIds}`);
        res.json({
          message: "Deployment scheduled successfully",
          deployment_ids: deploymentIds,
          scheduled_time: scheduledDate,
        });
      } catch (error) {
        console.error("Error scheduling deployment:", error);
        res.status(500).json({
          error: error.message || "Failed to schedule deployment",
          message: error.message,
        });
      }
    },
  );

  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      console.log("GET /api/users - Fetching users from database");

      const { search, role } = req.query;
      console.log("Query params:", { search, role });

      // Initialize demo users if they don't exist
      await storage.initializeDemoUsers();

      const filters = {};
      if (search) filters.search = search as string;
      if (role && role !== "all") filters.role = role as string;

      console.log("Calling storage.getUsers with filters:", filters);
      const users = await storage.getUsers(filters);
      console.log(
        `Found ${users.length} users:`,
        users.map((u) => ({ id: u.id, email: u.email, name: u.name })),
      );

      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch users", error: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      console.log("GET /api/users/:id - Fetching user:", req.params.id);
      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      console.log("POST /api/users - Creating user:", req.body);
      const { name, email, password, role, department, phone } = req.body;

      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ message: "Name, email, and password are required" });
      }

      // Hash password
      const bcrypt = await import("bcrypt");
      const password_hash = await bcrypt.hash(password, 10);

      const userData = {
        name,
        email: email.toLowerCase(),
        password_hash,
        role: role || "user",
        department: department || "",
        phone: phone || "",
        is_active: true,
      };

      const newUser = await storage.createUser(userData);
      console.log("Created user:", newUser);
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res
        .status(500)
        .json({ message: "Failed to create user", error: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      console.log(
        "PUT /api/users/:id - Updating user:",
        req.params.id,
        req.body,
      );
      const { name, email, password, role, department, phone, is_active } =
        req.body;

      const updates: any = {
        name,
        email: email?.toLowerCase(),
        role,
        department,
        phone,
        is_active,
      };

      // Hash password if provided
      if (password) {
        const bcrypt = await import("bcrypt");
        updates.password_hash = await bcrypt.hash(password, 10);
      }

      // Remove undefined values
      Object.keys(updates).forEach((key) => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });

      const updatedUser = await storage.updateUser(req.params.id, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("Updated user:", updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res
        .status(500)
        .json({ message: "Failed to update user", error: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      console.log("DELETE /api/users/:id - Deleting user:", req.params.id);
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      console.log("User deleted successfully");
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res
        .status(500)
        .json({ message: "Failed to delete user", error: error.message });
    }
  });

  // Analytics endpoints
  app.post(
    "/api/analytics/generate-report",
    authenticateToken,
    async (req, res) => {
      try {
        const { type, period, format } = req.body;

        // Mock report generation - replace with actual implementation
        const reportData = {
          type,
          period,
          generatedAt: new Date().toISOString(),
          data: {
            summary: `${type} report for ${period}`,
            metrics: {
              totalTickets: 150,
              resolvedTickets: 120,
              avgResolutionTime: "4.2 hours",
            },
          },
        };

        if (format === "pdf") {
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${type}-report.pdf"`,
          );
          res.send(
            Buffer.from(`PDF Report: ${JSON.stringify(reportData, null, 2)}`),
          );
        } else if (format === "csv") {
          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${type}-report.csv"`,
          );
          res.send(
            `Type,Period,Generated\n${type},${period},${reportData.generatedAt}`,
          );
        } else {
          res.json(reportData);
        }
      } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ error: "Failed to generate report" });
      }
    },
  );

  app.post(
    "/api/analytics/download-report",
    authenticateToken,
    async (req, res) => {
      try {
        const { reportName, format } = req.body;

        // Mock report download
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${reportName.replace(/\s+/g, "-")}.pdf"`,
        );
        res.send(Buffer.from(`Downloaded Report: ${reportName}`));
      } catch (error) {
        console.error("Error downloading report:", error);
        res.status(500).json({ error: "Failed to download report" });
      }
    },
  );

  // Security Alert generation and duplicate alert suppression
  const generateSecurityAlert = async (
    deviceId: string,
    alertType: string,
    severity: string,
    message: string,
  ) => {
    try {
      // Get device name for alert message
      const device = await storage.getDevice(deviceId);
      const deviceName = device?.hostname || "Unknown Device";

      // Check for existing alert of same type for this device (more comprehensive check)
      const { pool } = await import("./db");
      const existingAlert = await pool.query(
        `
        SELECT id, created_at FROM alerts 
        WHERE device_id = $1 AND type = $2 AND is_active = true
        AND message = $3
        AND created_at > NOW() - INTERVAL '5 minutes'
        ORDER BY created_at DESC 
        LIMIT 1
      `,
        [deviceId, alertType, message],
      );

      if (existingAlert.rows.length > 0) {
        console.log(
          `Skipping duplicate ${alertType} alert for device ${deviceName} (last alert: ${existingAlert.rows[0].created_at})`,
        );
        return;
      }

      // Create a new alert in database
      await pool.query(
        `
        INSERT INTO alerts (device_id, type, category, severity, message, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          deviceId,
          alertType,
          "security",
          severity,
          message,
          true,
          new Date(),
          new Date(),
        ],
      );

      console.log(`Generated new ${alertType} alert for device ${deviceName}`);
    } catch (error) {
      console.error("Error generating security alert:", error);
    }
  };

  // Knowledge Base Routes (publicly accessible)
  app.get("/api/knowledge-base", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        category: req.query.category as string,
        search: req.query.search as string,
        status: (req.query.status as string) || "published",
      };

      console.log("Fetching KB articles with filters:", filters);
      const result = await storage.getKBArticles(page, limit, filters);
      console.log(`Returning ${result.data?.length || result.length} articles`);
      
      // Handle both result.data and direct result array
      const articles = result.data || result;
      res.json(articles);
    } catch (error) {
      console.error("Error fetching KB articles:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get individual knowledge base article
  app.get("/api/knowledge-base/:id", async (req, res) => {
    try {
      console.log(`Fetching KB article with ID: ${req.params.id}`);

      const article = await storage.getKBArticle(req.params.id);

      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Increment view count
      try {
        await storage.incrementArticleViews(req.params.id);
      } catch (viewError) {
        console.warn("Failed to increment article views:", viewError);
      }

      res.json(article);
    } catch (error) {
      console.error("Error fetching KB article:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
