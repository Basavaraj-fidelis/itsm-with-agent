import { db } from "../db";
import {
  tickets,
  ticketComments,
  knowledgeBase,
  type Ticket,
  type NewTicket,
  type TicketComment,
  type NewTicketComment,
  type KnowledgeBaseArticle,
  type NewKnowledgeBaseArticle,
} from "@shared/ticket-schema";
import { auditLog } from "@shared/admin-schema";
import { eq, desc, and, or, like, sql, count } from "drizzle-orm";
import { userStorage } from "./user-storage";
import { device_reports, alerts, devices } from "../../shared/schema";

interface TicketFilters {
  type?: string;
  status?: string;
  priority?: string;
  search?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class TicketStorage {
  // Generate unique ticket number
  private async generateTicketNumber(type: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = type.toUpperCase().substring(0, 3);

    // Get count of tickets of this type this year
    const [result] = await db
      .select({ count: count() })
      .from(tickets)
      .where(
        and(
          eq(tickets.type, type),
          sql`EXTRACT(YEAR FROM ${tickets.created_at}) = ${year}`,
        ),
      );

    const nextNumber = (result.count || 0) + 1;
    return `${prefix}-${year}-${nextNumber.toString().padStart(3, "0")}`;
  }

  // CRUD Operations for Tickets
  async createTicket(
    ticketData: Omit<NewTicket, "ticket_number">,
    userEmail?: string,
  ): Promise<Ticket> {
    const ticket_number = await this.generateTicketNumber(ticketData.type);

    // Auto-assign to available technician
    const assignedTechnician = await userStorage.getNextAvailableTechnician();

    // Calculate SLA due dates using policy service
    const { slaPolicyService } = await import("./sla-policy-service");
    await slaPolicyService.ensureDefaultSLAPolicies();

    const slaPolicy = await slaPolicyService.findMatchingSLAPolicy({
      type: ticketData.type,
      priority: ticketData.priority,
      impact: ticketData.impact,
      urgency: ticketData.urgency,
      category: ticketData.category,
    });

    let slaResponseDue: Date | null = null;
    let slaResolutionDue: Date | null = null;
    let slaTargets = {
      policy: "Default",
      responseTime: 240,
      resolutionTime: 1440,
    };

    if (slaPolicy) {
      const dueDates = slaPolicyService.calculateSLADueDates(
        new Date(),
        slaPolicy,
      );
      slaResponseDue = dueDates.responseDue;
      slaResolutionDue = dueDates.resolutionDue;
      slaTargets = {
        policy: slaPolicy.name,
        responseTime: slaPolicy.response_time,
        resolutionTime: slaPolicy.resolution_time,
      };
    } else {
      // Fallback to old logic if no policy found
      const fallbackTargets = this.calculateSLATargets(
        ticketData.priority,
        ticketData.type,
      );
      const now = new Date();
      slaResponseDue = new Date(
        now.getTime() + fallbackTargets.responseTime * 60 * 1000,
      );
      slaResolutionDue = new Date(
        now.getTime() + fallbackTargets.resolutionTime * 60 * 1000,
      );
      slaTargets = fallbackTargets;
    }

    const [newTicket] = await db
      .insert(tickets)
      .values({
        ...ticketData,
        ticket_number,
        status: assignedTechnician ? "assigned" : "new",
        assigned_to: assignedTechnician?.email || null,
        sla_policy_id: slaPolicy?.id || null,
        sla_policy: slaTargets.policy,
        sla_response_time: slaTargets.responseTime,
        sla_resolution_time: slaTargets.resolutionTime,
        sla_response_due: slaResponseDue,
        sla_resolution_due: slaResolutionDue,
        response_due_at: slaResponseDue,
        resolve_due_at: slaResolutionDue,
        due_date: slaResolutionDue,
        sla_breached: false,
        sla_response_breached: false,
        sla_resolution_breached: false,
        related_article_ids: [], // Initialize as empty array
      })
      .returning();

    // Log audit event
    await this.logAudit(
      "ticket",
      newTicket.id,
      "create",
      undefined,
      userEmail,
      null,
      newTicket,
    );

    // Add auto-assignment comment if assigned
    if (assignedTechnician) {
      await this.addComment(newTicket.id, {
        comment: `Ticket automatically assigned to ${assignedTechnician.email}`,
        author_email: "system@company.com",
        is_internal: true,
      });
    }

    // Knowledge base integration - run asynchronously to avoid blocking ticket creation
    setTimeout(async () => {
      try {
        const relatedArticleIds = await this.processKnowledgeBaseIntegration({
          title: ticketData.title,
          description: ticketData.description,
          category: ticketData.category,
          type: ticketData.type,
          tags: ticketData.tags || [],
        });

        // Update ticket with related articles if any were found
        if (relatedArticleIds.length > 0) {
          console.log(`Linking ${relatedArticleIds.length} articles to ticket ${ticket_number}`);
          await this.updateTicket(newTicket.id, {
            related_article_ids: relatedArticleIds
          });
        }
      } catch (error) {
        console.error('Error in knowledge base integration:', error);
      }
    }, 1000); // 1 second delay to ensure ticket is fully created

    console.log(
      `Created ticket ${ticket_number}`,
    );
    return newTicket;
  }

  private async processKnowledgeBaseIntegration(ticketData: {
    title: string;
    description: string;
    category: string;
    type: string;
    tags: string[];
  }): Promise<string[]> {
    try {
      console.log('=== PROCESSING KNOWLEDGE BASE INTEGRATION ===');
      console.log('Ticket data:', ticketData);

      // Ensure we have some sample articles first
      await this.ensureSampleKBArticles();

      const { knowledgeAIService } = await import("./knowledge-ai-service");

      // 1. Attempt to find relevant existing articles
      console.log('Searching for relevant articles...');
      const relevantArticles = await knowledgeAIService.findRelevantArticles({
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category,
        type: ticketData.type,
        tags: ticketData.tags
      });

      let relatedArticleIds = relevantArticles.map(match => match.article.id);
      console.log(`Found ${relatedArticleIds.length} related articles:`, relevantArticles.map(a => a.article.title));

      if (relatedArticleIds.length === 0) {
        console.log('No relevant articles found, generating new draft article...');
        // 2. Generate a draft article if no matches are found
        const draftArticle = await knowledgeAIService.generateDraftArticle({
          title: ticketData.title,
          description: ticketData.description,
          category: ticketData.category,
          type: ticketData.type,
          tags: ticketData.tags
        });

        if (draftArticle) {
          relatedArticleIds = [draftArticle.id];
          console.log(`✅ Generated and linked draft article: ${draftArticle.id} - "${draftArticle.title}"`);
        } else {
          console.log('❌ Failed to generate draft article');
        }
      } else {
        console.log(`✅ Linked ${relatedArticleIds.length} existing articles to ticket`);
      }

      console.log('Final related article IDs:', relatedArticleIds);
      return relatedArticleIds;
    } catch (error) {
      console.error("❌ Error in knowledge base integration:", error);
      return []; // Return empty array on error
    }
  }

  private async ensureSampleKBArticles() {
    try {
      // Check if we have any articles
      const existingArticles = await db.select().from(knowledgeBase).limit(1);

      if (existingArticles.length === 0) {
        console.log("Creating sample knowledge base articles...");

        const sampleArticles = [
          {
            title: "How to Reset Your Password",
            content: "# Password Reset Guide\n\n1. Go to the login page\n2. Click 'Forgot Password'\n3. Enter your email address\n4. Check your email for reset instructions\n5. Follow the link and create a new password",
            category: "Security",
            tags: ["password", "reset", "login", "security"],
            author_email: "admin@company.com",
            status: "published" as const,
            views: 150,
            helpful_votes: 25
          },
          {
            title: "Troubleshooting Monitor Display Issues",
            content: "# Monitor Display Problems\n\n## Common Issues:\n- No display\n- Blurry screen\n- Color issues\n\n## Solutions:\n1. Check cable connections\n2. Update display drivers\n3. Adjust resolution settings\n4. Test with different monitor",
            category: "Hardware",
            tags: ["monitor", "display", "screen", "troubleshooting"],
            author_email: "admin@company.com",
            status: "published" as const,
            views: 200,
            helpful_votes: 30
          },
          {
            title: "Installing Software Updates",
            content: "# Software Update Guide\n\n## Windows Updates:\n1. Open Settings\n2. Go to Update & Security\n3. Click Check for Updates\n4. Install available updates\n5. Restart when prompted",
            category: "Software",
            tags: ["software", "update", "installation", "windows"],
            author_email: "admin@company.com",
            status: "published" as const,
            views: 300,
            helpful_votes: 45
          },
          {
            title: "Keyboard and Mouse Troubleshooting",
            content: "# Keyboard and Mouse Issues\n\n## Common Problems:\n- Keyboard not responding\n- Mouse not moving\n- Keys not working\n- Wireless connectivity issues\n\n## Solutions:\n1. Check USB connections\n2. Replace batteries (wireless devices)\n3. Update drivers\n4. Test with different devices\n5. Check for interference\n6. Clean devices",
            category: "Hardware",
            tags: ["keyboard", "mouse", "input", "devices", "troubleshooting"],
            author_email: "admin@company.com",
            status: "published" as const,
            views: 180,
            helpful_votes: 35
          },
          {
            title: "Email Server Issues and Solutions",
            content: "# Email Server Problems\n\n## Common Issues:\n- Cannot send/receive emails\n- Server connection timeout\n- Authentication failures\n- Slow email delivery\n\n## Troubleshooting Steps:\n1. Check internet connection\n2. Verify server settings\n3. Test with different email client\n4. Check firewall settings\n5. Contact email provider\n6. Restart email services",
            category: "Email & Communication",
            tags: ["email", "server", "exchange", "outlook", "communication"],
            author_email: "admin@company.com",
            status: "published" as const,
            views: 250,
            helpful_votes: 40
          },
          {
            title: "Network Connectivity Issues",
            content: "# Network Connection Problems\n\n## Symptoms:\n- No internet access\n- Slow connection\n- Intermittent connectivity\n- Cannot reach specific sites\n\n## Resolution Steps:\n1. Check physical connections\n2. Restart network adapter\n3. Flush DNS cache\n4. Reset network settings\n5. Contact ISP if needed",
            category: "Network",
            tags: ["network", "internet", "connectivity", "dns", "adapter"],
            author_email: "admin@company.com",
            status: "published" as const,
            views: 320,
            helpful_votes: 50
          }
        ];

        for (const article of sampleArticles) {
          await this.createKBArticle(article);
        }

        console.log("Sample knowledge base articles created successfully");
      }
    } catch (error) {
      console.error("Error creating sample KB articles:", error);
    }
  }

  async getTickets(
    page: number = 1,
    limit: number = 20,
    filters: TicketFilters = {},
  ): Promise<PaginatedResult<Ticket>> {
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    if (filters.type) {
      conditions.push(eq(tickets.type, filters.type));
    }

    if (filters.status) {
      conditions.push(eq(tickets.status, filters.status));
    }

    if (filters.priority) {
      conditions.push(eq(tickets.priority, filters.priority));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(tickets.title, `%${filters.search}%`),
          like(tickets.description, `%${filters.search}%`),
          like(tickets.ticket_number, `%${filters.search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(tickets)
      .where(whereClause);

    // Get paginated data
    const data = await db
      .select()
      .from(tickets)
      .where(whereClause)
      .orderBy(desc(tickets.created_at))
      .limit(limit)
      .offset(offset);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTicketById(id: string): Promise<Ticket | null> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));

    return ticket || null;
  }

  async updateTicket(
    id: string,
    updates: Partial<Ticket>,
    userEmail: string = "admin@company.com",
    comment?: string,
  ): Promise<Ticket | null> {
    try {
      // Get current ticket to check assignment
      const currentTicket = await this.getTicketById(id);
      if (!currentTicket) {
        throw new Error("Ticket not found");
      }

      // Check if comment is required for certain status changes
      if (
        updates.status &&
        ["resolved", "closed", "cancelled"].includes(updates.status) &&
        !comment
      ) {
        throw new Error(
          "Comment required when resolving, closing, or cancelling tickets",
        );
      }

      // Validate assignment for status changes that require it
      if (updates.status) {
        const statusesRequiringAssignment = [
          "in_progress",
          "pending",
          "resolved",
        ];
        if (statusesRequiringAssignment.includes(updates.status)) {
          const assignedTo = updates.assigned_to || currentTicket.assigned_to;
          if (!assignedTo) {
            throw new Error(
              `Ticket must be assigned before moving to ${updates.status} status`,
            );
          }
        }
      }

      // Auto-assign when status changes to 'assigned' without explicit assignment
      if (
        updates.status === "assigned" &&
        !updates.assigned_to &&
        !currentTicket.assigned_to
      ) {
        updates.assigned_to = userEmail;
      }

      // Set resolved_at timestamp when status changes to resolved
      if (updates.status === "resolved" && !updates.resolved_at) {
        updates.resolved_at = new Date();
      }

      // Set closed_at timestamp when status changes to closed
      if (updates.status === "closed" && !updates.closed_at) {
        updates.closed_at = new Date();
      }

      // Update workflow stage in custom fields if provided
      if (updates.workflow_step || updates.workflow_stage) {
        const currentTicket = await this.getTicketById(id);
        if (currentTicket) {
          const customFields = currentTicket.custom_fields || {};
          if (updates.workflow_step) {
            customFields.workflow_step = updates.workflow_step;
          }
          if (updates.workflow_stage) {
            customFields.workflow_stage = updates.workflow_stage;
          }
          updates.custom_fields = customFields;
        }
      }

      // Set resolved/closed timestamps and check SLA breach
      if (updates.status === "resolved" && !updates.resolved_at) {
        updates.resolved_at = new Date();

        // Check if resolution was within SLA
        const [currentTicket] = await db
          .select()
          .from(tickets)
          .where(eq(tickets.id, id));
        if (currentTicket?.sla_resolution_due) {
          const wasBreached =
            new Date() > new Date(currentTicket.sla_resolution_due);
          updates.sla_breached = wasBreached;

          if (
            !currentTicket.first_response_at &&
            currentTicket.sla_response_due
          ) {
            updates.first_response_at = new Date();
          }
        }
      }

      if (updates.status === "closed" && !updates.closed_at) {
        updates.closed_at = new Date();
      }

      // If priority changed, recalculate SLA
      if (updates.priority && updates.priority !== currentTicket.priority) {
        const slaTargets = this.calculateSLATargets(
          updates.priority,
          currentTicket.type,
        );
        const baseTime = new Date(currentTicket.created_at);
        const slaResponseDue = new Date(
          baseTime.getTime() + slaTargets.responseTime * 60 * 1000,
        );
        const slaResolutionDue = new Date(
          baseTime.getTime() + slaTargets.resolutionTime * 60 * 1000,
        );

        updates.sla_policy = slaTargets.policy;
        updates.sla_response_time = slaTargets.responseTime;
        updates.sla_resolution_time = slaTargets.resolutionTime;
        updates.sla_response_due = slaResponseDue;
        updates.sla_resolution_due = slaResolutionDue;
        updates.due_date = slaResolutionDue;
        updates.sla_breached = new Date() > slaResolutionDue;
      }

      updates.updated_at = new Date();

      const [updatedTicket] = await db
        .update(tickets)
        .set(updates)
        .where(eq(tickets.id, id))
        .returning();

      if (!updatedTicket) {
        return null;
      }

      // Add comment if provided
      if (comment) {
        await this.addComment(id, {
          comment,
          author_email: userEmail,
          is_internal: false,
        });
      }

      return updatedTicket;
    } catch (error) {
      console.error("Error updating ticket:", error);
      throw error;
    }
  }

  async deleteTicket(id: string): Promise<boolean> {
    const result = await db.delete(tickets).where(eq(tickets.id, id));

    return result.rowCount > 0;
  }

  // Comment Operations
  async addComment(
    ticketId: string,
    commentData: Omit<NewTicketComment, "ticket_id">,
  ): Promise<TicketComment> {
    const [comment] = await db
      .insert(ticketComments)
      .values({
        ...commentData,
        ticket_id: ticketId,
      })
      .returning();

    return comment;
  }

  async getTicketComments(ticketId: string): Promise<TicketComment[]> {
    return await db
      .select()
      .from(ticketComments)
      .where(eq(ticketComments.ticket_id, ticketId))
      .orderBy(desc(ticketComments.created_at));
  }

  // Knowledge Base Operations
  async createKBArticle(
    articleData: NewKnowledgeBaseArticle,
  ): Promise<KnowledgeBaseArticle> {
    const [article] = await db
      .insert(knowledgeBase)
      .values(articleData)
      .returning();

    return article;
  }

  async getKBArticles(
    page: number = 1,
    limit: number = 20,
    filters: { category?: string; search?: string; status?: string } = {},
  ): Promise<PaginatedResult<KnowledgeBaseArticle>> {
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters.category) {
      conditions.push(eq(knowledgeBase.category, filters.category));
    }

    if (filters.status) {
      conditions.push(eq(knowledgeBase.status, filters.status));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(knowledgeBase.title, `%${filters.search}%`),
          like(knowledgeBase.content, `%${filters.search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(knowledgeBase)
      .where(whereClause);

    const data = await db
      .select()
      .from(knowledgeBase)
      .where(whereClause)
      .orderBy(desc(knowledgeBase.created_at))
      .limit(limit)
      .offset(offset);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getKBArticleById(id: string): Promise<KnowledgeBaseArticle | null> {
    const [article] = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.id, id));

    return article || null;
  }

  async updateKBArticle(
    id: string,
    updates: Partial<NewKnowledgeBaseArticle>,
  ): Promise<KnowledgeBaseArticle | null> {
    const [updatedArticle] = await db
      .update(knowledgeBase)
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where(eq(knowledgeBase.id, id))
      .returning();

    return updatedArticle || null;
  }

  async deleteKBArticle(id: string): Promise<boolean> {
    const result = await db
      .delete(knowledgeBase)
      .where(eq(knowledgeBase.id, id));

    return result.rowCount > 0;
  }

  // Export functionality
  async exportTicketsCSV(filters: TicketFilters = {}): Promise<string> {
    const { data: tickets } = await this.getTickets(1, 10000, filters); // Get all matching tickets

    const headers = [
      "Ticket Number",
      "Type",
      "Title",
      "Description",
      "Priority",
      "Status",
      "Requester Email",
      "Assigned To",
      "Category",
      "Created At",
      "Due Date",
    ];

    const csvRows = [
      headers.join(","),
      ...tickets.map((ticket) =>
        [
          ticket.ticket_number,
          ticket.type,
          `"${ticket.title.replace(/"/g, '""')}"`,
          `"${ticket.description.replace(/"/g, '""')}"`,
          ticket.priority,
          ticket.status,
          ticket.requester_email,
          ticket.assigned_to || "",
          ticket.category || "",
          ticket.created_at?.toISOString() || "",
          ticket.due_date?.toISOString() || "",
        ].join(","),
      ),
    ];

    return csvRows.join("\n");
  }

  // Audit logging functionality
  async logAudit(
    entityType: string,
    entityId: string,
    action: string,
    userId?: string,
    userEmail?: string,
    oldValues?: any,
    newValues?: any,
  ) {
    try {
      const changes = this.calculateChanges(oldValues, newValues);

      await db.insert(auditLog).values({
        entity_type: entityType,
        entity_id: entityId,
        action: action,
        user_id: userId || null,
        user_email: userEmail || null,
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        changes: changes ? JSON.stringify(changes) : null,
        ip_address: null,
        user_agent: null,
      });
    } catch (error) {
      console.error("Error logging audit event:", error);
    }
  }

  private calculateChanges(oldValues: any, newValues: any): any {
    if (!oldValues || !newValues) return null;

    const changes: any = {};
    const allKeys = new Set([
      ...Object.keys(oldValues),
      ...Object.keys(newValues),
    ]);

    for (const key of allKeys) {
      if (oldValues[key] !== newValues[key]) {
        changes[key] = {
          from: oldValues[key],
          to: newValues[key],
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  private calculateSLATargets(
    priority: string,
    type: string,
  ): {
    policy: string;
    responseTime: number;
    resolutionTime: number;
  } {
    // SLA targets in minutes based on priority and type
    const slaMatrix = {
      critical: {
        responseTime: 15,
        resolutionTime: type === "incident" ? 240 : 480,
        policy: "P1 - Critical",
      },
      high: {
        responseTime: 60,
        resolutionTime: type === "incident" ? 480 : 1440,
        policy: "P2 - High",
      },
      medium: {
        responseTime: 240,
        resolutionTime: type === "incident" ? 1440 : 2880,
        policy: "P3 - Medium",
      },
      low: {
        responseTime: 480,
        resolutionTime: type === "incident" ? 2880 : 5760,
        policy: "P4 - Low",
      },
    };

    return slaMatrix[priority as keyof typeof slaMatrix] || slaMatrix.medium;
  }

  // Device delete operation
  async deleteDevice(id: string): Promise<boolean> {
    try {
      // First delete all related reports
      await db.delete(device_reports).where(eq(device_reports.device_id, id));

      // Then delete all related alerts
      await db.delete(alerts).where(eq(alerts.device_id, id));

      // Finally delete the device
      const result = await db.delete(devices).where(eq(devices.id, id));

      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting device:", error);
      return false;
    }
  }
}

export const ticketStorage = new TicketStorage();