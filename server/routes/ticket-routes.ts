import type { Express } from "express";
import { ticketStorage } from "../services/ticket-storage";
import { z } from "zod";

const createTicketSchema = z.object({
  type: z.enum(["request", "incident", "problem", "change"]),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  requester_email: z.string().email(),
  category: z.string().optional(),
  assigned_to: z.string().optional(),
  impact: z.enum(["low", "medium", "high", "critical"]).optional(),
  urgency: z.enum(["low", "medium", "high", "critical"]).optional(),
  due_date: z.string().datetime().optional()
});

const updateTicketSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["new", "assigned", "in_progress", "pending", "resolved", "closed", "cancelled"]).optional(),
  assigned_to: z.string().email().optional(),
  category: z.string().optional(),
  impact: z.enum(["low", "medium", "high", "critical"]).optional(),
  urgency: z.enum(["low", "medium", "high", "critical"]).optional(),
  due_date: z.string().datetime().optional(),
  comment: z.string().optional() // Required for certain status changes
});

export function registerTicketRoutes(app: Express) {
  // Get all tickets with pagination and filters
  app.get("/api/tickets", async (req, res) => {
    try {
      console.log("GET /api/tickets - Request received");
      console.log("Query parameters:", req.query);
      
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

      console.log("Applied filters:", filters);

      const result = await ticketStorage.getTickets(page, limit, filters);
      console.log("Tickets fetched successfully:", result.total, "total tickets");
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      if (error instanceof Error) {
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          res.status(500).json({ error: "Database schema error. Please run migrations." });
        } else {
          res.status(500).json({ error: error.message });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch tickets" });
      }
    }
  });

  // Get ticket by ID
  app.get("/api/tickets/:id", async (req, res) => {
    try {
      const ticket = await ticketStorage.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  // Create new ticket
  app.post("/api/tickets", async (req, res) => {
    try {
      const validatedData = createTicketSchema.parse(req.body);
      const ticket = await ticketStorage.createTicket(validatedData);
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error creating ticket:", error);
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  // Update ticket
  app.put("/api/tickets/:id", async (req, res) => {
    try {
      const validatedData = updateTicketSchema.parse(req.body);
      const { comment, ...ticketUpdates } = validatedData;
      const userEmail = req.headers['user-email'] as string || 'admin@company.com';
      
      const ticket = await ticketStorage.updateTicket(
        req.params.id, 
        ticketUpdates, 
        userEmail,
        comment
      );
      
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      if (error instanceof Error && error.message.includes('Comment required')) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Error updating ticket:", error);
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  // Delete ticket
  app.delete("/api/tickets/:id", async (req, res) => {
    try {
      const success = await ticketStorage.deleteTicket(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json({ message: "Ticket deleted successfully" });
    } catch (error) {
      console.error("Error deleting ticket:", error);
      res.status(500).json({ error: "Failed to delete ticket" });
    }
  });

  // Add comment to ticket
  app.post("/api/tickets/:id/comments", async (req, res) => {
    try {
      const { comment, author_email, is_internal } = req.body;
      if (!comment || !author_email) {
        return res.status(400).json({ error: "Comment and author_email are required" });
      }

      const ticketComment = await ticketStorage.addComment(req.params.id, {
        comment,
        author_email,
        is_internal: is_internal || false
      });

      res.status(201).json(ticketComment);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // Get ticket comments
  app.get("/api/tickets/:id/comments", async (req, res) => {
    try {
      const comments = await ticketStorage.getTicketComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Export tickets as CSV
  app.get("/api/tickets/export/csv", async (req, res) => {
    try {
      const filters = {
        type: req.query.type as string,
        status: req.query.status as string,
        priority: req.query.priority as string,
        search: req.query.search as string
      };

      const csvData = await ticketStorage.exportTicketsCSV(filters);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="tickets.csv"');
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting tickets:", error);
      res.status(500).json({ error: "Failed to export tickets" });
    }
  });

  // Get available technicians for assignment
  app.get("/api/users/technicians", async (req, res) => {
    try {
      const { userStorage } = await import("../services/user-storage");
      const technicians = await userStorage.getActiveTechnicians();
      res.json(technicians);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ error: "Failed to fetch technicians" });
    }
  });
}
