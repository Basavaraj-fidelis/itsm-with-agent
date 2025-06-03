import { db } from "./db";
import { 
  tickets, 
  ticketComments, 
  knowledgeBase,
  type Ticket, 
  type NewTicket,
  type TicketComment,
  type NewTicketComment,
  type KnowledgeBaseArticle,
  type NewKnowledgeBaseArticle
} from "@shared/ticket-schema";
import { eq, desc, and, or, like, sql, count } from "drizzle-orm";

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
          sql`EXTRACT(YEAR FROM ${tickets.created_at}) = ${year}`
        )
      );

    const nextNumber = (result.count || 0) + 1;
    return `${prefix}-${year}-${nextNumber.toString().padStart(3, '0')}`;
  }

  // CRUD Operations for Tickets
  async createTicket(ticketData: Omit<NewTicket, 'ticket_number'>): Promise<Ticket> {
    const ticket_number = await this.generateTicketNumber(ticketData.type);

    const [newTicket] = await db
      .insert(tickets)
      .values({
        ...ticketData,
        ticket_number,
        status: "new"
      })
      .returning();

    return newTicket;
  }

  async getTickets(
    page: number = 1, 
    limit: number = 20, 
    filters: TicketFilters = {}
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
          like(tickets.ticket_number, `%${filters.search}%`)
        )
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
      totalPages: Math.ceil(total / limit)
    };
  }

  async getTicketById(id: string): Promise<Ticket | null> {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id));

    return ticket || null;
  }

  async updateTicket(id: string, updates: Partial<NewTicket>): Promise<Ticket | null> {
    const [updatedTicket] = await db
      .update(tickets)
      .set({
        ...updates,
        updated_at: new Date()
      })
      .where(eq(tickets.id, id))
      .returning();

    return updatedTicket || null;
  }

  async deleteTicket(id: string): Promise<boolean> {
    const result = await db
      .delete(tickets)
      .where(eq(tickets.id, id));

    return result.rowCount > 0;
  }

  // Comment Operations
  async addComment(ticketId: string, commentData: Omit<NewTicketComment, 'ticket_id'>): Promise<TicketComment> {
    const [comment] = await db
      .insert(ticketComments)
      .values({
        ...commentData,
        ticket_id: ticketId
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
  async createKBArticle(articleData: NewKnowledgeBaseArticle): Promise<KnowledgeBaseArticle> {
    const [article] = await db
      .insert(knowledgeBase)
      .values(articleData)
      .returning();

    return article;
  }

  async getKBArticles(
    page: number = 1,
    limit: number = 20,
    filters: { category?: string; search?: string; status?: string } = {}
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
          like(knowledgeBase.content, `%${filters.search}%`)
        )
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
      totalPages: Math.ceil(total / limit)
    };
  }

  async getKBArticleById(id: string): Promise<KnowledgeBaseArticle | null> {
    const [article] = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.id, id));

    return article || null;
  }

  async updateKBArticle(id: string, updates: Partial<NewKnowledgeBaseArticle>): Promise<KnowledgeBaseArticle | null> {
    const [updatedArticle] = await db
      .update(knowledgeBase)
      .set({
        ...updates,
        updated_at: new Date()
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
      'Ticket Number',
      'Type',
      'Title',
      'Description',
      'Priority',
      'Status',
      'Requester Email',
      'Assigned To',
      'Category',
      'Created At',
      'Due Date'
    ];

    const csvRows = [
      headers.join(','),
      ...tickets.map(ticket => [
        ticket.ticket_number,
        ticket.type,
        `"${ticket.title.replace(/"/g, '""')}"`,
        `"${ticket.description.replace(/"/g, '""')}"`,
        ticket.priority,
        ticket.status,
        ticket.requester_email,
        ticket.assigned_to || '',
        ticket.category || '',
        ticket.created_at?.toISOString() || '',
        ticket.due_date?.toISOString() || ''
      ].join(','))
    ];

    return csvRows.join('\n');
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