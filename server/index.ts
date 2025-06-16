import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { userRoutes } from "./user-routes";
import { setupVite, serveStatic, log } from "./vite";
import { createTicketTables } from "./migrate-tickets";
import analyticsRoutes from "./analytics-routes";

const app = express();
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
    await createTicketTables();

    // Import and run admin tables migration
    const { createAdminTables } = await import("./migrate-admin-tables");
    await createAdminTables();

    const server = await registerRoutes(app);

    // Register SLA routes
    const { registerSLARoutes } = await import("./sla-routes");
    registerSLARoutes(app);

    // Register enhanced user routes
    app.use("/api/users", userRoutes);

    // Register analytics routes
    const analyticsRoutes = await import("./analytics-routes");
    app.use("/api/analytics", analyticsRoutes.default);

    // Import storage after it's available
    const { storage } = await import("./storage");

    // Initialize reports table
    const { reportsStorage } = await import("./reports-storage");
    await reportsStorage.createReportsTable();

    // Auth middleware
    const authenticateToken = async (req: any, res: any, next: any) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'Access token required' });
      }

      try {
        const jwt = await import("jsonwebtoken");
        const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
        const decoded: any = jwt.default.verify(token, JWT_SECRET);
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

    // Knowledge Base Routes (publicly accessible)
    app.get("/api/knowledge-base", async (req, res) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const filters = {
          category: req.query.category as string,
          search: req.query.search as string,
          status: (req.query.status as string) || "published"
        };

        const result = await storage.getKBArticles(page, limit, filters);
        res.json(result.data);
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
          search: req.query.search as string
        };

        const { ticketStorage } = await import("./ticket-storage");
        const result = await ticketStorage.getTickets(page, limit, filters);
        res.json(result);
      } catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.get("/api/tickets/:id", async (req, res) => {
      try {
        const { ticketStorage } = await import("./ticket-storage");
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
        const { ticketStorage } = await import("./ticket-storage");
        const ticket = await ticketStorage.createTicket(req.body);
        res.status(201).json(ticket);
      } catch (error) {
        console.error("Error creating ticket:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.put("/api/tickets/:id", async (req, res) => {
      try {
        const { ticketStorage } = await import("./ticket-storage");
        const ticket = await ticketStorage.updateTicket(req.params.id, req.body);
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
        const { ticketStorage } = await import("./ticket-storage");
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

    // Health check
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date() });
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
    const serv = app.listen(PORT, '0.0.0.0', () => {
      log(`serving on port ${PORT}`);
      console.log(`🌐 Server accessible at http://0.0.0.0:${PORT}`);
    });

    // CORS middleware for development
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Handle WebSocket upgrade requests properly - but only for non-Vite paths
    serv.on('upgrade', (request, socket, head) => {
      const url = request.url;
      const origin = request.headers.origin;

      // Let Vite handle its own WebSocket connections for HMR
      if (url && (url.includes('vite') || url.includes('hmr') || request.headers['sec-websocket-protocol']?.includes('vite'))) {
        // Don't handle Vite WebSocket connections here
        return;
      }

      const wsKey = request.headers['sec-websocket-key'];
      console.log('WebSocket upgrade request from:', origin, 'URL:', url);

      if (wsKey) {
        // Proper WebSocket handshake for application WebSockets
        const crypto = require('crypto');
        const acceptKey = crypto
          .createHash('sha1')
          .update(wsKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
          .digest('base64');

        socket.write(
          'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          'Sec-WebSocket-Accept: ' + acceptKey + '\r\n' +
          'Access-Control-Allow-Origin: *\r\n' +
          '\r\n'
        );
      } else {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
      }
    });

    console.log("✅ Server started successfully on port", port);
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
})().catch(error => {
  console.error("❌ Unhandled server error:", error);
  process.exit(1);
});