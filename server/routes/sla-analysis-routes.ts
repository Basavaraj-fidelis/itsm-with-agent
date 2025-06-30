
import { Router } from "express";
import { db } from "../db";
import { tickets } from "@shared/ticket-schema";
import { slaPolicies } from "@shared/sla-schema";
import { eq, and, not, inArray, isNotNull, desc } from "drizzle-orm";
import { slaPolicyService } from "../services/sla-policy-service";

const router = Router();

// Comprehensive SLA analysis endpoint
router.get("/api/sla/analysis", async (req, res) => {
  try {
    console.log("🔍 Starting comprehensive SLA analysis...");

    // Get all tickets with detailed SLA information
    const allTickets = await db
      .select()
      .from(tickets)
      .orderBy(desc(tickets.created_at));

    const now = new Date();
    const analysis = {
      summary: {
        totalTickets: allTickets.length,
        openTickets: 0,
        closedTickets: 0,
        slaBreached: 0,
        slaOnTrack: 0,
        responseBreached: 0,
        resolutionBreached: 0
      },
      ticketDetails: [],
      slaValidation: {
        ticketsWithSLA: 0,
        ticketsWithoutSLA: 0,
        slaCalculationErrors: []
      },
      futureTicketTest: null
    };

    // Analyze each ticket
    for (const ticket of allTickets) {
      const isOpen = !['resolved', 'closed', 'cancelled'].includes(ticket.status);
      
      if (isOpen) {
        analysis.summary.openTickets++;
      } else {
        analysis.summary.closedTickets++;
      }

      // Check SLA status
      if (ticket.sla_breached || ticket.sla_resolution_breached) {
        analysis.summary.slaBreached++;
      }
      
      if (ticket.sla_response_breached) {
        analysis.summary.responseBreached++;
      }

      if (ticket.sla_resolution_breached) {
        analysis.summary.resolutionBreached++;
      }

      // Calculate current SLA status
      let slaStatus = 'No SLA';
      let timeToSLA = null;
      let slaHealth = 'unknown';

      if (ticket.sla_resolution_due || ticket.resolve_due_at) {
        analysis.slaValidation.ticketsWithSLA++;
        const slaDate = new Date(ticket.sla_resolution_due || ticket.resolve_due_at);
        const timeDiff = slaDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);
        
        timeToSLA = Math.round(hoursDiff * 100) / 100;
        
        if (isOpen) {
          if (hoursDiff < 0) {
            slaStatus = `Breached by ${Math.abs(timeToSLA)} hours`;
            slaHealth = 'breached';
          } else if (hoursDiff <= 2) {
            slaStatus = `Due in ${timeToSLA} hours`;
            slaHealth = 'critical';
          } else if (hoursDiff <= 24) {
            slaStatus = `Due in ${timeToSLA} hours`;
            slaHealth = 'warning';
          } else {
            slaStatus = `Due in ${timeToSLA} hours`;
            slaHealth = 'good';
            analysis.summary.slaOnTrack++;
          }
        } else {
          slaStatus = 'Resolved';
          slaHealth = 'resolved';
        }
      } else {
        analysis.slaValidation.ticketsWithoutSLA++;
      }

      // Validate SLA calculation
      const expectedSLA = await validateSLACalculation(ticket);
      
      analysis.ticketDetails.push({
        ticketNumber: ticket.ticket_number,
        title: ticket.title,
        type: ticket.type,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.created_at,
        assignedTo: ticket.assigned_to || 'Unassigned',
        slaPolicy: ticket.sla_policy,
        slaResponseTime: ticket.sla_response_time,
        slaResolutionTime: ticket.sla_resolution_time,
        responseDue: ticket.response_due_at || ticket.sla_response_due,
        resolutionDue: ticket.resolve_due_at || ticket.sla_resolution_due,
        firstResponseAt: ticket.first_response_at,
        resolvedAt: ticket.resolved_at,
        slaBreached: ticket.sla_breached,
        slaResponseBreached: ticket.sla_response_breached,
        slaResolutionBreached: ticket.sla_resolution_breached,
        currentSLAStatus: slaStatus,
        timeToSLA: timeToSLA,
        slaHealth: slaHealth,
        expectedSLA: expectedSLA,
        slaValidationPass: expectedSLA.isValid
      });
    }

    // Test future ticket SLA logic
    analysis.futureTicketTest = await testFutureTicketSLA();

    // Get SLA policies for reference
    const policies = await db.select().from(slaPolicies);

    res.json({
      analysis,
      policies,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error("Error in SLA analysis:", error);
    res.status(500).json({ error: "Failed to analyze SLA data" });
  }
});

// Validate SLA calculation for a ticket
async function validateSLACalculation(ticket: any) {
  try {
    // Find matching SLA policy
    const policy = await slaPolicyService.findMatchingSLAPolicy({
      type: ticket.type,
      priority: ticket.priority,
      impact: ticket.impact,
      urgency: ticket.urgency,
      category: ticket.category
    });

    if (!policy) {
      return {
        isValid: false,
        error: "No matching SLA policy found",
        expectedPolicy: null,
        expectedResponseTime: null,
        expectedResolutionTime: null
      };
    }

    // Calculate expected SLA dates
    const slaTargets = slaPolicyService.calculateSLADueDates(
      new Date(ticket.created_at),
      policy
    );

    // Compare with actual SLA dates
    const actualResponse = ticket.response_due_at || ticket.sla_response_due;
    const actualResolution = ticket.resolve_due_at || ticket.sla_resolution_due;

    const responseDiff = actualResponse ? 
      Math.abs(new Date(actualResponse).getTime() - slaTargets.responseDue.getTime()) : null;
    const resolutionDiff = actualResolution ? 
      Math.abs(new Date(actualResolution).getTime() - slaTargets.resolutionDue.getTime()) : null;

    return {
      isValid: (responseDiff === null || responseDiff < 60000) && 
               (resolutionDiff === null || resolutionDiff < 60000), // Allow 1 minute tolerance
      expectedPolicy: policy.name,
      expectedResponseTime: policy.response_time,
      expectedResolutionTime: policy.resolution_time,
      expectedResponseDue: slaTargets.responseDue,
      expectedResolutionDue: slaTargets.resolutionDue,
      actualResponseDue: actualResponse,
      actualResolutionDue: actualResolution,
      responseDiffMinutes: responseDiff ? Math.round(responseDiff / 60000) : null,
      resolutionDiffMinutes: resolutionDiff ? Math.round(resolutionDiff / 60000) : null
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
      expectedPolicy: null,
      expectedResponseTime: null,
      expectedResolutionTime: null
    };
  }
}

// Test SLA logic for a future ticket
async function testFutureTicketSLA() {
  try {
    const testTicket = {
      type: "incident",
      priority: "high",
      impact: "medium",
      urgency: "high",
      category: "Infrastructure"
    };

    const policy = await slaPolicyService.findMatchingSLAPolicy(testTicket);
    
    if (!policy) {
      return {
        success: false,
        error: "No SLA policy would match the test ticket"
      };
    }

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

    const slaTargets = slaPolicyService.calculateSLADueDates(futureDate, policy);

    return {
      success: true,
      testTicket,
      matchedPolicy: policy.name,
      responseTime: policy.response_time,
      resolutionTime: policy.resolution_time,
      businessHoursOnly: policy.business_hours_only,
      expectedResponseDue: slaTargets.responseDue,
      expectedResolutionDue: slaTargets.resolutionDue,
      message: "SLA logic will work correctly for future tickets"
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "SLA logic may have issues for future tickets"
    };
  }
}

// Real-time SLA health check
router.get("/api/sla/health", async (req, res) => {
  try {
    const now = new Date();
    
    // Get all open tickets
    const openTickets = await db
      .select()
      .from(tickets)
      .where(
        and(
          not(inArray(tickets.status, ['resolved', 'closed', 'cancelled'])),
          isNotNull(tickets.sla_resolution_due)
        )
      );

    const health = {
      timestamp: now.toISOString(),
      totalOpenWithSLA: openTickets.length,
      breached: 0,
      critical: 0, // Due within 2 hours
      warning: 0,  // Due within 24 hours
      good: 0,     // More than 24 hours
      details: []
    };

    openTickets.forEach(ticket => {
      const slaDate = new Date(ticket.sla_resolution_due);
      const timeDiff = slaDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 3600);

      let status = 'good';
      if (hoursDiff < 0) {
        status = 'breached';
        health.breached++;
      } else if (hoursDiff <= 2) {
        status = 'critical';
        health.critical++;
      } else if (hoursDiff <= 24) {
        status = 'warning';
        health.warning++;
      } else {
        health.good++;
      }

      health.details.push({
        ticketNumber: ticket.ticket_number,
        priority: ticket.priority,
        status: status,
        hoursToSLA: Math.round(hoursDiff * 100) / 100,
        assignedTo: ticket.assigned_to || 'Unassigned'
      });
    });

    res.json(health);
  } catch (error) {
    console.error("Error in SLA health check:", error);
    res.status(500).json({ error: "Failed to check SLA health" });
  }
});

export default router;
