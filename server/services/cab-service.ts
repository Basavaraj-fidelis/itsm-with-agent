
import { db } from "../db";
import { changeAdvisoryBoard, ticketApprovals } from "@shared/change-management-schema";
import { tickets } from "@shared/ticket-schema";
import { eq, and, inArray } from "drizzle-orm";

export interface CABMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

export interface CABApprovalRequest {
  ticketId: string;
  changeType: string;
  priority: string;
  requestedBy: string;
  description: string;
  plannedDate?: string;
}

export class CABService {
  // Get all active CAB boards
  static async getCABBoards() {
    try {
      const boards = await db
        .select()
        .from(changeAdvisoryBoard)
        .where(eq(changeAdvisoryBoard.is_active, true));
      
      return boards;
    } catch (error) {
      console.error("Error fetching CAB boards:", error);
      throw error;
    }
  }

  // Create new CAB board
  static async createCABBoard(data: {
    name: string;
    description?: string;
    chairperson_id: string;
    members: string[];
    meeting_frequency?: string;
  }) {
    try {
      const [board] = await db
        .insert(changeAdvisoryBoard)
        .values(data)
        .returning();
      
      return board;
    } catch (error) {
      console.error("Error creating CAB board:", error);
      throw error;
    }
  }

  // Get pending change requests for CAB approval
  static async getPendingChanges(cabId?: string) {
    try {
      const pendingChanges = await db
        .select({
          id: tickets.id,
          ticket_number: tickets.ticket_number,
          title: tickets.title,
          description: tickets.description,
          change_type: tickets.change_type,
          priority: tickets.priority,
          risk_level: tickets.risk_level,
          requester_email: tickets.requester_email,
          created_at: tickets.created_at,
          planned_implementation_date: tickets.planned_implementation_date,
          approval_status: tickets.approval_status
        })
        .from(tickets)
        .where(
          and(
            eq(tickets.type, "change"),
            eq(tickets.approval_status, "pending")
          )
        );
      
      return pendingChanges;
    } catch (error) {
      console.error("Error fetching pending changes:", error);
      throw error;
    }
  }

  // Submit change for CAB approval
  static async submitForApproval(ticketId: string, cabId: string, submittedBy: string) {
    try {
      // Create approval record
      const [approval] = await db
        .insert(ticketApprovals)
        .values({
          ticket_id: ticketId,
          approver_type: "cab",
          approver_id: cabId,
          status: "pending",
          submitted_by: submittedBy,
          submitted_at: new Date()
        })
        .returning();

      // Update ticket status to pending approval
      await db
        .update(tickets)
        .set({
          approval_status: "pending",
          status: "pending",
          updated_at: new Date()
        })
        .where(eq(tickets.id, ticketId));

      return approval;
    } catch (error) {
      console.error("Error submitting for approval:", error);
      throw error;
    }
  }

  // Approve/Reject change
  static async processApproval(
    ticketId: string, 
    approverId: string, 
    decision: "approved" | "rejected",
    comments?: string
  ) {
    try {
      // Update approval record
      await db
        .update(ticketApprovals)
        .set({
          status: decision,
          approved_by: approverId,
          approved_at: new Date(),
          comments: comments
        })
        .where(eq(ticketApprovals.ticket_id, ticketId));

      // Update ticket
      const newTicketStatus = decision === "approved" ? "approved" : "rejected";
      await db
        .update(tickets)
        .set({
          approval_status: decision,
          status: newTicketStatus,
          updated_at: new Date()
        })
        .where(eq(tickets.id, ticketId));

      // Get updated ticket for notification
      const [updatedTicket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketId))
        .limit(1);

      return updatedTicket;
    } catch (error) {
      console.error("Error processing approval:", error);
      throw error;
    }
  }

  // Get CAB approval history
  static async getApprovalHistory(ticketId: string) {
    try {
      const history = await db
        .select()
        .from(ticketApprovals)
        .where(eq(ticketApprovals.ticket_id, ticketId));
      
      return history;
    } catch (error) {
      console.error("Error fetching approval history:", error);
      throw error;
    }
  }

  // Auto-route change based on type
  static async autoRouteChange(ticketId: string) {
    try {
      const [ticket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketId))
        .limit(1);

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      // Routing logic based on change type
      switch (ticket.change_type) {
        case "standard":
          // Auto-approve standard changes
          await this.processApproval(ticketId, "system", "approved", "Auto-approved: Standard Change");
          break;
        
        case "normal":
          // Route to default CAB
          const [defaultCAB] = await db
            .select()
            .from(changeAdvisoryBoard)
            .where(eq(changeAdvisoryBoard.is_active, true))
            .limit(1);
          
          if (defaultCAB) {
            await this.submitForApproval(ticketId, defaultCAB.id, "system");
          }
          break;
        
        case "emergency":
          // Route to emergency approval (Change Manager)
          await this.submitForApproval(ticketId, "emergency-approval", "system");
          break;
        
        default:
          // Default to normal change process
          const [cab] = await db
            .select()
            .from(changeAdvisoryBoard)
            .where(eq(changeAdvisoryBoard.is_active, true))
            .limit(1);
          
          if (cab) {
            await this.submitForApproval(ticketId, cab.id, "system");
          }
      }

      return true;
    } catch (error) {
      console.error("Error auto-routing change:", error);
      throw error;
    }
  }
}

export const cabService = new CABService();
