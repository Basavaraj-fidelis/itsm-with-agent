import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { userRoutes } from "./routes/user-routes";
import { setupVite, serveStatic, log } from "./vite";
import { createTicketTables } from "./migrations/migrate-tickets";
import analyticsRoutes from "./routes/analytics-routes";
import { db, sql } from "./db";
import { knowledgeBase } from "@shared/ticket-schema";
import { eq, desc } from "drizzle-orm";
import { knowledgeRoutes } from "./routes/knowledge-routes";
// AD sync routes removed - no longer needed
import { initAIService } from './services/ai-service';
import { init as initSlaEscalationService } from './services/sla-escalation-service';
import { webSocketService } from './websocket-service';
import expressWs from "express-ws";
import cors from 'cors';
import { registerAgentRoutes } from "./routes/agent-routes";
import { registerAlertRoutes } from "./routes/alert-routes";
import { registerAnalyticsRoutes } from "./routes/analytics-routes";
import { registerSecurityRoutes } from "./routes/security-routes";
import { registerVNCRoutes } from "./routes/vnc-routes";
import { authenticateToken, requireRole } from "./middleware/auth-middleware";

const app = express();
const wsInstance = expressWs(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Run migrations on startup
    console.log("🚀 Starting server...");

    // Initialize database tables
    try {
      console.log("🔗 Testing database connection...");

      // Check if DATABASE_URL is properly set
      if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL environment variable is not set");
        console.log("💡 To fix this:");
        console.log("1. Open the Database tab in Replit");
        console.log("2. Click 'Create a database'");
        console.log("3. Choose PostgreSQL");
        console.log("4. The DATABASE_URL will be automatically set");
        process.exit(1);
      }

      if (process.env.DATABASE_URL.includes("base")) {
        console.error(
          "❌ Invalid DATABASE_URL detected - contains 'base' hostname",
        );
        console.log(
          "💡 This usually means the database URL is corrupted or incomplete",
        );
        console.log("🔧 Please check your database configuration in Replit");
        process.exit(1);
      }

      await db.execute(sql`SELECT 1`);
      console.log("✅ Database connection successful");

      await createTicketTables();
      console.log("✅ Database tables initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize database:", error);
      console.error("📋 Error details:", {
        code: error.code,
        message: error.message,
        hostname: error.hostname,
        hint:
          error.code === "ENOTFOUND"
            ? "Database hostname cannot be resolved. Please check your DATABASE_URL in Replit Database settings."
            : error.code === "SELF_SIGNED_CERT_IN_CHAIN"
              ? "SSL certificate issue - check database connection settings"
              : "Check database URL and credentials",
      });

      if (error.code === "ENOTFOUND") {
        console.log("🔧 To fix this issue:");
        console.log("1. Go to the Database tab in Replit");
        console.log(
          "2. Create a new PostgreSQL database if you don't have one",
        );
        console.log(
          "3. The DATABASE_URL environment variable will be automatically configured",
        );
        console.log("4. Restart your application");
      }

      process.exit(1);
    }

    // Import and run admin tables migration
    const { createAdminTables } = await import("./migrations/migrate-admin-tables");
    await createAdminTables();

    const server = await registerRoutes(app);

    // Register SLA routes
    const { registerSLARoutes } = await import("./routes/sla-routes");
    registerSLARoutes(app);

    // Register enhanced user routes
    app.use("/api/users", userRoutes);

    // Register VNC routes
    registerVNCRoutes(app, authenticateToken);

    // Register analytics routes
    const { default: analyticsRoutes } = await import("./routes/analytics-routes");
    app.use("/api/analytics", analyticsRoutes);

    // Register patch compliance routes
    const patchRoutes = await import("./routes/patch-routes");
    app.use("/api/patches", patchRoutes.default);

    // Import storage after it's available
    const { storage } = await import("./storage");

    // Initialize reports table
    const { reportsStorage } = await import("./models/reports-storage");
    await reportsStorage.createReportsTable();

    // Auth middleware is now imported from middleware/auth-middleware.ts

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

        console.log("KB API - Filters:", filters);

        // Get articles directly from database using the enhanced storage
        const articles = await db
          .select()
          .from(knowledgeBase)
          .where(eq(knowledgeBase.status, filters.status))
          .orderBy(desc(knowledgeBase.created_at));

        console.log(`KB API - Found ${articles.length} articles in database`);

        let filteredArticles = articles;

        // Apply search filter if provided
        if (filters.search) {
          const searchTerms = filters.search.toLowerCase().split(" ");
          filteredArticles = articles.filter((article) => {
            const titleText = article.title.toLowerCase();
            const contentText = article.content.toLowerCase();
            const categoryText = (article.category || "").toLowerCase();

            return searchTerms.some(
              (term) =>
                titleText.includes(term) ||
                contentText.includes(term) ||
                categoryText.includes(term),
            );
          });
        }

        // Apply category filter if provided
        if (filters.category && filters.category !== "all") {
          filteredArticles = filteredArticles.filter(
            (article) => article.category === filters.category,
          );
        }

        // Apply pagination
        const startIndex = (page - 1) * limit;
        const paginatedArticles = filteredArticles.slice(
          startIndex,
          startIndex + limit,
        );

        console.log(`KB API - Returning ${paginatedArticles.length} articles`);
        res.json(paginatedArticles);
      } catch (error) {
        console.error("Error fetching KB articles:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // User Management Routes
    // The original user routes have been removed, as the userRoutes middleware from user-routes.ts is now used.

    // Ticket Management Routes
    app.get("/api/tickets", async (req, res) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const filters = {
          type: req.query.type as string,
          status: req.query.status as string,
          priority: req.query.priority as string,
          search: req.query.search as string,
        };

        const { ticketStorage } = await import("./services/ticket-storage");
        const result = await ticketStorage.getTickets(page, limit, filters);
        res.json(result);
      } catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.get("/api/tickets/:id", async (req, res) => {
      try {
        const { ticketStorage } = await import("./services/ticket-storage");
        const ticket = await ticketStorage.getTicketById(req.params.id);
        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found" });
        }
        res.json(ticket);
      } catch (error) {
        console.error("Error fetching ticket:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.post("/api/tickets", async (req, res) => {
      try {
        const { ticketStorage } = await import("./services/ticket-storage");
        const ticket = await ticketStorage.createTicket(req.body);
        res.status(201).json(ticket);
      } catch (error) {
        console.error("Error creating ticket:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.put("/api/tickets/:id", async (req, res) => {
      try {
        const { ticketStorage } = await import("./services/ticket-storage");
        const ticket = await ticketStorage.updateTicket(
          req.params.id,
          req.body,
        );
        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found" });
        }
        res.json(ticket);
      } catch (error) {
        console.error("Error updating ticket:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.delete("/api/tickets/:id", async (req, res) => {
      try {
        const { ticketStorage } = await import("./services/ticket-storage");
        const success = await ticketStorage.deleteTicket(req.params.id);
        if (!success) {
          return res.status(404).json({ message: "Ticket not found" });
        }
        res.json({ message: "Ticket deleted successfully" });
      } catch (error) {
        console.error("Error deleting ticket:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Register knowledge base routes
    app.use("/api/knowledge", knowledgeRoutes);

    // Agent AD sync routes removed - no longer needed

    // Enhanced health check
    app.get("/api/health", async (req, res) => {
      try {
        // Test database connection
        await db.execute(sql`SELECT 1`);

        res.json({ 
          status: "ok", 
          timestamp: new Date(),
          database: "connected",
          server: "running"
        });
      } catch (error) {
        res.status(500).json({ 
          status: "error", 
          timestamp: new Date(),
          database: "disconnected",
          error: error.message
        });
      }
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    const PORT = process.env.PORT || port;

    // Start SLA monitoring service
    const { slaMonitorService } = await import("./services/sla-monitor-service");
    slaMonitorService.start(5); // Check every 5 minutes

    const serv = app.listen(PORT, "0.0.0.0", () => {
      log(`serving on port ${PORT}`);
      console.log(`🌐 Server accessible at http://0.0.0.0:${PORT}`);

      // Initialize WebSocket service
      webSocketService.init(serv);
    });

    // CORS middleware for development
    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Content-Length, X-Requested-With",
      );

      if (req.method === "OPTIONS") {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Handle WebSocket upgrade requests properly - but only for non-Vite paths
    serv.on("upgrade", (request, socket, head) => {
      const url = request.url;
      const origin = request.headers.origin;

      // Let Vite handle its own WebSocket connections for HMR
      if (
        url &&
        (url.includes("vite") ||
          url.includes("hmr") ||
          request.headers["sec-websocket-protocol"]?.includes("vite"))
      ) {
        // Don't handle Vite WebSocket connections here
        return;
      }

      const wsKey = request.headers["sec-websocket-key"];
      console.log("WebSocket upgrade request from:", origin, "URL:", url);

      if (wsKey) {
        // Proper WebSocket handshake for application WebSockets
        const crypto = require("crypto");
        const acceptKey = crypto
          .createHash("sha1")
          .update(wsKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
          .digest("base64");

        socket.write(
          "HTTP/1.1 101 Switching Protocols\r\n" +
            "Upgrade: websocket\r\n" +
            "Connection: Upgrade\r\n" +
            "Sec-WebSocket-Accept: " +
            acceptKey +
            "\r\n" +
            "Access-Control-Allow-Origin: *\r\n" +
            "\r\n",
        );
      } else {
        socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
        socket.destroy();
      }
    });

    console.log("✅ Server started successfully on port", port);
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
})().catch((error) => {
  console.error("❌ Unhandled server error:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

// // Start the server
// const PORT = process.env.PORT || 5000;
// // Start the server
// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`Server running on http://0.0.0.0:${PORT}`);
// });

// Start SLA escalation monitoring (check every 15 minutes)
import { slaEscalationService } from "./services/sla-escalation-service";

const startSLAMonitoring = () => {
  console.log("🔄 Starting SLA escalation monitoring...");

  // Run immediately on startup
  slaEscalationService.checkAndEscalateTickets().catch(console.error);

  // Then run every 15 minutes
  setInterval(
    () => {
      slaEscalationService.checkAndEscalateTickets().catch(console.error);
    },
    15 * 60 * 1000,
  ); // 15 minutes
};

// Start SLA monitoring after a short delay to ensure everything is initialized
setTimeout(startSLAMonitoring, 5000);

// Enable CORS for all routes
import cors from 'cors';
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow all Replit domains and localhost
    const allowedOrigins = [
      /\.replit\.dev$/,
      /\.replit\.app$/,
      /\.pike\.replit\.dev$/,  // Add pike domain
      /^https?:\/\/localhost/,
      /^https?:\/\/127\.0\.0\.1/,
      /^https?:\/\/0\.0\.0\.0/
    ];

    const isAllowed = allowedOrigins.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return origin === pattern;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Add specific CORS preflight handling for portal
app.options('/api/auth/portal-login', (req, res) => {
  console.log('🌐 CORS preflight for portal-login from:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.sendStatus(200);
});

// Add a simple test endpoint to verify connectivity
app.get('/api/auth/test', (req, res) => {
  console.log('🧪 Test endpoint hit from:', req.headers.origin);
  res.json({ message: 'API is reachable', timestamp: new Date().toISOString() });
});

// Dashboard summary endpoint
    app.get("/api/dashboard/summary", authenticateToken, async (req, res) => {
  try {
    console.log("Fetching dashboard summary for user:", req.user?.email);
    const summary = await storage.getDashboardSummary();
    console.log("Dashboard summary:", summary);
    res.json(summary);
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});

// Alert routes 
    const alertRoutes = express.Router();

    alertRoutes.get('/', (req, res) => {
      res.json({ message: 'Alerts endpoint' });
    });
    app.use("/api/alerts", authenticateToken, alertRoutes);
export default app;