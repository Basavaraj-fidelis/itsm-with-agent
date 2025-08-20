import { db } from "../db";
import { tickets } from "@shared/ticket-schema";
import { eq, and, count, gte } from "drizzle-orm";
import { ticketStorage } from "./ticket-storage";

export class IncidentProblemBridge {
  private static circuitBreaker = {
    failures: 0,
    lastFailureTime: 0,
    threshold: 5,
    timeout: 60000, // 1 minute
    isOpen: false
  };

  private static problemThresholds = {
    RECURRING_INCIDENTS: 3, // Number of similar incidents
    TIME_WINDOW_HOURS: 24, // Time window to check for recurring incidents
    SIMILAR_KEYWORDS: ['network', 'server', 'database', 'application']
  };

  async checkForProblemEscalation(incidentId: string): Promise<void> {
    try {
      // Check if the circuit breaker is open
      if (IncidentProblemBridge.circuitBreaker.isOpen) {
        console.warn('Circuit breaker is open. Skipping problem escalation check.');
        return;
      }

      const incident = await ticketStorage.getTicketById(incidentId);
      if (!incident || incident.type !== 'incident') return;

      // Check for recurring similar incidents
      const similarIncidents = await this.findSimilarIncidents(incident);

      if (similarIncidents.length >= this.PROBLEM_ESCALATION_CRITERIA.RECURRING_INCIDENTS) {
        await this.createProblemFromIncidents(incident, similarIncidents);
      }
    } catch (error) {
      console.error('Error checking for problem escalation:', error);
      // Implement circuit breaker logic
      IncidentProblemBridge.circuitBreaker.failures++;
      IncidentProblemBridge.circuitBreaker.lastFailureTime = Date.now();
      if (IncidentProblemBridge.circuitBreaker.failures >= IncidentProblemBridge.circuitBreaker.threshold) {
        IncidentProblemBridge.circuitBreaker.isOpen = true;
        console.error('Circuit breaker opened due to too many failures.');
      }
    }
  }

  private async findSimilarIncidents(incident: any): Promise<any[]> {
    try {
      const timeWindow = new Date();
      timeWindow.setHours(timeWindow.getHours() - this.PROBLEM_ESCALATION_CRITERIA.TIME_WINDOW_HOURS);

      const { data: incidents } = await ticketStorage.getTickets(1, 100, {
        type: 'incident',
        search: this.extractKeywords(incident.title + ' ' + incident.description)
      });

      return incidents.filter(inc => 
        inc.id !== incident.id &&
        new Date(inc.created_at) >= timeWindow &&
        this.calculateSimilarity(incident, inc) > 0.7
      );
    } catch (error) {
      console.error('Error finding similar incidents:', error);
      // Implement circuit breaker logic for this method if it makes external calls
      return [];
    }
  }

  private extractKeywords(text: string): string {
    const words = text.toLowerCase().split(/\s+/);
    const keywords = words.filter(word => 
      word.length > 4 && 
      this.PROBLEM_ESCALATION_CRITERIA.SIMILAR_KEYWORDS.some(keyword => 
        word.includes(keyword) || keyword.includes(word)
      )
    );
    return keywords.slice(0, 3).join(' ');
  }

  private calculateSimilarity(incident1: any, incident2: any): number {
    const text1 = (incident1.title + ' ' + incident1.description).toLowerCase();
    const text2 = (incident2.title + ' ' + incident2.description).toLowerCase();

    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private async createProblemFromIncidents(originalIncident: any, similarIncidents: any[]): Promise<void> {
    try {
      const problemTitle = `Recurring Issue: ${originalIncident.title}`;
      const problemDescription = `Multiple similar incidents detected:\n\n` +
        `Original Incident: ${originalIncident.ticket_number} - ${originalIncident.title}\n` +
        `Related Incidents:\n` +
        similarIncidents.map(inc => `- ${inc.ticket_number}: ${inc.title}`).join('\n') +
        `\n\nRoot cause analysis required to prevent future occurrences.`;

      const problemTicket = await ticketStorage.createTicket({
        type: 'problem',
        title: problemTitle,
        description: problemDescription,
        priority: 'high',
        category: originalIncident.category,
        impact: 'high',
        urgency: 'medium',
        requester_email: 'system@company.com',
        related_tickets: [originalIncident.id, ...similarIncidents.map(inc => inc.id)],
        root_cause: 'Under investigation',
        known_error: false
      });

      // Link all incidents to the problem
      const allIncidentIds = [originalIncident.id, ...similarIncidents.map(inc => inc.id)];
      for (const incidentId of allIncidentIds) {
        await ticketStorage.addComment(incidentId, {
          comment: `🔗 This incident has been linked to Problem ${problemTicket.ticket_number} for root cause analysis.`,
          author_email: 'system@company.com',
          is_internal: true
        });
      }

      console.log(`🔄 Created problem ${problemTicket.ticket_number} from recurring incidents`);
      
      // Reset circuit breaker on successful operation after it was open
      if (IncidentProblemBridge.circuitBreaker.isOpen) {
        IncidentProblemBridge.circuitBreaker.failures = 0;
        IncidentProblemBridge.circuitBreaker.isOpen = false;
        console.log('Circuit breaker reset.');
      }
    } catch (error) {
      console.error('Error creating problem from incidents:', error);
      // Implement circuit breaker logic for this method as well
      IncidentProblemBridge.circuitBreaker.failures++;
      IncidentProblemBridge.circuitBreaker.lastFailureTime = Date.now();
      if (IncidentProblemBridge.circuitBreaker.failures >= IncidentProblemBridge.circuitBreaker.threshold) {
        IncidentProblemBridge.circuitBreaker.isOpen = true;
        console.error('Circuit breaker opened due to too many failures.');
      }
    }
  }
}

export const incidentProblemBridge = new IncidentProblemBridge();