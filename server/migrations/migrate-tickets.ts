import { db, pool } from "../db";
import { sql } from "drizzle-orm";
import { tickets, ticketComments, ticketAttachments } from "@shared/ticket-schema";

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
        sla_policy VARCHAR(100) DEFAULT 'Standard SLA',
        sla_response_time INTEGER DEFAULT 240,
        sla_resolution_time INTEGER DEFAULT 1440,
        sla_response_due TIMESTAMP,
        sla_resolution_due TIMESTAMP,
        first_response_at TIMESTAMP,
        sla_breached BOOLEAN DEFAULT false,
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

    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        department TEXT,
        phone TEXT,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create user_sessions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create indexes for users
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`);

    // Create USB devices table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS usb_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID,
        device_identifier TEXT NOT NULL,
        description TEXT,
        vendor_id TEXT,
        product_id TEXT,
        manufacturer TEXT,
        serial_number TEXT,
        device_class TEXT,
        location TEXT,
        speed TEXT,
        first_seen TIMESTAMP DEFAULT NOW() NOT NULL,
        last_seen TIMESTAMP DEFAULT NOW() NOT NULL,
        is_connected BOOLEAN DEFAULT TRUE,
        raw_data JSON DEFAULT '{}'::json
      )
    `);

    // Create index for usb_devices
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_usb_devices_device_id ON usb_devices(device_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_usb_devices_identifier ON usb_devices(device_id, device_identifier)`);

    console.log("All tables created successfully!");
  } catch (error) {
    console.error("Error creating ticket tables:", error);
    throw error;
  }
}