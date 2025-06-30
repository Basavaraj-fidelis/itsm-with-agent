
import { db } from "../db";
import { tickets } from "@shared/ticket-schema";
import { slaPolicies, slaBreaches } from "@shared/sla-schema";
import { users } from "@shared/user-schema";
import { eq, and, lt, not, inArray } from "drizzle-orm";
import { notificationService } from "./notification-service";
import { emailService } from "./email-service";

interface EscalationRule {
  id: string;
  name: string;
  triggerMinutesBeforeBreach: number;
  escalateTo: 'manager' | 'senior_tech' | 'director';
  requiresComment: boolean;
}

interface SLAAlert {
  ticketId: string;
  ticketNumber: string;
  priority: string;
  minutesUntilBreach: number;
  escalationLevel: number;
  assignedTo?: string;
  escalatedTo?: string;
}

export class SLAEscalationService {
  private escalationRules: EscalationRule[] = [
    {
      id: 'warning_2h',
      name: '2 Hour Warning',
      triggerMinutesBeforeBreach: 120,
      escalateTo: 'manager',
      requiresComment: false
    },
    {
      id: 'warning_30m',
      name: '30 Minute Warning',
      triggerMinutesBeforeBreach: 30,
      escalateTo: 'senior_tech',
      requiresComment: true
    },
    {
      id: 'breach_immediate',
      name: 'Immediate Breach',
      triggerMinutesBeforeBreach: 0,
      escalateTo: 'director',
      requiresComment: true
    },
    {
      id: 'breach_overdue',
      name: 'Overdue Breach',
      triggerMinutesBeforeBreach: -60,
      escalateTo: 'director',
      requiresComment: true
    }
  ];

  async checkAndEscalateTickets(): Promise<void> {
    try {
      console.log("🔄 Starting SLA escalation check...");
      
      const now = new Date();
      
      // Get all open tickets with SLA due dates
      const openTickets = await db
        .select()
        .from(tickets)
        .where(
          and(
            not(inArray(tickets.status, ['resolved', 'closed', 'cancelled'])),
            not(eq(tickets.sla_resolution_due, null))
          )
        );

      console.log(`Found ${openTickets.length} open tickets to check`);

      // Update SLA breach status for all tickets in real-time
      for (const ticket of openTickets) {
        if (ticket.sla_resolution_due) {
          const isBreached = now > new Date(ticket.sla_resolution_due);
          if (isBreached !== ticket.sla_breached) {
            await db
              .update(tickets)
              .set({ sla_breached: isBreached, updated_at: now })
              .where(eq(tickets.id, ticket.id));
          }
        }
      }

      const alerts: SLAAlert[] = [];
      
      for (const ticket of openTickets) {
        if (!ticket.sla_resolution_due) continue;

        const timeDiff = new Date(ticket.sla_resolution_due).getTime() - now.getTime();
        const minutesUntilBreach = Math.floor(timeDiff / (1000 * 60));
        
        // Check each escalation rule
        for (const rule of this.escalationRules) {
          if (this.shouldTriggerEscalation(minutesUntilBreach, rule)) {
            const escalationLevel = this.getEscalationLevel(rule);
            
            alerts.push({
              ticketId: ticket.id,
              ticketNumber: ticket.ticket_number,
              priority: ticket.priority,
              minutesUntilBreach,
              escalationLevel,
              assignedTo: ticket.assigned_to || undefined
            });

            await this.executeEscalation(ticket, rule, minutesUntilBreach);
          }
        }
      }

      if (alerts.length > 0) {
        console.log(`🚨 Generated ${alerts.length} SLA alerts`);
        await this.sendEscalationSummary(alerts);
      }

    } catch (error) {
      console.error("❌ Error in SLA escalation check:", error);
    }
  }

  private shouldTriggerEscalation(minutesUntilBreach: number, rule: EscalationRule): boolean {
    // Check if we've already sent this escalation for this time window
    if (rule.triggerMinutesBeforeBreach >= 0) {
      // For warnings before breach
      return minutesUntilBreach <= rule.triggerMinutesBeforeBreach && 
             minutesUntilBreach > (rule.triggerMinutesBeforeBreach - 15); // 15 min window
    } else {
      // For overdue breaches
      return minutesUntilBreach <= rule.triggerMinutesBeforeBreach;
    }
  }

