import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

const sampleTickets = [
  // INCIDENT TICKETS
  {
    type: 'incident',
    title: 'Email Server Down - Exchange Connectivity Issues',
    description: `Multiple users across the organization are unable to access their email through Outlook. The Exchange server appears to be unresponsive.

**Symptoms:**
- Outlook shows "Cannot connect to server" error
- Webmail access is also affected
- Last working: 2 hours ago

**Impact:** 
- All departments affected
- Critical business communication disrupted
- External email communication stopped

**Troubleshooting attempted:**
- Restarted Exchange services
- Checked network connectivity
- Verified DNS resolution

**Next steps needed:**
- Full server diagnostics
- Database integrity check
- Possible hardware investigation`,
    priority: 'critical',
    requester_email: 'admin@company.com',
    category: 'Email System',
    impact: 'critical',
    urgency: 'critical',
    status: 'new',
    assigned_to: null,
    assigned_group: null
  },
  {
    type: 'incident', 
    title: 'Printer Queue Stuck in Accounts Department',
    description: `The main printer in the Accounts department (HP LaserJet Pro 4015) has multiple jobs stuck in the print queue. Users are unable to print invoices and reports.

**Details:**
- 15+ print jobs stuck in queue
- Printer shows "Ready" status
- Jobs won't cancel from queue
- Tried restarting printer - no change

**Business Impact:**
- Invoice processing delayed
- End-of-month reports cannot be printed
- Payroll processing affected

**Attempted Solutions:**
- Cleared print queue manually
- Restarted Print Spooler service
- Reinstalled printer drivers on one PC

**Required:**
- Server-side print queue investigation
- Possible driver updates across all computers`,
    priority: 'high',
    requester_email: 'accounts@company.com', 
    category: 'Hardware',
    impact: 'high',
    urgency: 'high',
    status: 'new',
    assigned_to: null,
    assigned_group: null
  },

  // SERVICE REQUEST TICKETS  
  {
    type: 'request',
    title: 'New Employee Onboarding - Software Setup Required',
    description: `New hire John Smith starting Monday, March 18th requires complete IT setup.

**Required Software:**
- Microsoft Office 365 (Word, Excel, PowerPoint, Outlook)
- Adobe Acrobat Reader DC
- Company VPN client
- Zoom desktop application
- Slack for team communication
- Accounting software (QuickBooks Desktop)

**Hardware Setup:**
- Desktop computer assignment
- Dual monitor configuration
- Printer access configuration
- Network drive mapping

**Account Creation:**
- Active Directory user account
- Email account setup
- VPN access credentials
- Software licensing assignments

**Department:** Sales
**Manager:** Sarah Johnson
**Start Date:** March 18, 2024
**Equipment Location:** Desk 15, Floor 2`,
    priority: 'medium',
    requester_email: 'hr@company.com',
    category: 'User Onboarding',
    impact: 'low',
    urgency: 'medium', 
    status: 'assigned',
    assigned_to: 'sridhara.s@fidelisgroup.in',
    assigned_group: 'Management Team'
  },
  {
    type: 'request',
    title: 'Additional Software License Request - Project Management Tool',
    description: `The Marketing department is requesting licenses for project management software to improve team collaboration and project tracking.

**Software Requested:** Microsoft Project Professional 2021
**Number of Licenses:** 5 users
**Department:** Marketing
**Budget Approval:** Yes (Budget code: MKTG-2024-SW-001)

**Business Justification:**
- Current project tracking is manual and inefficient
- Multiple projects running simultaneously need better coordination
- Client deliverables tracking requires professional tools
- Integration with existing Office 365 needed

**Users Requiring Access:**
1. Marketing Manager - Lisa Chen
2. Project Coordinator - Mike Davis  
3. Content Specialist - Anna Rodriguez
4. Digital Marketing Lead - Tom Wilson
5. Campaign Manager - Rachel Green

**Timeline:** Required by end of current month for Q2 project planning

**Alternative Considered:** 
Evaluated free alternatives but require advanced features like Gantt charts, resource management, and Office integration.`,
    priority: 'low',
    requester_email: 'marketing@company.com',
    category: 'Software Licensing', 
    impact: 'low',
    urgency: 'low',
    status: 'pending',
    assigned_to: 'sridhara.s@fidelisgroup.in',
    assigned_group: 'Management Team'
  },

  // PROBLEM TICKETS
  {
    type: 'problem',
    title: 'Recurring Network Connectivity Issues During Peak Hours',
    description: `Multiple users report intermittent network connectivity issues between 9:00 AM - 11:00 AM and 2:00 PM - 4:00 PM daily.

**Pattern Analysis:**
- Issues occur during high usage periods
- Affects both wired and wireless connections
- Internet browsing becomes slow (pages timeout)
- Internal network resources also affected
- VoIP calls dropping frequently

**Affected Areas:**
- Floor 2: Sales department (20 users)
- Floor 3: Marketing department (15 users) 
- Conference rooms intermittently

**Network Infrastructure:**
- Main switch: Cisco Catalyst 3850
- Wireless APs: Ubiquiti UniFi 6 Pro
- Internet connection: 500 Mbps fiber
- Firewall: SonicWall TZ370

**Investigation Findings:**
- Bandwidth utilization peaks at 85% during affected hours
- Switch CPU usage normal
- No hardware errors in logs
- QoS policies may need adjustment

**Root Cause Hypothesis:**
Insufficient bandwidth allocation for video conferencing and cloud application usage during peak productivity hours.

**Workaround:** 
Advised users to schedule large file transfers outside peak hours.`,
    priority: 'high',
    requester_email: 'network.admin@company.com',
    category: 'Network Infrastructure',
    impact: 'high', 
    urgency: 'medium',
    status: 'assigned',
    assigned_to: 'chetan.n@fidelisgroup.in',
    assigned_group: 'Technical Team',
    root_cause: 'Insufficient bandwidth allocation and lack of QoS policies for business-critical applications',
    workaround: 'Schedule non-critical activities outside peak hours, prioritize VoIP and business applications'
  },

  // CHANGE REQUEST TICKETS
  {
    type: 'change',
    title: 'Windows Server 2019 to 2022 Upgrade - File Server Migration',
    description: `Planned upgrade of primary file server from Windows Server 2019 to Windows Server 2022 for enhanced security and performance.

**Current Environment:**
- Server: Dell PowerEdge R740
- OS: Windows Server 2019 Standard
- Storage: 10TB RAID 5 configuration
- Services: File sharing, print services, backup target

**Upgrade Objectives:**
- Enhanced security features
- Improved performance and stability  
- Extended support lifecycle
- New backup and recovery features
- Better integration with cloud services

**Implementation Plan:**
1. **Preparation Phase (Week 1)**
   - Complete system backup
   - Document current configuration
   - Prepare Windows Server 2022 installation media
   - Schedule user communications

2. **Migration Phase (Weekend)**
   - Friday 6 PM: Begin backup verification
   - Saturday 8 AM: Start server upgrade
   - Saturday 2 PM: Service configuration
   - Saturday 6 PM: Testing and validation
   - Sunday 10 AM: Final testing

3. **Post-Implementation (Week 2)**
   - Monitor performance and stability
   - User training on any interface changes
   - Documentation updates

**Risk Assessment:**
- **High Impact:** File access disruption
- **Mitigation:** Complete backup and rollback plan
- **Duration:** Maximum 48-hour maintenance window

**Rollback Plan:**
Restore from backup if critical issues encountered within 24 hours of upgrade completion.`,
    priority: 'medium',
    requester_email: 'system.admin@company.com', 
    category: 'Infrastructure Upgrade',
    impact: 'high',
    urgency: 'low',
    status: 'pending',
    assigned_to: 'sridhara.s@fidelisgroup.in',
    assigned_group: 'Management Team',
    change_type: 'normal',
    risk_level: 'medium',
    approval_status: 'pending',
    implementation_plan: `Phase 1: Backup and preparation (Week 1)
Phase 2: Server upgrade execution (Weekend maintenance window)  
Phase 3: Testing and validation (48 hours)
Phase 4: Production deployment and monitoring`,
    rollback_plan: 'Complete system restore from verified backup if critical issues arise within 24 hours',
    scheduled_start: new Date('2024-03-23T18:00:00Z'),
    scheduled_end: new Date('2024-03-25T06:00:00Z')
  }
];

