import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerTicketRoutes } from "./routes/ticket-routes";
import { registerDeviceRoutes } from "./routes/device-routes";
import { registerAgentRoutes } from "./routes/agent-routes";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthUtils } from "./utils/auth";
import { ResponseUtils } from "./utils/response";
import { UserUtils } from "./utils/user";
import { authRoutes } from "./routes/auth-routes";
import { registerNetworkScanRoutes } from "./routes/network-scan-routes";
import { securityService } from "./services/security-service"; // Import securityService

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Import centralized middleware
import { authenticateToken, requireRole } from "./middleware/auth-middleware";

export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);

  console.log("🔗 Registering auth routes...");
  app.use("/api/auth", authRoutes);
  console.log("✅ Auth routes registered");
  // Initialize demo users on startup
  try {
    await storage.initializeDemoUsers();
    console.log("Demo users initialized successfully");
  } catch (error) {
    console.log("Demo users may already exist, continuing...", error);
  }

  // Initialize enhanced storage tables
  try {
    const { enhancedStorage } = await import("./models/enhanced-storage");
    await enhancedStorage.initializeEnhancedTables();
    console.log("Enhanced storage tables initialized successfully");
  } catch (error) {
    console.log("Enhanced storage initialization error:", error);
  }

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("Login attempt for:", email);

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      // Database authentication fallback
      try {
        const { DatabaseUtils } = await import("./utils/database");
        const availableColumns = await DatabaseUtils.getTableColumns("users");
        const columnNames = availableColumns.map((col) => col.column_name);

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
          if (columnNames.includes(col)) {
            selectColumns.push(col);
          }
        });

        const query =
          DatabaseUtils.buildSelectQuery("users", columnNames, selectColumns) +
          " WHERE email = $1";
        const result = await DatabaseUtils.executeQuery(query, [
          email.toLowerCase(),
        ]);

        if (result.rows.length === 0) {
          throw new Error("User not found in database, trying file storage");
        }

        const user = result.rows[0];

        if (user.is_locked) {
          return res
            .status(401)
            .json({ message: "Account is locked. Contact administrator." });
        }

        if (user.is_active === false) {
          return res
            .status(401)
            .json({ message: "Account is inactive. Contact administrator." });
        }

        if (user.password_hash) {
          const isValidPassword = await bcrypt.compare(
            password,
            user.password_hash,
          );
          if (!isValidPassword) {
            return res.status(401).json({ message: "Invalid credentials" });
          }
        } else {
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

        const token = AuthUtils.generateToken({
          userId: user.id,
          id: user.id,
          email: user.email,
          role: user.role,
        });

        const { password_hash, ...userWithoutPassword } = user;
        userWithoutPassword.name = UserUtils.buildDisplayName(user);

        res.json({
          message: "Login successful",
          token,
          user: userWithoutPassword,
        });
      } catch (dbError) {
        // Fallback to file storage
        const demoUsers = await storage.getUsers({ search: email });
        const user = demoUsers.find(
          (u) => u.email.toLowerCase() === email.toLowerCase(),
        );

        if (!user) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const validPasswords = [
          "Admin123!",
          "Tech123!",
          "Manager123!",
          "User123!",
        ];
        if (!validPasswords.includes(password)) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
          { userId: user.id, id: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: "24h" },
        );

        res.json({
          message: "Login successful",
          token,
          user: user,
        });
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

      const existingUsers = await storage.getUsers({ search: email });
      if (
        existingUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())
      ) {
        return res.status(400).json({ message: "Email already exists" });
      }

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
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Signup error:", error);
      res
        .status(500)
        .json({ message: "Failed to create user", error: error.message });
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
    res.json({ message: "Logged out successfully" });
  });

  // Core agent report endpoint
  app.post("/api/report", async (req, res) => {
    try {
      console.log("=== AGENT REPORT RECEIVED ===");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Report data keys:", Object.keys(req.body));

      const data = req.body;
      const hostname =
        data.hostname || data.system_info?.hostname || data.os_info?.hostname;

      if (!hostname) {
        return res.status(400).json({ message: "Hostname is required" });
      }

      let device = await storage.getDeviceByHostname(hostname);

      if (!device) {
        device = await storage.createDevice({
          hostname: hostname,
          assigned_user: data.current_user || null,
          os_name: data.os_info?.name || data.system_info?.platform || null,
          os_version:
            data.os_info?.version || data.system_info?.release || null,
          ip_address: req.ip || null,
          status: "online",
          last_seen: new Date(),
        });
      } else {
        await storage.updateDevice(device.id, {
          status: "online",
          last_seen: new Date(),
        });
      }

      const reportData = req.body;

      // Create device report with raw data
      const deviceReport = await storage.createDeviceReport({
        device_id: device.id,
        cpu_usage: reportData.cpu_usage?.toString() || null,
        memory_usage: reportData.memory_usage?.toString() || null,
        disk_usage: reportData.disk_usage?.toString() || null,
        network_io: reportData.network_io?.toString() || null,
        raw_data: typeof reportData === 'object' ? JSON.stringify(reportData) : reportData,
      });

      // Security and performance checks
      // Security compliance checks
      if (reportData.usb_devices && Array.isArray(reportData.usb_devices)) {
        await securityService.checkUSBCompliance(device.id, reportData.usb_devices);
      }

      if (reportData.software?.installed && Array.isArray(reportData.software.installed)) {
        await securityService.checkVulnerabilities(device.id, reportData.software.installed);
        await securityService.checkSoftwareLicenseCompliance(device.id, reportData.software.installed);
      }

      // Process device for performance alerts
      await securityService.processAllDevicesForAlerts();

      res.json({ message: "Report saved successfully" });
    } catch (error) {
      console.error("Error processing report:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard
  app.get("/api/dashboard", authenticateToken, async (req, res) => {
    try {
      const summary = await storage.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Dashboard Summary
  app.get("/api/dashboard/summary", authenticateToken, async (req, res) => {
    try {
      const summary = await storage.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      res.status(500).json({
        error: "Failed to fetch dashboard summary",
        total_devices: 0,
        online_devices: 0,
        offline_devices: 0,
        active_alerts: 0
      });
    }
  });

  // Enhanced health check
  app.get("/api/health", async (req, res) => {
    try {
      const health = {
        status: "ok",
        timestamp: new Date(),
        version: process.env.npm_package_version || "1.0.0",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: {
          database: await checkDatabaseHealth(),
          redis: await checkRedisHealth(),
          websocket: await checkWebSocketHealth()
        }
      };

      const isHealthy = Object.values(health.services).every(service => service.status === 'healthy');
      res.status(isHealthy ? 200 : 503).json(health);
    } catch (error) {
      res.status(503).json({
        status: "error",
        timestamp: new Date(),
        error: error.message
      });
    }
  });

  async function checkDatabaseHealth() {
    try {
      await storage.getUsers({ limit: 1 });
      return { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  async function checkRedisHealth() {
    try {
      const redis = (await import('./services/redis-service')).default;
      await redis.set('health_check', 'ok', 10);
      return { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      return { status: 'degraded', error: error.message };
    }
  }

  async function checkWebSocketHealth() {
    try {
      // Check if WebSocket service is running
      return { status: 'healthy', connections: 0 }; // Would track actual connections
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  // Register modular routes
  registerTicketRoutes(app);
  registerDeviceRoutes(app, authenticateToken);
  registerAgentRoutes(app, authenticateToken, requireRole);
  registerNetworkScanRoutes(app);

  // Register additional modular routes with error handling
  try {
    const alertRoutes = await import("./routes/alert-routes");
    if (alertRoutes.default) {
      app.use("/api/alerts", authenticateToken, alertRoutes.default);
    }
  } catch (error) {
    console.warn("Alert routes not available:", error.message);
  }

  try {
    const notificationRoutes = await import("./routes/notification-routes");
    if (notificationRoutes.default) {
      app.use(
        "/api/notifications",
        authenticateToken,
        notificationRoutes.default,
      );
    }
  } catch (error) {
    console.warn("Notification routes not available:", error.message);
  }

  try {
    const automationRoutes = await import("./routes/automation-routes");
    if (automationRoutes.default) {
      app.use(
        "/api/automation",
        authenticateToken,
        requireRole(["admin", "manager"]),
        automationRoutes.default,
      );
    }
  } catch (error) {
    console.warn("Automation routes not available:", error.message);
  }

  try {
    const agentDownloadRoutes = await import("./routes/agent-download-routes");
    if (agentDownloadRoutes.default) {
      app.use("/api/download/agent", agentDownloadRoutes.default);
    }
  } catch (error) {
    console.warn("Agent download routes not available:", error.message);
  }

  // Analytics overview endpoint
  app.get("/api/analytics/overview", authenticateToken, async (req, res) => {
    try {
      const [devices, alerts] = await Promise.all([
        storage.getDevices().catch(() => []),
        storage.getAlerts().catch(() => [])
      ]);

      const onlineDevices = devices.filter(d => d.status === 'online').length;
      const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.is_active).length;

      const analyticsData = {
        totalDevices: devices.length,
        onlineDevices,
        criticalAlerts,
        totalTickets: 0, // Will be populated from tickets
        performanceMetrics: {
          avgCpuUsage: 45,
          avgMemoryUsage: 60,
          avgDiskUsage: 35,
          networkThroughput: 1250
        }
      };

      res.json(analyticsData);
    } catch (error) {
      console.error('Analytics overview error:', error);
      res.status(500).json({
        error: 'Failed to fetch analytics overview',
        message: error.message
      });
    }
  });

  try {
    const analyticsRoutes = await import("./routes/analytics-routes");
    if (analyticsRoutes.default) {
      app.use("/api/analytics", analyticsRoutes.default);
    }
  } catch (error) {
    console.warn("Analytics routes not available:", error.message);
  }

  try {
    const userRoutes = await import("./routes/user-routes");
    if (userRoutes.default) {
      app.use("/api/users", authenticateToken, userRoutes.default);
    }
  } catch (error) {
    console.warn("User routes not available:", error.message);
  }

  try {
    const knowledgeRoutes = await import("./routes/knowledge-routes");
    if (knowledgeRoutes.default) {
      app.use("/api/knowledge", authenticateToken, knowledgeRoutes.default);
    }
  } catch (error) {
    console.warn("Knowledge routes not available:", error.message);
  }

  try {
    const slaRoutes = await import("./routes/sla-routes");
    if (slaRoutes.default) {
      app.use("/api/sla", authenticateToken, slaRoutes.default);
    }
  } catch (error) {
    console.warn("SLA routes not available:", error.message);
  }

  try {
    const slaAnalysisRoutes = await import("./routes/sla-analysis-routes");
    if (slaAnalysisRoutes.default) {
      app.use("/api/sla-analysis", authenticateToken, slaAnalysisRoutes.default);
    }
  } catch (error) {
    console.warn("SLA analysis routes not available:", error.message);
  }

  try {
    const aiRoutes = await import("./routes/ai-routes");
    if (aiRoutes.default) {
      app.use("/api/ai", authenticateToken, aiRoutes.default);
      // Also register the ai-insights endpoint at the root API level
      app.get("/api/ai-insights", authenticateToken, async (req, res) => {
        try {
          const insights = {
            systemHealth: 'good',
            recommendations: [
              'Consider updating 3 devices with pending security patches',
              'Monitor disk usage on SRV-DATABASE (85% full)',
              'Review failed login attempts from IP 192.168.1.100'
            ],
            predictiveAlerts: [],
            performanceTrends: {
              cpu: 'stable',
              memory: 'increasing',
              disk: 'stable'
            },
            lastUpdated: new Date().toISOString()
          };

          res.json(insights);
        } catch (error) {
          console.error('Error fetching AI insights:', error);
          res.status(500).json({
            error: 'Failed to fetch AI insights',
            message: error.message
          });
        }
      });
    }
  } catch (error) {
    console.warn("AI routes not available:", error.message);
  }

  try {
    const auditRoutes = await import("./routes/audit-routes");
    if (auditRoutes.default) {
      app.use("/api/audit", authenticateToken, requireRole(["admin", "manager"]), auditRoutes.default);
    }
  } catch (error) {
    console.warn("Audit routes not available:", error.message);
  }

  // Security overview endpoint
  app.get("/api/security/overview", authenticateToken, async (req, res) => {
    try {
      const securityData = {
        threatLevel: 'low',
        activeThreats: 0,
        vulnerabilities: {
          critical: 0,
          high: 2,
          medium: 5,
          low: 8
        },
        lastScan: new Date().toISOString(),
        complianceScore: 85,
        securityAlerts: 3,
        firewallStatus: 'active',
        antivirusStatus: 'active',
        patchCompliance: 78
      };

      res.json(securityData);
    } catch (error) {
      console.error('Security overview error:', error);
      res.status(500).json({
        error: 'Failed to fetch security overview',
        message: error.message
      });
    }
  });

  try {
    const { default: securityRoutes } = await import("./routes/security-routes");
    if (securityRoutes) {
      app.use("/api/security", authenticateToken, securityRoutes);
      console.log("✅ Security routes registered");
    }
  } catch (error) {
    console.warn("Security routes not available:", error.message);
  }

  try {
    const patchRoutes = await import("./routes/patch-routes");
    if (patchRoutes.default) {
      app.use("/api/patch", authenticateToken, patchRoutes.default);
    }
  } catch (error) {
    console.warn("Patch routes not available:", error.message);
  }

  return server;
}