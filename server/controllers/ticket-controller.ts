
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
      console.log("Creating ticket with data:", req.body);
      const ticket = await ticketStorage.createTicket(req.body);
      console.log("Ticket created successfully:", ticket.ticket_number);
      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      // Return more specific error message
      const errorMessage = error instanceof Error ? error.message : "Failed to create ticket";
      res.status(400).json({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : error 
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