async function generateTicketNumber(type) {
  const year = new Date().getFullYear();
  const prefix = type.toUpperCase().substring(0, 3);

  const result = await pool.query(`
    SELECT COUNT(*) as count 
    FROM tickets 
    WHERE type = $1 AND EXTRACT(YEAR FROM created_at) = $2
  `, [type, year]);

  const nextNumber = (parseInt(result.rows[0].count) || 0) + 1;
  return `${prefix}-${year}-${nextNumber.toString().padStart(4, '0')}`;
}

async function addComprehensiveTickets() {
  try {
    console.log("🎫 Creating comprehensive tickets with assignments...\n");

    for (const ticket of sampleTickets) {
      const ticketNumber = await generateTicketNumber(ticket.type);

      const insertQuery = `
        INSERT INTO tickets (
          ticket_number, type, title, description, priority, status,
          requester_email, category, impact, urgency, assigned_to,
          assigned_group, root_cause, workaround, change_type, 
          risk_level, approval_status, implementation_plan, 
          rollback_plan, scheduled_start, scheduled_end,
          sla_policy, sla_response_time, sla_resolution_time, sla_breached
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        RETURNING id, ticket_number, title, type, assigned_to, assigned_group;
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
        ticket.assigned_to || null,
        ticket.assigned_group || null,
        ticket.root_cause || null,
        ticket.workaround || null,
        ticket.change_type || null,
        ticket.risk_level || null,
        ticket.approval_status || null,
        ticket.implementation_plan || null,
        ticket.rollback_plan || null,
        ticket.scheduled_start || null,
        ticket.scheduled_end || null,
        'Standard SLA',
        ticket.priority === 'critical' ? 60 : ticket.priority === 'high' ? 120 : 240, // Response time in minutes
        ticket.priority === 'critical' ? 480 : ticket.priority === 'high' ? 1440 : 2880, // Resolution time in minutes
        false
      ];

      const result = await pool.query(insertQuery, values);
      const created = result.rows[0];

      console.log(`✅ Created ${ticket.type.toUpperCase()} ticket: ${created.ticket_number}`);
      console.log(`   📋 ${created.title}`);
      if (created.assigned_to) {
        console.log(`   👤 Assigned to: ${created.assigned_to} (${created.assigned_group})`);
      }
      console.log('');
    }

    console.log("📊 Ticket creation summary:");

    // Show tickets by type
    const typeResult = await pool.query(`
      SELECT type, COUNT(*) as count 
      FROM tickets 
      GROUP BY type 
      ORDER BY type;
    `);

    console.log("\n📈 Tickets by type:");
    typeResult.rows.forEach(row => {
      console.log(`  ${row.type}: ${row.count} tickets`);
    });

    // Show tickets by assignment
    const assignmentResult = await pool.query(`
      SELECT 
        COALESCE(assigned_group, 'Unassigned') as group_name,
        COALESCE(assigned_to, 'Unassigned') as assigned_user,
        COUNT(*) as count
      FROM tickets 
      GROUP BY assigned_group, assigned_to
      ORDER BY assigned_group, assigned_to;
    `);

    console.log("\n👥 Tickets by assignment:");
    assignmentResult.rows.forEach(row => {
      console.log(`  ${row.group_name} - ${row.assigned_user}: ${row.count} tickets`);
    });

    // Show tickets by priority
    const priorityResult = await pool.query(`
      SELECT priority, COUNT(*) as count 
      FROM tickets 
      GROUP BY priority 
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END;
    `);

    console.log("\n🚨 Tickets by priority:");
    priorityResult.rows.forEach(row => {
      console.log(`  ${row.priority}: ${row.count} tickets`);
    });

    console.log("\n🎉 Comprehensive tickets created successfully!");

  } catch (error) {
    console.error("❌ Error creating tickets:", error);
  } finally {
    await pool.end();
  }
}

addComprehensiveTickets();