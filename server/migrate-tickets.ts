
import { db } from "./db";
import { sql } from "drizzle-orm";

export async function createTicketTables() {
  try {
    console.log("Creating ticket tables...");

    // Create tickets table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_number VARCHAR(20) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        status VARCHAR(20) NOT NULL DEFAULT 'new',
        requester_email VARCHAR(255) NOT NULL,
        assigned_to VARCHAR(255),
        assigned_group VARCHAR(100),
        device_id UUID,
        related_tickets JSON DEFAULT '[]'::json,
        impact VARCHAR(20) DEFAULT 'medium',
        urgency VARCHAR(20) DEFAULT 'medium',
        category VARCHAR(100),
        subcategory VARCHAR(100),
        change_type VARCHAR(50),
        risk_level VARCHAR(20),
        approval_status VARCHAR(20),
        implementation_plan TEXT,
        rollback_plan TEXT,
        scheduled_start TIMESTAMP,
        scheduled_end TIMESTAMP,
        root_cause TEXT,
        workaround TEXT,
        known_error BOOLEAN DEFAULT false,
        tags JSON DEFAULT '[]'::json,
        custom_fields JSON DEFAULT '{}'::json,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        resolved_at TIMESTAMP,
        closed_at TIMESTAMP,
        due_date TIMESTAMP
      )
    `);

    // Create ticket_comments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ticket_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL,
        author_email VARCHAR(255) NOT NULL,
        comment TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT false,
        attachments JSON DEFAULT '[]'::json,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create ticket_attachments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ticket_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL,
        filename VARCHAR(255) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_by VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create ticket_approvals table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ticket_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL,
        approver_email VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL,
        comments TEXT,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create knowledge_base table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        tags JSON DEFAULT '[]'::json,
        author_email VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        views INTEGER DEFAULT 0,
        helpful_votes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create indexes for better performance
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tickets_requester_email ON tickets(requester_email)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_knowledge_base_status ON knowledge_base(status)`);

    console.log("Ticket tables created successfully!");
  } catch (error) {
    console.error("Error creating ticket tables:", error);
    throw error;
  }
}
