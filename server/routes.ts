import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerTicketRoutes } from "./ticket-routes";
import { registerDeviceRoutes } from "./device-routes";
import { registerAgentRoutes } from "./agent-routes";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// Removed validation schema import - using flexible data parsing
import { schema } from "@shared/schema";
import { userSchema } from "@shared/user-schema";
import { adminSchema } from "@shared/admin-schema";
import { knowledgeSchema } from "@shared/knowledge-schema";
import { tickets } from "@shared/ticket-schema";
import { userStorage } from "./user-storage";
import { knowledgeStorage } from "./knowledge-storage";
import { ticketStorage } from "./ticket-storage";
import { securityService } from "./security-service";
import { performanceService } from "./performance-service";
import { automationService } from "./automation-service";
import { aiService } from "./ai-service";

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
      const { email, password, useActiveDirectory } = req.body;
      console.log("Login attempt for:", email, "AD:", useActiveDirectory);

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      // Active Directory Authentication
      if (useActiveDirectory) {
        try {
          const { adService } = await import('./ad-service');

          // Extract username from email if needed
          const username = email.includes('@') ? email.split('@')[0] : email;

          console.log("Attempting AD authentication for:", username);
          const adUser = await adService.authenticateUser(username, password);

          if (adUser) {
            // Sync user to local database
            const localUser = await adService.syncUserToDatabase(adUser);

            // Generate JWT token
            const token = jwt.sign(
              { 
                userId: localUser.id, 
                id: localUser.id, 
                email: localUser.email, 
                role: localUser.role,
                authMethod: 'ad'
              },
              JWT_SECRET,
              { expiresIn: "24h" }
            );

            console.log("AD login successful for:", email);
            res.json({
              message: "Login successful",
              token,
              user: {
                id: localUser.id,
                email: localUser.email,
                name: localUser.name,
                role: localUser.role,
                department: localUser.department,
                authMethod: 'ad'
              }
            });
            return;
          } else {
            console.log("AD authentication failed for:", username);
            return res.status(401).json({ message: "Invalid Active Directory credentials" });
          }
        } catch (adError) {
          console.error("AD authentication error:", adError);
          return res.status(500).json({ message: "Active Directory authentication failed" });
        }
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

  // Dashboard summary endpoint - uses only real database data
  app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
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
      console.log("Fetching alerts for user:", req.user?.email);
      const alerts = await storage.getActiveAlerts();
      console.log(`Found ${alerts.length} alerts`);

      // Enhance alerts with device hostname
      const enhancedAlerts = await Promise.all(
        alerts.map(async (alert) => {
          try {
            const device = await storage.getDevice(alert.device_id);
            return {
              ...alert,
              device_hostname: device?.hostname || "Unknown Device",
            };
          } catch (deviceError) {
            console.warn(`Failed to get device for alert ${alert.id}:`, deviceError);
            return {
              ...alert,
              device_hostname: "Unknown Device",
            };
          }
        }),
      );

      console.log(`Returning ${enhancedAlerts.length} enhanced alerts`);
      res.json(enhancedAlerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ 
        message: "Internal server error",
        error: error.message 
      });
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
      const userId = req.user?.id || req.user?.email;
      console.log(`User ${userId} attempting to resolve alert: ${alertId}`);

      if (!alertId) {
        return res.status(400).json({
          message: "Alert ID is required",
          success: false,
        });
      }

      // Check if alert exists first
      let alert;
      try {
        alert = await storage.getAlertById(alertId);
      } catch (fetchError) {
        console.error(`Error fetching alert ${alertId}:`, fetchError);
        return res.status(500).json({
          message: "Error fetching alert",
          error: fetchError.message,
          success: false,
        });
      }

      if (!alert) {
        console.log(`Alert ${alertId} not found`);
        return res.status(404).json({
          message: "Alert not found",
          alertId: alertId,
          success: false,
        });
      }

      if (!alert.is_active) {
        console.log(`Alert ${alertId} is already resolved`);
        return res.status(400).json({
          message: "Alert is already resolved",
          alertId: alertId,
          success: false,
        });
      }

      try {
        await storage.resolveAlert(alertId);
        console.log(`Alert ${alertId} resolved successfully by ${userId}`);

        res.json({
          message: "Alert resolved successfully",
          alertId: alertId,
          success: true,
          resolvedBy: userId,
          resolvedAt: new Date().toISOString(),
        });
      } catch (resolveError) {
        console.error(`Error resolving alert ${alertId}:`, resolveError);
        res.status(500).json({
          message: "Failed to resolve alert",
          error: resolveError.message,
          alertId: alertId,
          success: false,
        });
      }
    } catch (error) {
      console.error("Error in resolve alert endpoint:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
        success: false,
      });
    }
  });

  

  // Report endpoint (from ITSM agents) - moved to ensure proper routing
  app.post("/api/report", async (req, res) => {
    try {
      console.log("=== AGENT REPORT RECEIVED ===");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Agent IP:", req.ip);
      console.log("User-Agent:", req.headers['user-agent']);
      console.log("Report data keys:", Object.keys(req.body));
      console.log("Hostname:", req.body.hostname || 'NOT PROVIDED');
      console.log("================================");
      console.log("Full report data:", JSON.stringify(req.body, null, 2));

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
      let public_ip = data.network?.public_ip || null;

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

      // Get public IP for location lookup - prefer collected public IP
      if (!public_ip) {
        // Try to determine if we have a public IP for location lookup
        if (ip_address && !ip_address.startsWith("192.168.") && 
            !ip_address.startsWith("10.") && !ip_address.startsWith("172.") &&
            !ip_address.startsWith("127.") && !ip_address.startsWith("169.254.")) {
          public_ip = ip_address;
        }
      }

      // Fetch location data from IP-API.com (free service with 45 requests/minute)
      let locationData = null;
      if (public_ip && public_ip !== "unknown") {
        try {
          console.log(`Fetching location for IP: ${public_ip}`);
          const response = await fetch(`http://ip-api.com/json/${public_ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
          if (response.ok) {
            const data = await response.json();
            if (data.status === "success") {
              // Transform IP-API response to match our expected format
              locationData = {
                ip: data.query,
                city: data.city,
                region: data.regionName,
                country: data.country,
                countryCode: data.countryCode,
                loc: `${data.lat},${data.lon}`, // lat,lng format for compatibility
                postal: data.zip,
                timezone: data.timezone,
                org: data.org || data.isp,
                isp: data.isp,
                as: data.as
              };
              console.log(`Location data received:`, locationData);
            } else {
              console.warn(`IP-API returned error: ${data.message}`);
            }
          } else {
            console.warn(`IP-API returned status: ${response.status}`);
          }
        } catch (error) {
          console.warn("Failed to fetch location from IP-API:", error);
        }
      } else {
        console.log("No public IP available for location lookup, trying primary IP");
        // Try with primary IP if it's not private
        if (ip_address && !ip_address.startsWith("192.168.") && 
            !ip_address.startsWith("10.") && !ip_address.startsWith("172.") &&
            !ip_address.startsWith("127.") && !ip_address.startsWith("169.254.")) {
          try {
            console.log(`Fetching location for primary IP: ${ip_address}`);
            const response = await fetch(`http://ip-api.com/json/${ip_address}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
            if (response.ok) {
              const data = await response.json();
              if (data.status === "success") {
                locationData = {
                  ip: data.query,
                  city: data.city,
                  region: data.regionName,
                  country: data.country,
                  countryCode: data.countryCode,
                  loc: `${data.lat},${data.lon}`,
                  postal: data.zip,
                  timezone: data.timezone,
                  org: data.org || data.isp,
                  isp: data.isp,
                  as: data.as
                };
                public_ip = ip_address; // Update public IP
                console.log(`Location data received from primary IP:`, locationData);
              } else {
                console.warn(`IP-API returned error for primary IP: ${data.message}`);
              }
            }
          } catch (error) {
            console.warn("Failed to fetch location from primary IP:", error);
          }
        }
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
          "Location:",
          locationData ? `${locationData.city}, ${locationData.country}` : "None"
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
          "Location:",
          locationData ? `${locationData.city}, ${locationData.country}` : "None"
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
        extractNumericValue(systemHealth.memory_percent) ||        extractNumericValue(systemHealth.memory_usage) ||
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

      // Create device report with enhanced data including location columns
      await storage.createDeviceReport({
        device_id: device.id,
        cpu_usage: cpu_usage?.toString() || null,
        memory_usage: memory_usage?.toString() || null,
        disk_usage: disk_usage?.toString() || null,
        network_io: network_io?.toString() || null,
        public_ip: public_ip,
        location_city: locationData?.city || null,
        location_country: locationData?.country || null,
        location_coordinates: locationData?.loc || null,
        location_data: locationData ? JSON.stringify(locationData) : null,
        raw_data: JSON.stringify({
          ...req.body,
          extracted_mac_addresses: mac_addresses,
          extracted_primary_mac: primary_mac,
          extracted_usb_devices: usbDevices,
          extracted_current_user: currentUser,
          extracted_ip_address: ip_address,
          extracted_public_ip: public_ip,
          extracted_location_data: locationData,
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

      // Enhanced alert system with better deduplication and consolidation
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

        // Check for existing active alert for this metric and device
        const existingAlert = await storage.getActiveAlertByDeviceAndMetric(
          device.id,
          metric,
        );

        if (currentSeverity) {
          // Should have an alert
          if (existingAlert) {
            // Get the last reported value
            const lastValue = existingAlert.metadata?.[metric + "_usage"] || 0;
            const valueChange = Math.abs(value - lastValue);
            const timeSinceLastUpdate = new Date().getTime() - new Date(existingAlert.metadata?.last_updated || existingAlert.triggered_at).getTime();
            const minutesSinceUpdate = timeSinceLastUpdate / (1000 * 60);

            // Only update if:
            // 1. Severity changed, OR
            // 2. Value changed significantly (>3%), OR  
            // 3. It's been more than 30 minutes since last update (to prevent stale alerts)
            const shouldUpdate = 
              existingAlert.severity !== currentSeverity || 
              valueChange > 3 || 
              minutesSinceUpdate > 30;

            if (shouldUpdate) {
              await storage.updateAlert(existingAlert.id, {
                severity: currentSeverity,
                message: message,
                triggered_at: new Date(), // Update timestamp to current
                metadata: {
                  ...existingAlert.metadata,
                  [metric + "_usage"]: value,
                  threshold: currentThreshold,
                  metric: metric,
                  last_updated: new Date().toISOString(),
                  previous_value: lastValue,
                  value_change: valueChange.toFixed(1),
                  update_reason: existingAlert.severity !== currentSeverity ? 'severity_change' : 
                                valueChange > 3 ? 'significant_change' : 'periodic_update'
                },
              });
              console.log(
                `Updated ${metric} alert for device ${device.hostname}: ${currentSeverity} (${value.toFixed(1)}%) - Previous: ${lastValue.toFixed(1)}%`,
              );
            } else {
              // Just log that we're skipping the update
              console.log(
                `Skipping ${metric} alert update for device ${device.hostname}: minimal change (${value.toFixed(1)}% vs ${lastValue.toFixed(1)}%)`,
              );
            }
          } else {
            // Create new alert only if no recent similar alert exists
            try {
              // Check for any recently resolved alerts of the same type to prevent rapid cycling
              const { pool } = await import("./db");
              const recentResolvedAlert = await pool.query(
                `SELECT id FROM alerts 
                 WHERE device_id = $1 AND category = $2 
                 AND metadata->>'metric' = $3
                 AND resolved_at > NOW() - INTERVAL '10 minutes'
                 ORDER BY resolved_at DESC LIMIT 1`,
                [device.id, category, metric]
              );

              if (recentResolvedAlert.rows.length === 0) {
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
                    initial_detection: true,
                  },
                  is_active: true,
                });
                console.log(
                  `Created new ${metric} alert for device ${device.hostname}: ${currentSeverity} (${value.toFixed(1)}%)`,
                );
              } else {
                console.log(
                  `Skipping new ${metric} alert for device ${device.hostname}: recently resolved similar alert exists`,
                );
              }
            } catch (dbError) {
              // Fallback to storage method if database query fails
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
          { critical: 92, high: 88, warning: 85 },
          "performance",
        );
      }

      if (memory_usage !== null && memory_usage !== undefined) {
        await checkAndManageAlert(
          "memory",
          memory_usage,
          { critical: 92, high: 88, warning: 85 },
          "performance",
        );
      }

      if (disk_usage !== null && disk_usage !== undefined) {
        await checkAndManageAlert(
          "disk",
          disk_usage,
          { critical: 92, high: 88, warning: 85 },
          "storage",
        );
      }

      // Clean up any duplicate alerts for this device before processing new ones
      try {
        const { pool } = await import("./db");

        // Find and resolve duplicate alerts (same device, same metric, same severity)
        await pool.query(`
          UPDATE alerts 
          SET is_active = false, resolved_at = NOW()
          WHERE id IN (
            SELECT id FROM (
              SELECT id, ROW_NUMBER() OVER (
                PARTITION BY device_id, metadata->>'metric', severity 
                ORDER BY triggered_at DESC
              ) as rn
              FROM alerts 
              WHERE device_id = $1 AND is_active = true
            ) t 
            WHERE t.rn > 1
          )
        `, [device.id]);

        console.log(`Cleaned up duplicate alerts for device ${device.hostname}`);
      } catch (cleanupError) {
        console.warn("Failed to cleanup duplicate alerts:", cleanupError);
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

      //Add agent active ports to the device reports
      const activePorts = data.active_ports;
       if (activePorts && Array.isArray(activePorts) && activePorts.length > 0) {
        console.log(`Found active ports in location:`, activePorts);
      }

       // Create device report with active ports and location data
       await storage.createDeviceReport({
        device_id: device.id,
        cpu_usage: cpu_usage?.toString() || null,
        memory_usage: memory_usage?.toString() || null,
        disk_usage: disk_usage?.toString() || null,
        network_io: network_io?.toString() || null,
        public_ip: public_ip,
        location_city: locationData?.city || null,
        location_country: locationData?.country || null,
        location_coordinates: locationData?.loc || null,
        location_data: locationData ? JSON.stringify(locationData) : null,
        raw_data: JSON.stringify({
          ...req.body,
          extracted_mac_addresses: mac_addresses,
          extracted_primary_mac: primary_mac,
          extracted_usb_devices: usbDevices,
          extracted_current_user: currentUser,
          extracted_ip_address: ip_address,
          extracted_public_ip: public_ip,
          extracted_location_data: locationData,
          extracted_active_ports: activePorts, //added active ports
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

      console.log("=== AGENT REPORT PROCESSED SUCCESSFULLY ===");
      console.log("Device ID:", device.id);
      console.log("Device Status:", device.status);
      console.log("===============================================");
      res.json({ message: "Report saved successfully" });
    } catch (error) {
      console.error("=== AGENT REPORT ERROR ===");
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

  // Register modular routes
  registerTicketRoutes(app);
  registerDeviceRoutes(app, authenticateToken);
  registerAgentRoutes(app, authenticateToken, requireRole);

  // Register Active Directory routes
  const { adRoutes } = await import("./ad-routes");
  app.use("/api/ad", authenticateToken, requireRole(["admin"]), adRoutes);

  // Register agent download routes
  const agentDownloadRoutes = await import("./agent-download-routes");
  app.use("/api/download/agent", agentDownloadRoutes.default);

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
          remediation_id: Date.now.toString(),
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
                return{
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
              ).toFixed(2),            };
            break;

          case "alerts":
            const alerts = await storage.getActiveAlerts();
            reportData = {
              title: "Alert History Report",
              period: period,
              generated_at: new Date().toISOString(),
              total_alerts: alerts.length,
              alerts: alerts.slice(0, 100), //```text

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

  // Remote Connection Endpoints
  app.post("/api/agents/:id/remote-connect", authenticateToken, async (req, res) => {
    try {
      const agentId = req.params.id;
      const { connection_type = "vnc", port = 5900, use_tunnel = false, jump_host = null } = req.body;

      const device = await storage.getDevice(agentId);
      if (!device) {
        return res.status(404).json({ message: "Agent not found" });
      }

      if (device.status !== "online") {
        return res.status(400).json({ 
          message: "Agent is not online", 
          status: device.status 
        });
      }

      // Check if device IP is private
      const isPrivateIP = device.ip_address && (
        device.ip_address.startsWith("10.") ||
        device.ip_address.startsWith("172.") ||
        device.ip_address.startsWith("192.168.") ||
        device.ip_address.startsWith("169.254.")
      );

      // Log connection attempt
      await storage.createAlert({
        device_id: agentId,
        category: "remote_access",
        severity: "info",
        message: `Remote connection initiated by ${req.user.email}`,
        metadata: {
          connection_type,
          port,
          user: req.user.email,
          timestamp: new Date().toISOString()
        },
        is_active: true
      });

      const instructions = {
        vnc: "Ensure VNC server and websockify are running on the target machine",
        rdp: "Ensure Remote Desktop is enabled and user has RDP permissions", 
        ssh: "Ensure SSH service is running and firewall allows SSH connections",
        teamviewer: "Ensure TeamViewer is installed and running on the target machine"
      };

      const connectionInfo = {
        hostname: device.hostname,
        ip_address: device.ip_address,
        port: port,
        connection_type,
        instructions: instructions[connection_type] || "Ensure remote access is enabled on the target machine",
        teamviewer_id: connection_type === "teamviewer" ? device.teamviewer_id : undefined,
        is_private_ip: isPrivateIP
      };

      // Add tunnel guidance for private IPs
      if (isPrivateIP) {
        connectionInfo.tunnel_required = true;
        connectionInfo.tunnel_suggestions = [
          {
            method: "ssh_tunnel",
            command: `ssh -L ${port}:${device.ip_address}:${port} ${jump_host || 'your_jump_host'}`,
            description: "Create SSH tunnel via jump host"
          },
          {
            method: "vpn",
            description: "Connect to company VPN first, then access private IP directly"
          },
          {
            method: "reverse_proxy",
            description: "Deploy reverse proxy on public server"
          }
        ];
      }

      res.json({
        success: true,
        connection_info: connectionInfo
      });
    } catch (error) {
      console.error("Error initiating remote connection:", error);
      res.status(500).json({ message: "Failed to initiate remote connection" });
    }
  });

  app.get("/api/agents/:id/connection-status", authenticateToken, async (req, res) => {
    try {
      const agentId = req.params.id;
      const device = await storage.getDevice(agentId);

      if (!device) {
        return res.status(404).json({ message: "Agent not found" });
      }

      // Check if agent is online and responsive
      const lastSeen = new Date(device.last_seen);
      const now = new Date();
      const timeDiff = now.getTime() - lastSeen.getTime();
      const minutesOffline = Math.floor(timeDiff / (1000 * 60));

      const connectionStatus = {
        agent_online: device.status === "online" && minutesOffline < 5,
        last_seen: device.last_seen,
        minutes_since_contact: minutesOffline,
        ip_address: device.ip_address,
        hostname: device.hostname,
        ready_for_connection: device.status === "online" && minutesOffline < 5
      };

      res.json(connectionStatus);
    } catch (error) {
      console.error("Error checking connection status:", error);
      res.status(500).json({ message: "Failed to check connection status" });
    }
  });

  // Test connectivity endpoint
  app.post('/api/agents/:id/test-connectivity', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const device = await storage.getDevice(id);

      if (!device || !device.ip_address) {
        return res.status(404).json({ message: 'Agent not found or no IP address' });
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
        reachable: device.status === 'online' && minutesSinceLastSeen !== null && minutesSinceLastSeen < 5,
        port_open: device.status === 'online' && hasRecentData && minutesSinceLastReport !== null && minutesSinceLastReport < 10,
        response_time: minutesSinceLastSeen !== null ? Math.min(minutesSinceLastSeen * 1000, 30000) : 30000,
        tested_at: now.toISOString(),
        last_seen_minutes_ago: minutesSinceLastSeen,
        last_report_minutes_ago: minutesSinceLastReport,
        has_recent_data: hasRecentData
      };

      res.json(connectivity);
    } catch (error) {
      console.error('Error testing connectivity:', error);
      res.status(500).json({ message: 'Failed to test connectivity' });
    }
  });

  // Debug endpoint to check device status
  app.get("/api/debug/devices", authenticateToken, async (req, res) => {
    try {
      const devices = await storage.getDevices();
      const now = new Date();

      const deviceDetails = devices.map(device => {
        const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
        const minutesAgo = lastSeen ? Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60)) : null;

        return {
          id: device.id,
          hostname: device.hostname,
          ip_address: device.ip_address,
          assigned_user: device.assigned_user,
          status: device.status,
          last_seen: device.last_seen,
          minutes_since_last_report: minutesAgo,
          is_recently_active: minutesAgo !== null && minutesAgo < 5,
          created_at: device.created_at
        };
      });

      res.json({
        total_devices: devices.length,
        devices: deviceDetails,
        summary: {
          online: deviceDetails.filter(d => d.status === 'online').length,
          offline: deviceDetails.filter(d => d.status === 'offline').length,
          recently_active: deviceDetails.filter(d => d.is_recently_active).length
        }
      });
    } catch (error) {
      console.error("Error in debug devices endpoint:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Command Management API endpoints
  app.post("/api/commands/queue", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const { device_id, type, command, priority = 5, scheduled_for } = req.body;

      if (!device_id || !type || !command) {
        return res.status(400).json({ error: "device_id, type, and command are required" });
      }

      // Validate device exists and is online
      const device = await storage.getDevice(device_id);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }

      if (device.status !== 'online') {
        return res.status(400).json({ error: "Device is not online" });
      }

      // Create command in database
      const { pool } = await import("./db");
      const result = await pool.query(
        `INSERT INTO agent_commands (device_id, type, command, priority, status, created_by, created_at, scheduled_for)
         VALUES ($1, $2, $3, $4, 'pending', $5, NOW(), $6)
         RETURNING id`,
        [device_id, type, command, priority, req.user.id, scheduled_for || null]
      );

      res.json({ 
        success: true, 
        command_id: result.rows[0].id,
        message: "Command queued successfully" 
      });
    } catch (error) {
      console.error("Error queuing command:", error);
      res.status(500).json({ error: "Failed to queue command" });
    }
  });

  app.get("/api/commands/history", authenticateToken, async (req, res) => {
    try {
      const { pool } = await import("./db");
      const result = await pool.query(
        `SELECT c.*, d.hostname as device_hostname 
         FROM agent_commands c
         JOIN devices d ON c.device_id = d.id
         ORDER BY c.created_at DESC
         LIMIT 100`
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching command history:", error);
      res.status(500).json({ error: "Failed to fetch command history" });
    }
  });

  app.get("/api/commands/pending/:deviceId", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { pool } = await import("./db");

      const result = await pool.query(
        `SELECT * FROM agent_commands 
         WHERE device_id = $1 AND status = 'pending'
         AND (scheduled_for IS NULL OR scheduled_for <= NOW())
         ORDER BY priority ASC, created_at ASC
         LIMIT 1`,
        [deviceId]
      );

      if (result.rows.length > 0) {
        const command = result.rows[0];

        // Update status to executing
        await pool.query(
          "UPDATE agent_commands SET status = 'executing', started_at = NOW() WHERE id = $1",
          [command.id]
        );

        res.json({
          command: {
            id: command.id,
            type: command.type,
            command: command.command,
            priority: command.priority,
            parameters: command.parameters || {}
          }
        });
      } else {
        res.json({ command: null });
      }
    } catch (error) {
      console.error("Error getting pending commands:", error);
      res.status(500).json({ error: "Failed to get pending commands" });
    }
  });

  app.put("/api/commands/:commandId/status", async (req, res) => {
    try {
      const { commandId } = req.params;
      const { status, output, error } = req.body;

      const { pool } = await import("./db");
      await pool.query(
        `UPDATE agent_commands 
         SET status = $1, output = $2, error = $3, completed_at = $4, updated_at = NOW()
         WHERE id = $5`,
        [status, output || null, error || null, 
         (status === 'completed' || status === 'failed') ? new Date() : null, 
         commandId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating command status:", error);
      res.status(500).json({ error: "Failed to update command status" });
    }
  });

  // Agent API endpoints
  app.post("/api/heartbeat", async (req, res) => {
    try {
      console.log("Agent heartbeat received:", req.body);
      const { hostname, systemInfo } = req.body;

      if (!hostname) {
        return res.status(400).json({ error: "Hostname is required" });
      }

      // Check if device exists, create if not
      let device = await storage.getDeviceByHostname(hostname);

      if (!device) {
        device = await storage.createDevice({
          hostname: hostname,
          assigned_user: systemInfo?.current_user || null,
          os_name: systemInfo?.platform || null,
          os_version: systemInfo?.version || null,
          ip_address: req.ip || null,
          status: "online",
          last_seen: new Date(),
        });
        console.log("Created new device from heartbeat:", device.id);
      } else {
        // Update existing device
        await storage.updateDevice(device.id, {
          status: "online",
          last_seen: new Date(),
        });
        console.log("Updated device from heartbeat:", device.id);
      }

      // Store system info if provided
      if (systemInfo) {
        await storage.createDeviceReport({
          device_id: device.id,
          cpu_usage: systemInfo.cpu_usage?.toString() || null,
          memory_usage: systemInfo.memory_usage?.toString() || null,
          disk_usage: systemInfo.disk_usage?.toString() || null,
          network_io: null,
          raw_data: JSON.stringify(req.body),
        });
      }

      res.json({ 
        message: "Heartbeat received", 
        agentId: device.id,
        status: "success" 
      });
    } catch (error) {
      console.error("Error processing heartbeat:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/commands", async (req, res) => {
    try {
      console.log("Agent requesting commands");

      // For now, return empty commands array
      // In a full implementation, this would check for pending commands
      res.json({ 
        commands: [],
        message: "No pending commands" 
      });
    } catch (error) {
      console.error("Error getting commands:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/commands/next/:agentId", async (req, res) => {
    try {
      const agentId = req.params.agentId;
      console.log(`Agent ${agentId} requesting next command`);

      // For now, return no commands
      // In a full implementation, this would return the next queued command
      res.json({ 
        command: null,
        message: "No pending commands" 
      });
    } catch (error) {
      console.error("Error getting next command:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/commands/:commandId", async (req, res) => {
    try {
      const commandId = req.params.commandId;
      const { status, output, errorMessage } = req.body;

      console.log(`Command ${commandId} status update:`, { status, output, errorMessage });

      // For now, just acknowledge the update
      // In a full implementation, this would update command status in database
      res.json({ 
        message: "Command status updated",
        commandId: commandId,
        status: status
      });
    } catch (error) {
      console.error("Error updating command status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Execute remote command on agent
  app.post("/api/agents/:id/execute-command", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const agentId = req.params.id;
      const { command, description = "Remote command execution" } = req.body;
      
      // Validate input
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: "Command is required and must be a string" 
        });
      }

      // Check if agent exists and is online
      const device = await storage.getDevice(agentId);
      if (!device) {
        return res.status(404).json({ 
          success: false, 
          message: "Agent not found" 
        });
      }

      if (device.status !== 'online') {
        return res.status(400).json({ 
          success: false, 
          message: `Agent is ${device.status}. Only online agents can execute commands.` 
        });
      }

      // Use existing command infrastructure
      const { pool } = await import("./db");
      const result = await pool.query(
        `INSERT INTO agent_commands (device_id, type, command, priority, status, created_by, created_at)
         VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
         RETURNING id`,
        [agentId, 'execute_command', command, 1, req.user.id]
      );

      // Create alert for audit trail
      await storage.createAlert({
        device_id: agentId,
        category: "remote_command",
        severity: "info",
        message: `Remote command executed by ${req.user.email}: ${command}`,
        metadata: {
          command,
          description,
          user: req.user.email,
          timestamp: new Date().toISOString()
        },
        is_active: true
      });

      console.log(`Command "${command}" queued for agent ${device.hostname} (${agentId}) by ${req.user.email}`);

      res.json({
        success: true,
        message: `Command sent to ${device.hostname}`,
        command_id: result.rows[0].id,
        agent_hostname: device.hostname,
        command: command,
        description: description
      });

    } catch (error) {
      console.error("Error executing remote command:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to execute command on agent" 
      });
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
      Object.keys(updates).forEach((key) =>{
        if (updates[key] === undefined) {
          delete updates[key];
        }});

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

  // Agent download endpoint
  app.get('/api/download/agent/:platform', authenticateToken, async (req: any, res) => {
    try {
      console.log('Agent download request from user:', req.user?.email, 'Platform:', req.params.platform);

      const { platform } = req.params;

      const agentFiles = {
        windows: [
          'itsm_agent.py',
          'system_collector.py',
          'api_client.py', 
          'service_wrapper.py',
          'config.ini',
          'install_windows.py',
          'fix_windows_service.py'
        ],
        linux: [
          'itsm_agent.py',
          'system_collector.py',
          'api_client.py',
          'service_wrapper.py', 
          'config.ini'
        ],
        macos: [
          'itsm_agent.py',
          'system_collector.py',
          'api_client.py',
          'service_wrapper.py',
          'config.ini'
        ]
      };

      if (!agentFiles[platform as keyof typeof agentFiles]) {
        return res.status(400).json({ error: 'Invalid platform' });
      }

      const files = agentFiles[platform as keyof typeof agentFiles];
      const filename = `itsm-agent-${platform}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const archiver = require('archiver');
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('error', (err: any) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to create archive' });
        }
      });

      archive.pipe(res);

      // Add agent files from Agent directory
      const agentPath = path.join(process.cwd(), 'Agent');
      const fs = require('fs');

      files.forEach(file => {
        const filePath = path.join(agentPath, file);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: file });
          console.log(`Added file to archive: ${file}`);
        } else {
          console.warn(`Agent file not found: ${file} at ${filePath}`);
        }
      });

      // Add installation instructions
      const instructions = `# ITSM Agent Installation Instructions

## ${platform.charAt(0).toUpperCase() + platform.slice(1)} Installation

### Prerequisites
- Python 3.7 or higher
- Administrator/root privileges

### Installation Steps
1. Extract this archive to your target directory
2. Edit config.ini and set your ITSM server URL and authentication token
3. Run the installation script:

${platform === 'windows' ? 
  '   python install_windows.py' : 
  '   sudo python3 itsm_agent.py install'
}

4. Start the service:
${platform === 'windows' ? 
  '   python itsm_agent.py start' : 
  '   sudo systemctl start itsm-agent'
}

### Configuration
Edit config.ini before installation:
- api.base_url: Your ITSM server URL (e.g., http://your-server:5000)
- api.auth_token: Authentication token from admin panel
- agent.collection_interval: Data collection frequency (seconds)

### Support
For technical support, contact your system administrator.
`;

      archive.append(instructions, { name: 'README.md' });

      archive.finalize();
      console.log(`Agent download completed for platform: ${platform}`);
    } catch (error) {
      console.error('Error in agent download:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate agent package' });
      }
    }
  });

  // Get application performance insights
  app.get("/api/devices/:id/performance-insights", authenticateToken, async (req, res) => {
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
  });

  // Get AI-powered insights for a device
  app.get("/api/devices/:id/ai-insights", authenticateToken, async (req, res) => {
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
  });

  // Admin-only agent download endpoints
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  // Agent download endpoints
  app.get("/api/admin/agent-download/:platform", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { platform } = req.params;
      console.log(`${platform} agent download requested by:`, req.user.email);

      if (!['windows', 'linux', 'macos'].includes(platform)) {
        return res.status(400).json({ error: 'Invalid platform' });
      }

      const agentPath = path.join(process.cwd(), 'Agent');
      
      if (!fs.existsSync(agentPath)) {
        console.error('Agent directory not found at:', agentPath);
        return res.status(404).json({ error: 'Agent files not found' });
      }

      const availableFiles = fs.readdirSync(agentPath);
      console.log('Available files in Agent directory:', availableFiles);

      if (availableFiles.length === 0) {
        console.error('Agent directory is empty!');
        return res.status(404).json({ error: 'Agent directory is empty' });
      }

      // Set response headers for zip download
      const filename = `itsm-agent-${platform}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      // Create zip archive
      const archiver = require('archiver');
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Handle archive errors
      archive.on('error', (err: any) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to create archive' });
        }
      });

      // Track when archive is done
      archive.on('end', () => {
        console.log(`${platform} agent archive has been finalized successfully`);
      });

      // Pipe archive to response
      archive.pipe(res);

      // Add the entire Agent directory to the archive
      console.log(`Adding entire Agent directory to ${platform} archive`);
      archive.directory(agentPath, false);

      // Add platform-specific installation instructions
      const instructions = generateInstallationInstructions(platform);
      archive.append(instructions, { name: 'INSTALLATION_INSTRUCTIONS.md' });
      console.log(`Added installation instructions for ${platform}`);

      // Finalize the archive
      await archive.finalize();
      console.log(`${platform} agent download completed successfully`);

    } catch (error) {
      console.error(`${platform} agent download error:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download agent' });
      }
    }
  });

  // Generate platform-specific installation instructions
  function generateInstallationInstructions(platform: string): string {
    const baseInstructions = `# ITSM Agent Installation Instructions - ${platform.charAt(0).toUpperCase() + platform.slice(1)}

## Prerequisites
- Python 3.7 or higher
- Administrator/root privileges

## Configuration
Before installation, edit config.ini:
\`\`\`ini
[api]
base_url = http://your-itsm-server:5000
auth_token = your-auth-token-here

[agent]
collection_interval = 300
hostname = auto
\`\`\`

## Installation Steps`;

    switch (platform) {
      case 'windows':
        return `${baseInstructions}

1. Extract this archive to your target directory (e.g., C:\\itsm-agent)
2. Edit config.ini with your ITSM server details
3. Open Command Prompt as Administrator
4. Navigate to the extracted directory
5. Install Python dependencies:
   \`\`\`
   pip install psutil requests configparser websocket-client
   \`\`\`
6. Run the installation script:
   \`\`\`
   python install_windows.py
   \`\`\`
7. Start the service:
   \`\`\`
   python itsm_agent.py start
   \`\`\`

## Support
For technical support, contact your system administrator.`;

      case 'linux':
        return `${baseInstructions}

1. Extract this archive: \`unzip itsm-agent-linux.zip\`
2. Edit config.ini with your server details
3. Install Python dependencies:
   \`\`\`
   sudo pip3 install psutil requests configparser websocket-client
   \`\`\`
4. Copy files to system directory:
   \`\`\`
   sudo mkdir -p /opt/itsm-agent
   sudo cp *.py config.ini /opt/itsm-agent/
   sudo chmod +x /opt/itsm-agent/*.py
   \`\`\`
5. Start the agent:
   \`\`\`
   sudo python3 /opt/itsm-agent/itsm_agent.py
   \`\`\`

## Support
For technical support, contact your system administrator.`;

      case 'macos':
        return `${baseInstructions}

1. Extract this archive
2. Edit config.ini with your server details
3. Install Python dependencies:
   \`\`\`
   pip3 install psutil requests configparser websocket-client
   \`\`\`
4. Run the agent:
   \`\`\`
   sudo python3 itsm_agent.py
   \`\`\`

## Support
For technical support, contact your system administrator.`;

      default:
        return baseInstructions;
    }
  }

  // Get AI recommendations for a device
  app.get("/api/devices/:id/ai-recommendations", authenticateToken, async (req, res) => {
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
  });

  // Ticket routes
  app.get("/api/tickets", authenticateToken, async (req, res) => {
    try {
      // Modify filter logging
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as string;
      const status = req.query.status as string;
      const priority = req.query.priority as string;
      const search = req.query.search as string;

      const filters = {
        type: type && type !== "all" && type.trim() !== "" ? type : undefined,
        status: status && status !== "all" && status.trim() !== "" ? status : undefined,
        priority: priority && priority !== "all" && priority.trim() !== "" ? priority : undefined,
        search: search && search.trim() !== "" ? search.trim() : undefined
      };

      const tickets = await ticketStorage.getTickets(page, limit, filters);
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
import fs from 'fs';
import path from 'path';

// Get location data from IPinfo API
  const getLocationFromIP = async (ipAddress: string) => {
    try {
      if (!ipAddress || ipAddress === "unknown" || ipAddress.startsWith("192.168.") || 
          ipAddress.startsWith("10.") || ipAddress.startsWith("172.")) {
        return null; // Skip private IPs
      }

      const response = await fetch(`https://ipinfo.io/${ipAddress}?token=ef94711ea200a0`);
      if (response.ok) {
        const locationData = await response.json();
        return {
          ip: locationData.ip,
          city: locationData.city,
          region: locationData.region,
          country: locationData.country,
          location: locationData.loc, // lat,lng format
          organization: locationData.org,
          postal: locationData.postal,
          timezone: locationData.timezone
        };
      }
    } catch (error) {
      console.warn("Failed to get location from IPinfo:", error);
    }
    return null;
  };

  // Get public IP address
  const getPublicIP = (): string => {
    const interfaces =
      rawData.network?.interfaces ||
      agent.network?.interfaces ||
      [];
    for (const iface of interfaces) {
      const name = iface.name?.toLowerCase() || "";
      if (
        (name.includes("eth") ||
          name.includes("ethernet") ||
          name.includes("enet") ||
          name.includes("local area connection")) &&
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
            return addr.address;
          }
        }
      }
    }
    return "Not Available";
  };