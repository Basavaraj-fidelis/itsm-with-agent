
import { db } from "../db";
import { tickets } from "@shared/ticket-schema";
import { eq } from "drizzle-orm";

interface WorkflowStep {
  id: number;
  name: string;
  status: string;
  assignee: string;
  timeframe?: string;
  completed_at?: Date;
  duration_minutes?: number;
}

interface WorkflowDefinition {
  type: string;
  steps: WorkflowStep[];
}

export class WorkflowService {
  private static workflowDefinitions: Record<string, WorkflowStep[]> = {
    request: [
      { id: 1, name: "Request Submitted", status: "new", assignee: "User" },
      { id: 2, name: "Initial Review", status: "assigned", assignee: "Service Desk", timeframe: "1 hour" },
      { id: 3, name: "Approval Process", status: "pending", assignee: "Manager", timeframe: "4 hours" },
      { id: 4, name: "Fulfillment", status: "in_progress", assignee: "IT Team", timeframe: "1-3 days" },
      { id: 5, name: "Verification", status: "pending", assignee: "User", timeframe: "1 day" },
      { id: 6, name: "Closure", status: "resolved", assignee: "Service Desk" }
    ],
    incident: [
      { id: 1, name: "Incident Reported", status: "new", assignee: "User" },
      { id: 2, name: "Initial Assessment", status: "assigned", assignee: "Service Desk", timeframe: "15 minutes" },
      { id: 3, name: "Investigation", status: "in_progress", assignee: "L2 Support", timeframe: "1 hour" },
      { id: 4, name: "Resolution", status: "in_progress", assignee: "Technical Team", timeframe: "2-4 hours" },
      { id: 5, name: "Verification", status: "pending", assignee: "Service Desk", timeframe: "30 minutes" },
      { id: 6, name: "Closure", status: "resolved", assignee: "Service Desk" }
    ]
  };

  static async getWorkflowForTicket(ticketId: string): Promise<WorkflowStep[]> {
    try {
      // Add connection check and retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const [ticket] = await db
            .select()
            .from(tickets)
            .where(eq(tickets.id, ticketId))
            .limit(1);

          if (!ticket) {
            throw new Error("Ticket not found");
          }

          const workflowSteps = this.workflowDefinitions[ticket.type] || [];
          return this.enrichWorkflowWithProgress(workflowSteps, ticket);
        } catch (dbError) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw dbError;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      throw new Error("Max retries exceeded");
    } catch (error) {
      console.error("Error getting workflow for ticket:", error);
      
      // Provide fallback workflow if database fails
      if (error instanceof Error && error.message.includes('database')) {
        console.warn("Database unavailable, providing fallback workflow");
        return this.workflowDefinitions['incident'] || [];
      }
      
      throw error;
    }
  }

  private static enrichWorkflowWithProgress(steps: WorkflowStep[], ticket: any): WorkflowStep[] {
    const currentStatusIndex = steps.findIndex(step => step.status === ticket.status);
    
    return steps.map((step, index) => ({
      ...step,
      completed_at: index <= currentStatusIndex ? new Date() : undefined,
      duration_minutes: index <= currentStatusIndex ? this.calculateStepDuration(step) : undefined
    }));
  }

  private static calculateStepDuration(step: WorkflowStep): number {
    // Mock calculation - in real implementation, track actual durations
    return Math.floor(Math.random() * 60) + 10;
  }

  static async advanceWorkflow(ticketId: string, newStatus: string, assignedTo?: string): Promise<void> {
    try {
      const updateData: any = { status: newStatus, updated_at: new Date() };
      
      if (assignedTo) {
        updateData.assigned_to = assignedTo;
      }

      await db
        .update(tickets)
        .set(updateData)
        .where(eq(tickets.id, ticketId));

      // Get updated ticket for real-time notification
      const [updatedTicket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketId))
        .limit(1);

      // Broadcast workflow update to connected clients
      if (updatedTicket) {
        this.broadcastWorkflowUpdate(updatedTicket);
      }

      console.log(`Workflow advanced for ticket ${ticketId} to status: ${newStatus}`);
    } catch (error) {
      console.error("Error advancing workflow:", error);
      throw error;
    }
  }

  private static broadcastWorkflowUpdate(ticket: any): void {
    try {
      // Import WebSocket service if available
      const { broadcastToChannel } = require('../websocket-service');
      
      broadcastToChannel('workflow-updates', {
        type: 'workflow-progress',
        ticket: {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          type: ticket.type,
          status: ticket.status,
          assigned_to: ticket.assigned_to,
          updated_at: ticket.updated_at,
          priority: ticket.priority
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Fail silently if WebSocket service not available
      console.warn('WebSocket service not available for workflow broadcast:', error.message);
    }
  }
}

export const workflowService = new WorkflowService();
