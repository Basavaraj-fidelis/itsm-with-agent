import { Router } from "express";
import { db } from "../db";
import { tickets } from "@shared/ticket-schema";
import { slaPolicies } from "@shared/sla-schema";
import { eq, and, not, inArray, isNotNull, desc } from "drizzle-orm";
import { slaPolicyService } from "../services/sla-policy-service";

const router = Router();

// SLA Analysis endpoint
router.get("/api/sla/analysis", async (req, res) => {
  try {
    const now = new Date();

    // Get all tickets for analysis
    const allTickets = await db.select().from(tickets);

    const analysis = {
      summary: {
        totalTickets: allTickets.length,
        openTickets: allTickets.filter(t => !['resolved', 'closed', 'cancelled'].includes(t.status)).length,
        closedTickets: allTickets.filter(t => ['resolved', 'closed', 'cancelled'].includes(t.status)).length,
        slaBreached: allTickets.filter(t => t.sla_breached || t.sla_resolution_breached).length,
        slaOnTrack: 0,
        responseBreached: allTickets.filter(t => t.sla_response_breached).length,
        resolutionBreached: allTickets.filter(t => t.sla_resolution_breached).length,
      },
      ticketDetails: [] as any[],
      slaValidation: {
        ticketsWithSLA: 0,
        ticketsWithoutSLA: 0,
        slaCalculationErrors: [] as any[]
      },
      futureTicketTest: null as any
    };

    // Analyze each ticket
    for (const ticket of allTickets) {
      // Check if ticket has SLA data
      const hasSLA = ticket.resolve_due_at || ticket.sla_resolution_due;

      if (hasSLA) {
        analysis.slaValidation.ticketsWithSLA++;
      } else {
        analysis.slaValidation.ticketsWithoutSLA++;
      }

      // Calculate current SLA status
      let slaStatus = 'Unknown';
      let timeToSLA = null;
      let slaHealth = 'unknown';

      if (ticket.resolve_due_at || ticket.sla_resolution_due) {
        const dueDate = new Date(ticket.resolve_due_at || ticket.sla_resolution_due);
        const timeDiff = dueDate.getTime() - now.getTime();
        const hoursRemaining = Math.floor(timeDiff / (1000 * 3600));
        const minutesRemaining = Math.floor((timeDiff % (1000 * 3600)) / (1000 * 60));

        if (['resolved', 'closed', 'cancelled'].includes(ticket.status)) {
          slaStatus = 'Completed';
          slaHealth = ticket.sla_breached ? 'breached' : 'met';
        } else if (timeDiff < 0) {
          slaStatus = `Overdue by ${Math.abs(hoursRemaining)}h ${Math.abs(minutesRemaining)}m`;
          slaHealth = 'breached';
        } else if (hoursRemaining < 2) {
          slaStatus = `Due in ${hoursRemaining}h ${minutesRemaining}m`;
          slaHealth = 'critical';
        } else if (hoursRemaining < 24) {
          slaStatus = `Due in ${hoursRemaining}h ${minutesRemaining}m`;
          slaHealth = 'warning';
        } else {
          slaStatus = `Due in ${Math.floor(hoursRemaining / 24)}d ${hoursRemaining % 24}h`;
          slaHealth = 'good';
        }

        timeToSLA = {
          hours: hoursRemaining,
          minutes: minutesRemaining,
          status: slaHealth
        };
      }

      if (slaHealth === 'good') {
        analysis.summary.slaOnTrack++;
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
      isValid: true,
      matchedPolicy: policy.name,
      expectedResponseTime: policy.response_time,
      expectedResolutionTime: policy.resolution_time,
      expectedResponseDue: slaTargets.responseDue,
      expectedResolutionDue: slaTargets.resolutionDue,
      actualResponseDue: actualResponse,
      actualResolutionDue: actualResolution,
      responseDifference: responseDiff ? Math.floor(responseDiff / (1000 * 60)) : null, // in minutes
      resolutionDifference: resolutionDiff ? Math.floor(resolutionDiff / (1000 * 60)) : null, // in minutes
      calculationAccurate: (responseDiff === null || responseDiff < 60000) && 
                          (resolutionDiff === null || resolutionDiff < 60000) // within 1 minute tolerance
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

// Test future ticket SLA logic
async function testFutureTicketSLA() {
  try {
    const testCases = [
      { type: 'incident', priority: 'critical', impact: 'high', urgency: 'high' },
      { type: 'incident', priority: 'high', impact: 'medium', urgency: 'high' },
      { type: 'request', priority: 'medium', impact: 'low', urgency: 'medium' },
      { type: 'request', priority: 'low', impact: 'low', urgency: 'low' }
    ];

    const results = [];
    const now = new Date();

    for (const testCase of testCases) {
      // Find matching policy
      const policy = await slaPolicyService.findMatchingSLAPolicy(testCase);

      if (policy) {
        // Calculate SLA targets
        const slaTargets = slaPolicyService.calculateSLADueDates(now, policy);

        results.push({
          testCase,
          policy: policy.name,
          responseTime: policy.response_time,
          resolutionTime: policy.resolution_time,
          responseDue: slaTargets.responseDue,
          resolutionDue: slaTargets.resolutionDue,
          businessHoursOnly: policy.business_hours_only,
          willWork: true
        });
      } else {
        results.push({
          testCase,
          policy: null,
          willWork: false,
          error: "No matching SLA policy found"
        });
      }
    }

    return {
      testTime: now.toISOString(),
      results,
      summary: {
        totalTests: testCases.length,
        passed: results.filter(r => r.willWork).length,
        failed: results.filter(r => !r.willWork).length
      }
    };
  } catch (error) {
    return {
      error: error.message,
      testTime: new Date().toISOString()
    };
  }
}

// Fix existing tickets SLA data
router.post("/api/sla/fix-tickets", async (req, res) => {
  try {
    const ticketsToFix = await db
      .select()
      .from(tickets)
      .where(
        and(
          eq(tickets.resolve_due_at, null),
          not(inArray(tickets.status, ['resolved', 'closed', 'cancelled']))
        )
      );

    let fixed = 0;
    const now = new Date();

    for (const ticket of ticketsToFix) {
      // Find matching SLA policy
      const policy = await slaPolicyService.findMatchingSLAPolicy({
        type: ticket.type,
        priority: ticket.priority,
        impact: ticket.impact,
        urgency: ticket.urgency,
        category: ticket.category
      });

      if (policy) {
        // Calculate SLA dates
        const slaTargets = slaPolicyService.calculateSLADueDates(
          new Date(ticket.created_at),
          policy
        );

        // Check if already breached
        const isResponseBreached = !ticket.first_response_at && now > slaTargets.responseDue;
        const isResolutionBreached = now > slaTargets.resolutionDue;

        // Update ticket
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
            sla_response_breached: isResponseBreached,
            sla_resolution_breached: isResolutionBreached,
            sla_breached: isResolutionBreached,
            updated_at: now
          })
          .where(eq(tickets.id, ticket.id));

        fixed++;
      }
    }

    res.json({
      message: `Fixed SLA data for ${fixed} tickets`,
      ticketsProcessed: ticketsToFix.length,
      ticketsFixed: fixed
    });

  } catch (error) {
    console.error("Error fixing ticket SLA data:", error);
    res.status(500).json({ error: "Failed to fix ticket SLA data" });
  }
});

export default router;