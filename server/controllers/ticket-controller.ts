
import { ticketStorage } from "../services/ticket-storage";
import { ResponseUtils } from "../utils/response";

export class TicketController {
  static async getTickets(req: any, res: any) {
    try {
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
      
      // Enhanced error handling for database issues
      if (error instanceof Error) {
        if (error.message.includes('database') || error.message.includes('connection')) {
          return res.status(503).json({
            error: "Database connection error",
            message: "Unable to connect to database. Please try again later.",
            retry: true
          });
        }
        
        if (error.message.includes('timeout')) {
          return res.status(504).json({
            error: "Request timeout",
            message: "Database query timed out. Please try again.",
            retry: true
          });
        }
      }
      
      ResponseUtils.internalServerError(res, "Internal server error");
    }
  }

  static async getTicket(req: any, res: any) {
    try {
      const ticket = await ticketStorage.getTicketById(req.params.id);
      if (!ticket) {
        return ResponseUtils.notFound(res, "Ticket not found");
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      ResponseUtils.internalServerError(res, "Internal server error");
    }
  }

  static async createTicket(req: any, res: any) {
    try {
      // Validate required fields
      const { type, title, description, requester_email } = req.body;
      
      if (!type || !title || !description || !requester_email) {
        return res.status(400).json({
          error: "Missing required fields",
          required: ["type", "title", "description", "requester_email"],
          received: Object.keys(req.body)
        });
      }

      console.log("Creating ticket with data:", req.body);
      const ticket = await ticketStorage.createTicket(req.body);
      console.log("Ticket created successfully:", ticket.ticket_number);
      
      // Send success response with additional metadata
      res.status(201).json({
        ...ticket,
        _metadata: {
          created_at: new Date().toISOString(),
          created_by: req.headers['user-email'] || 'system'
        }
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      
      // Enhanced error response
      if (error instanceof Error) {
        if (error.message.includes('duplicate')) {
          return res.status(409).json({
            error: "Duplicate ticket detected",
            message: error.message
          });
        }
        
        if (error.message.includes('validation')) {
          return res.status(400).json({
            error: "Validation failed",
            message: error.message
          });
        }
      }
      
      res.status(500).json({ 
        error: "Internal server error",
        message: "Failed to create ticket. Please try again."
      });
    }
  }

  static async updateTicket(req: any, res: any) {
    try {
      const ticket = await ticketStorage.updateTicket(
        req.params.id,
        req.body,
      );
      if (!ticket) {
        return ResponseUtils.notFound(res, "Ticket not found");
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket:", error);
      ResponseUtils.internalServerError(res, "Internal server error");
    }
  }

  static async deleteTicket(req: any, res: any) {
    try {
      const success = await ticketStorage.deleteTicket(req.params.id);
      if (!success) {
        return ResponseUtils.notFound(res, "Ticket not found");
      }
      res.json({ message: "Ticket deleted successfully" });
    } catch (error) {
      console.error("Error deleting ticket:", error);
      ResponseUtils.internalServerError(res, "Internal server error");
    }
  }
}
