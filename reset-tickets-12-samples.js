
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

const sampleTickets = [
  // 3 INCIDENTS
  {
    type: 'incident',
    title: 'Email Server Down - Exchange Offline',
    description: 'Exchange server is completely unresponsive. All users unable to send/receive emails. Critical business impact.',
    priority: 'critical',
    requester_email: 'admin@company.com',
    category: 'Email System',
    impact: 'critical',
    urgency: 'critical',
    status: 'new'
  },
  {
    type: 'incident',
    title: 'Network Printer Offline in Finance',
    description: 'Main HP printer in Finance department showing offline status. Cannot print invoices or reports.',
    priority: 'high',
    requester_email: 'finance@company.com',
    category: 'Hardware',
    impact: 'high',
    urgency: 'high',
    status: 'assigned'
  },
  {
    type: 'incident',
    title: 'WiFi Connection Issues Building A',
    description: 'Intermittent WiFi connectivity in Building A, 3rd floor. Multiple users affected.',
    priority: 'medium',
    requester_email: 'facilities@company.com',
    category: 'Network',
    impact: 'medium',
    urgency: 'medium',
    status: 'in_progress'
  },

  // 3 SERVICE REQUESTS
  {
    type: 'request',
    title: 'New Employee Software Setup',
    description: 'Setup Microsoft Office 365, Teams, and development tools for new hire John Smith starting Monday.',
    priority: 'medium',
    requester_email: 'hr@company.com',
    category: 'Software Installation',
    impact: 'low',
    urgency: 'medium',
    status: 'new'
  },
  {
    type: 'request',
    title: 'VPN Access for Remote Work',
    description: 'Employee needs VPN access setup for remote work. Will be working from home 3 days per week.',
    priority: 'medium',
    requester_email: 'mary.johnson@company.com',
    category: 'Network Access',
    impact: 'medium',
    urgency: 'medium',
    status: 'assigned'
  },
  {
    type: 'request',
    title: 'Additional Monitor Request',
    description: 'Request for dual monitor setup for improved productivity in accounting department.',
    priority: 'low',
    requester_email: 'accounting@company.com',
    category: 'Hardware',
    impact: 'low',
    urgency: 'low',
    status: 'pending'
  },

  // 3 PROBLEMS
  {
    type: 'problem',
    title: 'Recurring Blue Screen Errors',
    description: 'Multiple workstations experiencing BSOD errors. Pattern suggests driver compatibility issue.',
    priority: 'high',
    requester_email: 'it.analyst@company.com',
    category: 'System Stability',
    impact: 'high',
    urgency: 'medium',
    status: 'new',
    root_cause: 'Incompatible graphics driver with recent Windows update',
    workaround: 'Roll back graphics driver to previous version'
  },
  {
    type: 'problem',
    title: 'Slow Database Performance',
    description: 'CRM database queries taking significantly longer than normal. Affecting sales team productivity.',
    priority: 'high',
    requester_email: 'dba@company.com',
    category: 'Database',
    impact: 'high',
    urgency: 'high',
    status: 'assigned',
    root_cause: 'Database index fragmentation after data migration',
    workaround: 'Use simplified queries where possible'
  },
  {
    type: 'problem',
    title: 'File Share Access Delays',
    description: 'Users experiencing 30-60 second delays accessing shared drives during peak hours.',
    priority: 'medium',
    requester_email: 'network.admin@company.com',
    category: 'Network Storage',
    impact: 'medium',
    urgency: 'medium',
    status: 'in_progress',
    known_error: true
  },

  // 3 CHANGES
  {
    type: 'change',
    title: 'Server OS Upgrade to Windows Server 2022',
    description: 'Upgrade file server from Windows Server 2019 to 2022 for enhanced security and performance.',
    priority: 'medium',
    requester_email: 'system.admin@company.com',
    category: 'System Upgrade',
    impact: 'high',
    urgency: 'low',
    status: 'pending',
    change_type: 'normal',
    risk_level: 'medium',
    approval_status: 'pending',
    implementation_plan: '1. Backup data\n2. Schedule maintenance window\n3. Perform upgrade\n4. Test services',
    rollback_plan: 'Restore from backup if upgrade fails',
    scheduled_start: new Date('2025-02-15T22:00:00Z'),
    scheduled_end: new Date('2025-02-16T06:00:00Z')
  },
  {
    type: 'change',
    title: 'Firewall Rule Update for New CRM',
    description: 'Add firewall rules to allow traffic for new CRM application on ports 8080 and 8443.',
    priority: 'medium',
    requester_email: 'security.admin@company.com',
    category: 'Security',
    impact: 'low',
    urgency: 'medium',
    status: 'approved',
    change_type: 'standard',
    risk_level: 'low',
    approval_status: 'approved',
    implementation_plan: '1. Test rules in staging\n2. Implement during maintenance\n3. Verify connectivity',
    rollback_plan: 'Remove firewall rules if issues occur'
  },
  {
    type: 'change',
    title: 'Emergency Security Patch Deployment',
    description: 'Deploy critical security patches for recently discovered vulnerability in web servers.',
    priority: 'critical',
    requester_email: 'security.team@company.com',
    category: 'Security Patch',
    impact: 'critical',
    urgency: 'critical',
    status: 'approved',
    change_type: 'emergency',
    risk_level: 'high',
    approval_status: 'approved',
    implementation_plan: 'Immediate deployment to all web servers with rolling restart',
    rollback_plan: 'Restore from backup if patches cause service disruption'
  }
];

