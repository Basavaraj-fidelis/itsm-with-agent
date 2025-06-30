import { db } from "../db";
import { tickets } from "@shared/ticket-schema";
import { eq, and, not, inArray, lt, isNotNull } from "drizzle-orm";
import { notificationService } from "./notification-service";
import { emailService } from "./email-service";

export class SLAMonitorService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Start the SLA monitoring service
  start(intervalMinutes: number = 5): void {
    if (this.isRunning) {
      console.log("SLA Monitor is already running");
      return;
    }

    console.log(`🚀 Starting SLA Monitor Service (checking every ${intervalMinutes} minutes)`);
    this.isRunning = true;

    // Run immediately
    this.checkSLABreaches().catch(console.error);

    // Schedule recurring checks
    this.intervalId = setInterval(() => {
      this.checkSLABreaches().catch(console.error);
    }, intervalMinutes * 60 * 1000);
  }

  // Stop the SLA monitoring service
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("🛑 SLA Monitor Service stopped");
  }

  // Check for SLA breaches and update tickets
  async checkSLABreaches(): Promise<void> {
    try {
      console.log("🔍 Checking for SLA breaches...");
      const now = new Date();

      // Get all open tickets with SLA due dates
      const openTickets = await db
        .select()
        .from(tickets)
        .where(
          and(
            not(inArray(tickets.status, ['resolved', 'closed', 'cancelled'])),
            isNotNull(tickets.resolve_due_at)
          )
        );

      let responseBreaches = 0;
      let resolutionBreaches = 0;
      let updates = 0;

      for (const ticket of openTickets) {
        let needsUpdate = false;
        const updateData: any = {};

        // Check response SLA breach
        if (ticket.response_due_at && !ticket.first_response_at && !ticket.sla_response_breached) {
          if (now > new Date(ticket.response_due_at)) {
            updateData.sla_response_breached = true;
            needsUpdate = true;
            responseBreaches++;

            // Send response breach notification
            await this.sendSLABreachNotification(ticket, 'response');
          }
        }

        // Check resolution SLA breach
        if (ticket.resolve_due_at && !ticket.sla_resolution_breached) {
          if (now > new Date(ticket.resolve_due_at)) {
            updateData.sla_resolution_breached = true;
            updateData.sla_breached = true; // Legacy field
            needsUpdate = true;
            resolutionBreaches++;

            // Send resolution breach notification
            await this.sendSLABreachNotification(ticket, 'resolution');
          }
        }

        // Update ticket if needed
        if (needsUpdate) {
          updateData.updated_at = now;
          await db
            .update(tickets)
            .set(updateData)
            .where(eq(tickets.id, ticket.id));

          updates++;
          console.log(`⚠️  SLA breach detected for ticket ${ticket.ticket_number}`);
        }
      }

      if (updates > 0) {
        console.log(`📊 SLA Check Complete: ${updates} tickets updated, ${responseBreaches} response breaches, ${resolutionBreaches} resolution breaches`);
      } else {
        console.log("✅ SLA Check Complete: No breaches detected");
      }

    } catch (error) {
      console.error("❌ Error checking SLA breaches:", error);
    }
  }

  // Send SLA breach notification
  private async sendSLABreachNotification(ticket: any, breachType: 'response' | 'resolution'): Promise<void> {
    try {
      const title = `SLA ${breachType.toUpperCase()} Breach: ${ticket.ticket_number}`;
      const message = `Ticket ${ticket.ticket_number} has breached its ${breachType} SLA.

Title: ${ticket.title}
Priority: ${ticket.priority.toUpperCase()}
Status: ${ticket.status}
Assigned To: ${ticket.assigned_to || 'Unassigned'}
${breachType === 'response' ? 'Response' : 'Resolution'} Due: ${new Date(ticket[breachType === 'response' ? 'response_due_at' : 'resolve_due_at']).toLocaleString()}

Immediate attention required!`;

      // Notify assigned technician
      if (ticket.assigned_to) {
        await notificationService.createNotification({
          user_email: ticket.assigned_to,
          title,
          message,
          type: 'sla_breach',
          priority: 'critical',
          related_entity_type: 'ticket',
          related_entity_id: ticket.id
        });

        // Send email notification
        await emailService.sendSLABreachEmail(
          ticket.assigned_to,
          ticket,
          breachType,
          new Date(ticket[breachType === 'response' ? 'response_due_at' : 'resolve_due_at'])
        );
      }

      // Notify managers
      const { userStorage } = await import("./user-storage");
      const managers = await userStorage.getUsersByRole('manager');

      for (const manager of managers) {
        await notificationService.createNotification({
          user_email: manager.email,
          title,
          message,
          type: 'sla_breach',
          priority: 'high',
          related_entity_type: 'ticket',
          related_entity_id: ticket.id
        });
      }

    } catch (error) {
      console.error(`Error sending SLA breach notification for ticket ${ticket.ticket_number}:`, error);
    }
  }

  // Get SLA metrics for dashboard
  async getSLAMetrics(): Promise<{
    totalTicketsWithSLA: number;
    responseBreaches: number;
    resolutionBreaches: number;
    onTrackTickets: number;
    slaCompliance: number;
  }> {
    try {
      const openTickets = await db
        .select()
        .from(tickets)
        .where(
          and(
            not(inArray(tickets.status, ['resolved', 'closed', 'cancelled'])),
            isNotNull(tickets.resolve_due_at)
          )
        );

      const responseBreaches = openTickets.filter(t => t.sla_response_breached).length;
      const resolutionBreaches = openTickets.filter(t => t.sla_resolution_breached).length;
      const totalBreaches = new Set([
        ...openTickets.filter(t => t.sla_response_breached).map(t => t.id),
        ...openTickets.filter(t => t.sla_resolution_breached).map(t => t.id)
      ]).size;

      const totalTicketsWithSLA = openTickets.length;
      const onTrackTickets = totalTicketsWithSLA - totalBreaches;
      const slaCompliance = totalTicketsWithSLA > 0 
        ? Math.round((onTrackTickets / totalTicketsWithSLA) * 100) 
        : 100;

      return {
        totalTicketsWithSLA,
        responseBreaches,
        resolutionBreaches,
        onTrackTickets,
        slaCompliance
      };
    } catch (error) {
      console.error("Error getting SLA metrics:", error);
      return {
        totalTicketsWithSLA: 0,
        responseBreaches: 0,
        resolutionBreaches: 0,
        onTrackTickets: 0,
        slaCompliance: 100
      };
    }
  }
}

export const slaMonitorService = new SLAMonitorService();