import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createTicketTables } from "./migrate-tickets";

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
  // Run migrations on startup
  await createTicketTables();

  const server = await registerRoutes(app);

  // Import storage after it's available
  const { storage } = await import("./storage");

  // Import authentication middleware from routes
  const routesModule = await import("./routes");

  // Define authentication middleware locally since it's not exported from routes
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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();