async function generateTicketNumber(type) {
  const year = new Date().getFullYear();
  const prefix = type.toUpperCase().substring(0, 3);
  
  // Get count of tickets of this type this year
  const result = await pool.query(`
    SELECT COUNT(*) as count 
    FROM tickets 
    WHERE type = $1 AND EXTRACT(YEAR FROM created_at) = $2
  `, [type, year]);
  
  const nextNumber = (parseInt(result.rows[0].count) || 0) + 1;
  return `${prefix}-${year}-${nextNumber.toString().padStart(4, '0')}`;
}

async function resetTicketsTo12Samples() {
  try {
    console.log("🗑️  Clearing all existing tickets...\n");
    
    // Delete all ticket comments first (foreign key constraint)
    await pool.query('DELETE FROM ticket_comments');
    console.log("✅ Deleted all ticket comments");
    
    // Delete all ticket attachments
    await pool.query('DELETE FROM ticket_attachments');
    console.log("✅ Deleted all ticket attachments");
    
    // Delete all ticket approvals
    await pool.query('DELETE FROM ticket_approvals');
    console.log("✅ Deleted all ticket approvals");
    
    // Delete all tickets
    await pool.query('DELETE FROM tickets');
    console.log("✅ Deleted all existing tickets");
    
    console.log("\n🎫 Creating 12 new sample tickets (3 of each type)...\n");
    
    for (const ticket of sampleTickets) {
      const ticketNumber = await generateTicketNumber(ticket.type);
      
      const insertQuery = `
        INSERT INTO tickets (
          ticket_number, type, title, description, priority, status,
          requester_email, category, impact, urgency, root_cause, 
          workaround, known_error, change_type, risk_level, 
          approval_status, implementation_plan, rollback_plan,
          scheduled_start, scheduled_end, sla_policy, sla_response_time,
          sla_resolution_time, sla_breached
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING id, ticket_number, title, type;
      `;
      
      const values = [
        ticketNumber,
        ticket.type,
        ticket.title,
        ticket.description,
        ticket.priority,
        ticket.status,
        ticket.requester_email,
        ticket.category,
        ticket.impact,
        ticket.urgency,
        ticket.root_cause || null,
        ticket.workaround || null,
        ticket.known_error || false,
        ticket.change_type || null,
        ticket.risk_level || null,
        ticket.approval_status || null,
        ticket.implementation_plan || null,
        ticket.rollback_plan || null,
        ticket.scheduled_start || null,
        ticket.scheduled_end || null,
        'Standard SLA',
        240, // 4 hours response time in minutes
        1440, // 24 hours resolution time in minutes  
        false // sla_breached
      ];
      
      const result = await pool.query(insertQuery, values);
      const created = result.rows[0];
      
      console.log(`✅ Created ${ticket.type.toUpperCase()} ticket: ${created.ticket_number} - ${created.title}`);
    }
    
    console.log("\n📊 Final ticket summary:");
    console.log("- 3 Incidents (Email server, Printer, WiFi issues)");
    console.log("- 3 Service Requests (Software setup, VPN access, Monitor request)");
    console.log("- 3 Problems (BSOD errors, Database performance, File share delays)");
    console.log("- 3 Changes (OS upgrade, Firewall rules, Security patches)");
    
    // Show current ticket counts by type
    const countResult = await pool.query(`
      SELECT type, COUNT(*) as count 
      FROM tickets 
      GROUP BY type 
      ORDER BY type;
    `);
    
    console.log("\n📈 Ticket counts by type:");
    countResult.rows.forEach(row => {
      console.log(`  ${row.type}: ${row.count} tickets`);
    });
    
    // Show ticket counts by status
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM tickets 
      GROUP BY status 
      ORDER BY status;
    `);
    
    console.log("\n📋 Ticket counts by status:");
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} tickets`);
    });
    
    console.log("\n🎉 Successfully reset to 12 sample tickets!");
    
  } catch (error) {
    console.error("❌ Error resetting tickets:", error);
  } finally {
    await pool.end();
  }
}

resetTicketsTo12Samples();