  private getEscalationLevel(rule: EscalationRule): number {
    switch (rule.escalateTo) {
      case 'manager': return 1;
      case 'senior_tech': return 2;
      case 'director': return 3;
      default: return 1;
    }
  }

  private async executeEscalation(
    ticket: any, 
    rule: EscalationRule, 
    minutesUntilBreach: number
  ): Promise<void> {
    try {
      // Get escalation target
      const escalationTarget = await this.getEscalationTarget(rule.escalateTo, ticket.assigned_to);
      
      // Create escalation notification
      const message = this.createEscalationMessage(ticket, rule, minutesUntilBreach);
      
      // Send notifications (both in-app and email)
      if (escalationTarget) {
        // In-app notification
        await notificationService.createNotification({
          user_email: escalationTarget.email,
          title: `SLA Escalation: ${ticket.ticket_number}`,
          message,
          type: 'sla_escalation',
          priority: this.getNotificationPriority(rule),
          related_entity_type: 'ticket',
          related_entity_id: ticket.id
        });

        // Email notification
        await emailService.sendSLAEscalationEmail(
          escalationTarget.email,
          ticket,
          rule.name,
          minutesUntilBreach,
          escalationTarget.email
        );
      }

      // Notify current assignee if different
      if (ticket.assigned_to && ticket.assigned_to !== escalationTarget?.email) {
        // In-app notification
        await notificationService.createNotification({
          user_email: ticket.assigned_to,
          title: `SLA Alert: ${ticket.ticket_number}`,
          message: `Your ticket is ${minutesUntilBreach < 0 ? 'overdue by ' + Math.abs(minutesUntilBreach) + ' minutes' : 'due in ' + minutesUntilBreach + ' minutes'}`,
          type: 'sla_warning',
          priority: this.getNotificationPriority(rule),
          related_entity_type: 'ticket',
          related_entity_id: ticket.id
        });

        // Email notification
        await emailService.sendSLAEscalationEmail(
          ticket.assigned_to,
          ticket,
          `SLA ${minutesUntilBreach < 0 ? 'Breach' : 'Warning'}`,
          minutesUntilBreach
        );
      }

      // Add comment to ticket if required
      if (rule.requiresComment) {
        await this.addEscalationComment(ticket.id, rule, escalationTarget, minutesUntilBreach);
      }

      // Log escalation
      console.log(`📤 Escalated ${ticket.ticket_number} via ${rule.name} to ${escalationTarget?.email || 'system'}`);

    } catch (error) {
      console.error(`Error executing escalation for ticket ${ticket.ticket_number}:`, error);
    }
  }

  private async getEscalationTarget(escalateTo: string, currentAssignee?: string): Promise<any> {
    try {
      let role = '';
      
      switch (escalateTo) {
        case 'manager':
          role = 'manager';
          break;
        case 'senior_tech':
          role = 'senior_technician';
          break;
        case 'director':
          role = 'admin';
          break;
        default:
          role = 'manager';
      }

      const [target] = await db
        .select()
        .from(users)
        .where(eq(users.role, role))
        .limit(1);

      return target;
    } catch (error) {
      console.error("Error getting escalation target:", error);
      return null;
    }
  }

  private createEscalationMessage(ticket: any, rule: EscalationRule, minutesUntilBreach: number): string {
    const isOverdue = minutesUntilBreach < 0;
    const timeText = isOverdue 
      ? `overdue by ${Math.abs(minutesUntilBreach)} minutes`
      : `due in ${minutesUntilBreach} minutes`;

    return `🚨 SLA Escalation Alert

Ticket: ${ticket.ticket_number}
Title: ${ticket.title}
Priority: ${ticket.priority.toUpperCase()}
Status: ${ticket.status}
Assigned To: ${ticket.assigned_to || 'Unassigned'}

SLA Status: Resolution ${timeText}
Escalation Level: ${rule.name}

${isOverdue ? '⚠️ This ticket has breached its SLA and requires immediate attention!' : '⏰ This ticket is approaching its SLA deadline.'}

Please take immediate action or reassign if necessary.`;
  }

