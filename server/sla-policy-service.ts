
import { db } from "./db";
import { slaPolicies, type SLAPolicy } from "@shared/sla-schema";
import { tickets, type Ticket } from "@shared/ticket-schema";
import { eq, and, or, isNull, desc } from "drizzle-orm";

export class SLAPolicyService {
  // Find the best matching SLA policy for a ticket
  async findMatchingSLAPolicy(ticket: {
    type: string;
    priority: string;
    impact?: string;
    urgency?: string;
    category?: string;
  }): Promise<SLAPolicy | null> {
    try {
      // Try to find exact match first
      const exactMatch = await db
        .select()
        .from(slaPolicies)
        .where(
          and(
            eq(slaPolicies.is_active, true),
            eq(slaPolicies.ticket_type, ticket.type),
            eq(slaPolicies.priority, ticket.priority),
            ticket.impact ? eq(slaPolicies.impact, ticket.impact) : isNull(slaPolicies.impact),
            ticket.urgency ? eq(slaPolicies.urgency, ticket.urgency) : isNull(slaPolicies.urgency),
            ticket.category ? eq(slaPolicies.category, ticket.category) : isNull(slaPolicies.category)
          )
        )
        .orderBy(desc(slaPolicies.created_at))
        .limit(1);

      if (exactMatch.length > 0) {
        return exactMatch[0];
      }

      // Try partial matches - type and priority only
      const partialMatch = await db
        .select()
        .from(slaPolicies)
        .where(
          and(
            eq(slaPolicies.is_active, true),
            eq(slaPolicies.ticket_type, ticket.type),
            eq(slaPolicies.priority, ticket.priority),
            isNull(slaPolicies.impact),
            isNull(slaPolicies.urgency),
            isNull(slaPolicies.category)
          )
        )
        .orderBy(desc(slaPolicies.created_at))
        .limit(1);

      if (partialMatch.length > 0) {
        return partialMatch[0];
      }

      // Fallback to priority-only match
      const priorityMatch = await db
        .select()
        .from(slaPolicies)
        .where(
          and(
            eq(slaPolicies.is_active, true),
            eq(slaPolicies.priority, ticket.priority),
            isNull(slaPolicies.ticket_type),
            isNull(slaPolicies.impact),
            isNull(slaPolicies.urgency),
            isNull(slaPolicies.category)
          )
        )
        .orderBy(desc(slaPolicies.created_at))
        .limit(1);

      return priorityMatch.length > 0 ? priorityMatch[0] : null;

    } catch (error) {
      console.error("Error finding matching SLA policy:", error);
      return null;
    }
  }

  // Calculate SLA due dates based on policy and business hours
  calculateSLADueDates(
    createdAt: Date,
    policy: SLAPolicy
  ): {
    responseDue: Date;
    resolutionDue: Date;
  } {
    const baseTime = new Date(createdAt);

    if (policy.business_hours_only) {
      // Calculate business hours only
      const responseDue = this.addBusinessMinutes(baseTime, policy.response_time, policy);
      const resolutionDue = this.addBusinessMinutes(baseTime, policy.resolution_time, policy);
      return { responseDue, resolutionDue };
    } else {
      // 24/7 calculation
      const responseDue = new Date(baseTime.getTime() + (policy.response_time * 60 * 1000));
      const resolutionDue = new Date(baseTime.getTime() + (policy.resolution_time * 60 * 1000));
      return { responseDue, resolutionDue };
    }
  }

  // Add business minutes to a date, respecting business hours
  private addBusinessMinutes(startDate: Date, minutes: number, policy: SLAPolicy): Date {
    const businessStart = this.parseTime(policy.business_start || "09:00");
    const businessEnd = this.parseTime(policy.business_end || "17:00");
    const businessDays = (policy.business_days || "1,2,3,4,5").split(",").map(d => parseInt(d));

    let currentDate = new Date(startDate);
    let remainingMinutes = minutes;

    while (remainingMinutes > 0) {
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay(); // Convert Sunday from 0 to 7
      
      if (businessDays.includes(dayOfWeek)) {
        const currentHour = currentDate.getHours();
        const currentMinute = currentDate.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        const businessStartMinutes = businessStart.hour * 60 + businessStart.minute;
        const businessEndMinutes = businessEnd.hour * 60 + businessEnd.minute;

        if (currentTimeMinutes < businessStartMinutes) {
          // Before business hours - jump to start
          currentDate.setHours(businessStart.hour, businessStart.minute, 0, 0);
        } else if (currentTimeMinutes >= businessEndMinutes) {
          // After business hours - jump to next business day
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(businessStart.hour, businessStart.minute, 0, 0);
        } else {
          // During business hours - calculate remaining time in day
          const remainingBusinessMinutesToday = businessEndMinutes - currentTimeMinutes;
          const minutesToAdd = Math.min(remainingMinutes, remainingBusinessMinutesToday);
          
          currentDate.setMinutes(currentDate.getMinutes() + minutesToAdd);
          remainingMinutes -= minutesToAdd;

          if (remainingMinutes > 0) {
            // Move to next business day
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(businessStart.hour, businessStart.minute, 0, 0);
          }
        }
      } else {
        // Non-business day - jump to next day
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(businessStart.hour, businessStart.minute, 0, 0);
      }
    }

    return currentDate;
  }

  private parseTime(timeStr: string): { hour: number; minute: number } {
    const [hour, minute] = timeStr.split(":").map(n => parseInt(n));
    return { hour, minute };
  }

  // Create default SLA policies if none exist
  async ensureDefaultSLAPolicies(): Promise<void> {
    try {
      const existingPolicies = await db.select().from(slaPolicies).limit(1);
      
      if (existingPolicies.length === 0) {
        console.log("Creating default SLA policies...");
        
        const defaultPolicies = [
          {
            name: "Critical Incident",
            description: "Critical priority incidents require immediate attention",
            ticket_type: "incident",
            priority: "critical",
            response_time: 15, // 15 minutes
            resolution_time: 240, // 4 hours
            business_hours_only: false,
          },
          {
            name: "High Priority Incident",
            description: "High priority incidents",
            ticket_type: "incident",
            priority: "high",
            response_time: 60, // 1 hour
            resolution_time: 480, // 8 hours
            business_hours_only: true,
          },
          {
            name: "Medium Priority Request",
            description: "Standard service requests",
            ticket_type: "request",
            priority: "medium",
            response_time: 240, // 4 hours
            resolution_time: 1440, // 24 hours
            business_hours_only: true,
          },
          {
            name: "Low Priority Request",
            description: "Low priority service requests",
            ticket_type: "request",
            priority: "low",
            response_time: 480, // 8 hours
            resolution_time: 2880, // 48 hours
            business_hours_only: true,
          }
        ];

        await db.insert(slaPolicies).values(defaultPolicies);
        console.log(`✅ Created ${defaultPolicies.length} default SLA policies`);
      }
    } catch (error) {
      console.error("Error ensuring default SLA policies:", error);
    }
  }
}

export const slaPolicyService = new SLAPolicyService();
