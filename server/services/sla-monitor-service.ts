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


  // Handle SLA pause/resume based on ticket status
  private async handleSLAPauseResume(tickets: any[]): Promise<void> {
    const now = new Date();
    
    for (const ticket of tickets) {
      const shouldBePaused = ['pending', 'on_hold'].includes(ticket.status);
      const shouldBeResumed = ticket.status === 'in_progress'; // Auto-resume only for in_progress
      const currentlyPaused = ticket.sla_paused || false; // Default to false if undefined
      
      // If status requires pause but ticket is not paused
      if (shouldBePaused && !currentlyPaused) {
        try {
          await db
            .update(tickets)
            .set({
              sla_paused: true,
              sla_pause_reason: `Ticket moved to ${ticket.status} status`,
              sla_paused_at: now,
              updated_at: now
            })
            .where(eq(tickets.id, ticket.id));
            
          console.log(`⏸️  SLA paused for ticket ${ticket.ticket_number} (${ticket.status})`);
        } catch (error) {
          console.log(`⚠️  Could not pause SLA for ticket ${ticket.ticket_number}, field may not exist yet`);
        }
      }
      
      // Auto-resume only when ticket moves to in_progress status
      if (shouldBeResumed && currentlyPaused && ticket.sla_paused_at) {
        try {
          const pauseDuration = Math.floor((now.getTime() - new Date(ticket.sla_paused_at).getTime()) / (1000 * 60));
          const totalPausedTime = (ticket.sla_total_paused_time || 0) + pauseDuration;
          
          await db
            .update(tickets)
            .set({
              sla_paused: false,
              sla_pause_reason: null,
              sla_resumed_at: now,
              sla_total_paused_time: totalPausedTime,
              updated_at: now
            })
            .where(eq(tickets.id, ticket.id));
            
          console.log(`▶️  SLA auto-resumed for ticket ${ticket.ticket_number} (moved to in_progress, paused for ${pauseDuration} minutes)`);
        } catch (error) {
          console.log(`⚠️  Could not resume SLA for ticket ${ticket.ticket_number}, field may not exist yet`);
        }
      }
    }
  }


  // Check for SLA breaches and update tickets
  async checkSLABreaches(): Promise<void> {
    try {
      console.log("🔍 Checking for SLA breaches...");
      const now = new Date();

      // Get all open tickets (excluding paused statuses for SLA calculation)
      const openTickets = await db
        .select()
        .from(tickets)
        .where(
          not(inArray(tickets.status, ['resolved', 'closed', 'cancelled']))
        );

      // Handle SLA pause/resume for status changes
      await this.handleSLAPauseResume(openTickets);

      let responseBreaches = 0;
      let resolutionBreaches = 0;
      let updates = 0;

      for (const ticket of openTickets) {
        let needsUpdate = false;
        const updateData: any = {};

        // Ensure ticket has SLA data - if not, calculate it now
        if (!ticket.resolve_due_at && !ticket.sla_resolution_due) {
          const { slaPolicyService } = await import("./sla-policy-service");
          const policy = await slaPolicyService.findMatchingSLAPolicy({
            type: ticket.type,
            priority: ticket.priority,
            impact: ticket.impact,
            urgency: ticket.urgency,
            category: ticket.category
          });

          if (policy) {
            const slaTargets = slaPolicyService.calculateSLADueDates(
              new Date(ticket.created_at),
              policy
            );

            // Update ticket with SLA data
            await db
              .update(tickets)
              .set({
                sla_policy_id: policy.id,
                sla_policy: policy.name,
                sla_response_time: policy.response_time,
                sla_resolution_time: policy.resolution_time,
                response_due_at: slaTargets.responseDue,
                resolve_due_at: slaTargets.resolutionDue,
                sla_response_due: slaTargets.responseDue,
                sla_resolution_due: slaTargets.resolutionDue,
                updated_at: now
              })
              .where(eq(tickets.id, ticket.id));

            // Update local ticket object
            ticket.response_due_at = slaTargets.responseDue;
            ticket.resolve_due_at = slaTargets.resolutionDue;
            ticket.sla_response_due = slaTargets.responseDue;
            ticket.sla_resolution_due = slaTargets.resolutionDue;

            console.log(`🔧 Auto-fixed SLA data for ticket ${ticket.ticket_number}`);
          }
        }

        // Skip SLA breach checking for paused tickets
        if ((ticket.sla_paused || false) || ['pending', 'on_hold'].includes(ticket.status)) {
          continue;
        }

        // Calculate effective due dates (accounting for paused time)
        const pausedMinutes = ticket.sla_total_paused_time || 0;
        
        // Check response SLA breach - consider assignment and first comment as first response
        const responseDue = ticket.response_due_at || ticket.sla_response_due;
        const hasFirstResponse = ticket.first_response_at || ticket.assigned_to || ticket.updated_at !== ticket.created_at;
        
        if (responseDue && !hasFirstResponse && !(ticket.sla_response_breached || false)) {
          const effectiveResponseDue = new Date(new Date(responseDue).getTime() + (pausedMinutes * 60 * 1000));
          if (now > effectiveResponseDue) {
            updateData.sla_response_breached = true;
            needsUpdate = true;
            responseBreaches++;
            console.log(`🚨 Response SLA breached for ticket ${ticket.ticket_number}`);

            // Send response breach notification
            await this.sendSLABreachNotification(ticket, 'response');
          }
        }

        // Check resolution SLA breach
        const resolutionDue = ticket.resolve_due_at || ticket.sla_resolution_due;
        if (resolutionDue && !ticket.sla_resolution_breached) {
          const effectiveResolutionDue = new Date(new Date(resolutionDue).getTime() + (pausedMinutes * 60 * 1000));
          if (now > effectiveResolutionDue) {
            updateData.sla_resolution_breached = true;
            updateData.sla_breached = true; // Legacy field
            needsUpdate = true;
            resolutionBreaches++;
            console.log(`🚨 Resolution SLA breached for ticket ${ticket.ticket_number}`);

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
          console.log(`⚠️  SLA breach detected for ticket ${ticket.ticket_number} (Created: ${ticket.created_at})`);
        }
      }

      if (updates > 0) {
        console.log(`📊 SLA Check Complete: ${updates} tickets updated, ${responseBreaches} response breaches, ${resolutionBreaches} resolution breaches`);
      } else {
        console.log("✅ SLA Check Complete: No new breaches detected");
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

      // Notify managers - get users with manager role
      const { db } = await import("../db");
      const { users } = await import("@shared/user-schema");
      const { eq } = await import("drizzle-orm");

      const managers = await db
        .select()
        .from(users)
        .where(eq(users.role, 'manager'));

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
      // Get all tickets (both open and closed) for proper SLA analysis
      const allTickets = await db.select().from(tickets);

      const openTickets = allTickets.filter(t => 
        !['resolved', 'closed', 'cancelled'].includes(t.status)
      );

      // Filter open tickets that have SLA due dates
      const ticketsWithSLA = openTickets.filter(t => 
        t.resolve_due_at || t.sla_resolution_due || 
        t.response_due_at || t.sla_response_due
      );

      // Calculate current breaches based on time AND update database flags
      const now = new Date();
      let actualResponseBreaches = 0;
      let actualResolutionBreaches = 0;
      let totalBreachedTickets = 0;

      for (const ticket of ticketsWithSLA) {
        let needsUpdate = false;
        const updateData: any = {};

        // Skip breach calculation for paused tickets
        if (!(ticket.sla_paused || false) && !['pending', 'on_hold'].includes(ticket.status)) {
          const pausedMinutes = ticket.sla_total_paused_time || 0;
          
          // Check if response is breached (accounting for paused time)
          const responseDue = ticket.response_due_at || ticket.sla_response_due;
          const hasFirstResponse = ticket.first_response_at || ticket.assigned_to || ticket.updated_at !== ticket.created_at;
          
          if (responseDue && !hasFirstResponse) {
            const effectiveResponseDue = new Date(new Date(responseDue).getTime() + (pausedMinutes * 60 * 1000));
            const isResponseBreached = now > effectiveResponseDue;
            
            if (isResponseBreached) {
              actualResponseBreaches++;
              if (!(ticket.sla_response_breached || false)) {
                updateData.sla_response_breached = true;
                needsUpdate = true;
              }
            }
          }

          // Check if resolution is breached (accounting for paused time)
          const resolutionDue = ticket.resolve_due_at || ticket.sla_resolution_due;
          if (resolutionDue) {
            const effectiveResolutionDue = new Date(new Date(resolutionDue).getTime() + (pausedMinutes * 60 * 1000));
            const isResolutionBreached = now > effectiveResolutionDue;
            
            if (isResolutionBreached) {
              actualResolutionBreaches++;
              if (!(ticket.sla_resolution_breached || false) || !(ticket.sla_breached || false)) {
                updateData.sla_resolution_breached = true;
                updateData.sla_breached = true; // Legacy field
                needsUpdate = true;
              }
            }
          }
        }

        // Count unique breached tickets
        if (isResponseBreached || isResolutionBreached) {
          totalBreachedTickets++;
        }

        // Update database if needed
        if (needsUpdate) {
          updateData.updated_at = now;
          await db
            .update(tickets)
            .set(updateData)
            .where(eq(tickets.id, ticket.id));
        }
      }

      const totalTicketsWithSLA = ticketsWithSLA.length;
      const onTrackTickets = totalTicketsWithSLA - totalBreachedTickets;
      const slaCompliance = totalTicketsWithSLA > 0 
        ? Math.round((onTrackTickets / totalTicketsWithSLA) * 100) 
        : 100;

      console.log(`📊 SLA Metrics: ${totalTicketsWithSLA} total, ${totalBreachedTickets} breached, ${slaCompliance}% compliance`);

      return {
        totalTicketsWithSLA,
        responseBreaches: actualResponseBreaches,
        resolutionBreaches: actualResolutionBreaches,
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