  private getNotificationPriority(rule: EscalationRule): 'low' | 'medium' | 'high' | 'critical' {
    switch (rule.escalateTo) {
      case 'director': return 'critical';
      case 'senior_tech': return 'high';
      case 'manager': return 'medium';
      default: return 'medium';
    }
  }

  private async addEscalationComment(
    ticketId: string, 
    rule: EscalationRule, 
    escalatedTo: any, 
    minutesUntilBreach: number
  ): Promise<void> {
    try {
      const { ticketStorage } = await import("../services/ticket-storage");
      
      const comment = `🚨 SLA Escalation: ${rule.name}
${minutesUntilBreach < 0 ? 'Overdue by' : 'Due in'} ${Math.abs(minutesUntilBreach)} minutes
Escalated to: ${escalatedTo?.email || 'System'}
Action required: Immediate attention needed`;

      await ticketStorage.addComment(ticketId, {
        comment,
        author_email: "system@company.com",
        is_internal: true
      });
    } catch (error) {
      console.error("Error adding escalation comment:", error);
    }
  }

  private async sendEscalationSummary(alerts: SLAAlert[]): Promise<void> {
    try {
      // Send summary to all managers and admins
      const [managers] = await db
        .select()
        .from(users)
        .where(inArray(users.role, ['manager', 'admin']));

      const summary = this.createEscalationSummary(alerts);
      const dashboardData = await this.getSLADashboardData();

      for (const manager of managers) {
        // In-app notification
        await notificationService.createNotification({
          user_email: manager.email,
          title: `Daily SLA Escalation Summary (${alerts.length} alerts)`,
          message: summary,
          type: 'sla_summary',
          priority: 'medium'
        });

        // Email notification
        await emailService.sendSLASummaryEmail(
          manager.email,
          alerts,
          dashboardData
        );
      }
    } catch (error) {
      console.error("Error sending escalation summary:", error);
    }
  }

  private createEscalationSummary(alerts: SLAAlert[]): string {
    const critical = alerts.filter(a => a.escalationLevel === 3).length;
    const high = alerts.filter(a => a.escalationLevel === 2).length;
    const medium = alerts.filter(a => a.escalationLevel === 1).length;

    return `📊 SLA Escalation Summary

Total Alerts: ${alerts.length}
🔴 Critical: ${critical}
🟡 High: ${high}
🟢 Medium: ${medium}

Recent Escalations:
${alerts.slice(0, 5).map(alert => 
  `• ${alert.ticketNumber} (${alert.priority}) - ${alert.minutesUntilBreach < 0 ? 'Overdue' : 'Due soon'}`
).join('\n')}

Please review and take appropriate action.`;
  }

  async getSLADashboardData(): Promise<any> {
    try {
      const now = new Date();
      
      // Get all open tickets with SLA
      const openTickets = await db
        .select()
        .from(tickets)
        .where(
          and(
            not(inArray(tickets.status, ['resolved', 'closed', 'cancelled'])),
            not(eq(tickets.sla_resolution_due, null))
          )
        );

      let breached = 0;
      let dueIn2Hours = 0;
      let dueToday = 0;
      let onTrack = 0;

      for (const ticket of openTickets) {
        if (!ticket.sla_resolution_due) continue;
        
        const timeDiff = new Date(ticket.sla_resolution_due).getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);

        if (hoursDiff < 0) {
          breached++;
        } else if (hoursDiff <= 2) {
          dueIn2Hours++;
        } else if (hoursDiff <= 24) {
          dueToday++;
        } else {
          onTrack++;
        }
      }

      const totalSLATickets = openTickets.length;
      const compliance = totalSLATickets > 0 ? Math.round(((totalSLATickets - breached) / totalSLATickets) * 100) : 100;

      return {
        totalTickets: totalSLATickets,
        breached,
        dueIn2Hours,
        dueToday,
        onTrack,
        compliance,
        escalationAlerts: breached + dueIn2Hours
      };
    } catch (error) {
      console.error("Error getting SLA dashboard data:", error);
      return {
        totalTickets: 0,
        breached: 0,
        dueIn2Hours: 0,
        dueToday: 0,
        onTrack: 0,
        compliance: 100,
        escalationAlerts: 0
      };
    }
  }
}

export const slaEscalationService = new SLAEscalationService();
