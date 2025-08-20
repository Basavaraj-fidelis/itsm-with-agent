import { db } from "../db";
import { tickets } from "@shared/ticket-schema";
import { eq, and, gte } from "drizzle-orm";
import { ticketStorage } from "./ticket-storage";

export class MajorIncidentService {
  private static escalationRules = new Map();
  private static redisClient: any = null; // Will be implemented for clustering

  // Major incident criteria
  private readonly MAJOR_INCIDENT_CRITERIA = {
    CRITICAL_PRIORITY: 'critical',
    HIGH_IMPACT_USERS: 100, // Number of affected users
    BUSINESS_CRITICAL_SERVICES: ['email', 'network', 'database', 'authentication'],
    SLA_BREACH_THRESHOLD: 2 // Hours
  };

  async checkForMajorIncident(ticketId: string): Promise<boolean> {
    try {
      const ticket = await ticketStorage.getTicketById(ticketId);
      if (!ticket) return false;

      // Check if ticket meets major incident criteria
      const isMajorIncident = this.evaluateMajorIncidentCriteria(ticket);

      if (isMajorIncident) {
        await this.escalateToMajorIncident(ticket);
      }

      return isMajorIncident;
    } catch (error) {
      console.error('Error checking for major incident:', error);
      return false;
    }
  }

  private evaluateMajorIncidentCriteria(ticket: any): boolean {
    // Critical priority incidents
    if (ticket.priority === this.MAJOR_INCIDENT_CRITERIA.CRITICAL_PRIORITY) {
      return true;
    }

    // High impact on business critical services
    if (ticket.category && 
        this.MAJOR_INCIDENT_CRITERIA.BUSINESS_CRITICAL_SERVICES.includes(ticket.category.toLowerCase())) {
      return true;
    }

    // Check if SLA is breached significantly
    if (ticket.sla_resolution_due && new Date() > new Date(ticket.sla_resolution_due)) {
      const hoursBreached = (new Date().getTime() - new Date(ticket.sla_resolution_due).getTime()) / (1000 * 60 * 60);
      if (hoursBreached >= this.MAJOR_INCIDENT_CRITERIA.SLA_BREACH_THRESHOLD) {
        return true;
      }
    }

    return false;
  }

  private async escalateToMajorIncident(ticket: any): Promise<void> {
    try {
      // Update ticket with major incident flag
      await ticketStorage.updateTicket(ticket.id, {
        custom_fields: {
          ...ticket.custom_fields,
          is_major_incident: true,
          major_incident_declared_at: new Date(),
          incident_commander: 'it-manager@company.com'
        }
      });

      // Add escalation comment
      await ticketStorage.addComment(ticket.id, {
        comment: `🚨 MAJOR INCIDENT DECLARED\n\nThis incident has been escalated to Major Incident status due to business impact. Incident Commander assigned.`,
        author_email: 'system@company.com',
        is_internal: true
      });

      console.log(`🚨 Major incident declared for ticket ${ticket.ticket_number}`);
    } catch (error) {
      console.error('Error escalating to major incident:', error);
    }
  }

  async getMajorIncidents(): Promise<any[]> {
    try {
      const { data: tickets } = await ticketStorage.getTickets(1, 100, {
        status: 'new,assigned,in_progress'
      });

      return tickets.filter(ticket => 
        ticket.custom_fields?.is_major_incident === true
      );
    } catch (error) {
      console.error('Error fetching major incidents:', error);
      return [];
    }
  }
}

export const majorIncidentService = new MajorIncidentService();