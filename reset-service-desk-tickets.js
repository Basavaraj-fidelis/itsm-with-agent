
#!/usr/bin/env node

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { tickets } = require('./shared/ticket-schema');
const { eq } = require('drizzle-orm');

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

// Sample ticket data for each type
const sampleTickets = {
  incident: [
    {
      title: "Email Server Down - Critical Business Impact",
      description: "The main email server (mail.company.com) is completely unresponsive. All staff are unable to send or receive emails. This is affecting customer communications and internal operations.",
      priority: "critical",
      requester_email: "sarah.manager@company.com",
      category: "Infrastructure",
      impact: "high",
      urgency: "critical"
    },
    {
      title: "Network Connectivity Issues in Building A",
      description: "Multiple users in Building A are experiencing intermittent network connectivity issues. Internet access is slow and VPN connections are dropping frequently.",
      priority: "high",
      requester_email: "john.doe@company.com",
      category: "Network",
      impact: "medium",
      urgency: "high"
    },
    {
      title: "Database Performance Degradation",
      description: "The customer database is running extremely slowly. Query response times have increased from 2 seconds to over 30 seconds, affecting the web application performance.",
      priority: "high",
      requester_email: "db.admin@company.com",
      category: "Database",
      impact: "high",
      urgency: "medium"
    },
    {
      title: "Printer Not Working in Reception",
      description: "The main printer in reception area is not responding. It shows an error message 'Paper Jam' but there's no visible jam. Staff cannot print visitor badges or documents.",
      priority: "medium",
      requester_email: "reception@company.com",
      category: "Hardware",
      impact: "low",
      urgency: "medium"
    },
    {
      title: "Login Issues with Accounting Software",
      description: "Three users in the accounting department cannot log into the QuickBooks application. They receive 'Authentication Failed' errors despite using correct credentials.",
      priority: "medium",
      requester_email: "accounting@company.com",
      category: "Application",
      impact: "medium",
      urgency: "medium"
    }
  ],
  request: [
    {
      title: "New Employee Setup - Software Access",
      description: "New hire starting Monday needs access to Microsoft Office 365, Slack, project management tools, and VPN access. Employee: Jane Smith, Department: Marketing, Manager: Tom Wilson.",
      priority: "medium",
      requester_email: "hr@company.com",
      category: "User Management",
      impact: "low",
      urgency: "medium"
    },
    {
      title: "Additional Monitor Request",
      description: "Requesting a second monitor for improved productivity. Current setup has only one 24-inch monitor, would like to add another identical monitor for dual-screen setup.",
      priority: "low",
      requester_email: "developer@company.com",
      category: "Hardware",
      impact: "low",
      urgency: "low"
    },
    {
      title: "Software License Request - Adobe Creative Suite",
      description: "Marketing team needs Adobe Creative Suite license for upcoming campaign work. Specifically need Photoshop, Illustrator, and InDesign for 2 users.",
      priority: "medium",
      requester_email: "marketing.head@company.com",
      category: "Software",
      impact: "medium",
      urgency: "low"
    },
    {
      title: "Email Distribution List Creation",
      description: "Need to create a new email distribution list 'all-sales-team@company.com' that includes all current sales representatives and their managers for company-wide sales announcements.",
      priority: "low",
      requester_email: "sales.manager@company.com",
      category: "Email",
      impact: "low",
      urgency: "low"
    },
    {
      title: "Password Reset - Multiple Accounts",
      description: "User forgot passwords for multiple systems after returning from extended leave: Active Directory, email, CRM system, and project management tool. Need assistance with secure password reset.",
      priority: "medium",
      requester_email: "employee@company.com",
      category: "Security",
      impact: "low",
      urgency: "medium"
    }
  ],
  problem: [
    {
      title: "Recurring Email Delivery Delays",
      description: "Investigation needed into recurring email delivery delays affecting customer communications. Multiple incidents logged over past month. Root cause analysis required to prevent future occurrences.",
      priority: "medium",
      requester_email: "it.manager@company.com",
      category: "Infrastructure",
      impact: "medium",
      urgency: "low",
      root_cause: "Under investigation",
      known_error: false
    },
    {
      title: "Frequent Blue Screen Errors on Workstations",
      description: "Multiple workstations experiencing BSOD errors with MEMORY_MANAGEMENT stop code. Affects 15+ computers across different departments. Pattern analysis needed.",
      priority: "high",
      requester_email: "desktop.support@company.com",
      category: "Hardware",
      impact: "high",
      urgency: "medium",
      root_cause: "Suspected RAM or driver issue",
      known_error: false
    },
    {
      title: "Application Crashes in Customer Portal",
      description: "Customer-facing web portal crashes randomly during peak hours. No clear pattern identified. Affecting customer satisfaction and requiring immediate attention.",
      priority: "high",
      requester_email: "web.admin@company.com",
      category: "Application",
      impact: "high",
      urgency: "high",
      root_cause: "Memory leak suspected",
      known_error: true
    },
    {
      title: "Slow File Server Performance",
      description: "File server performance has degraded significantly over past weeks. File access times increased, affecting productivity across all departments. Comprehensive analysis needed.",
      priority: "medium",
      requester_email: "system.admin@company.com",
      category: "Infrastructure",
      impact: "medium",
      urgency: "medium",
      root_cause: "Disk I/O bottleneck",
      known_error: false
    },
    {
      title: "VPN Connection Timeouts",
      description: "Remote users experiencing frequent VPN disconnections, particularly during video calls. Pattern suggests load balancer or bandwidth issues requiring investigation.",
      priority: "medium",
      requester_email: "network.admin@company.com",
      category: "Network",
      impact: "medium",
      urgency: "medium",
      root_cause: "Under investigation",
      known_error: false
    }
  ],
  change: [
    {
      title: "Server OS Upgrade - Production Database",
      description: "Planned upgrade of production database server from Windows Server 2019 to Windows Server 2022. Includes security patches and performance improvements.",
      priority: "medium",
      requester_email: "db.admin@company.com",
      category: "Infrastructure",
      impact: "high",
      urgency: "low",
      change_type: "normal",
      risk_level: "high",
      approval_status: "pending",
      implementation_plan: "1. Full database backup 2. Schedule maintenance window 3. Upgrade OS 4. Test database functionality 5. Go-live",
      rollback_plan: "Restore from backup and revert to previous OS version",
      scheduled_start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      scheduled_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000) // 6 hours later
    },
    {
      title: "Network Switch Replacement - Data Center",
      description: "Replace aging network switch in main data center. Current switch is end-of-life and causing intermittent connectivity issues.",
      priority: "high",
      requester_email: "network.manager@company.com",
      category: "Hardware",
      impact: "high",
      urgency: "medium",
      change_type: "normal",
      risk_level: "medium",
      approval_status: "approved",
      implementation_plan: "1. Order new switch 2. Configure new switch 3. Schedule maintenance window 4. Replace switch 5. Test connectivity",
      rollback_plan: "Keep old switch as backup and revert if needed",
      scheduled_start: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      scheduled_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000) // 4 hours later
    },
    {
      title: "Software Deployment - CRM System Update",
      description: "Deploy new version of CRM system with enhanced reporting features and bug fixes. Affects all sales and customer service teams.",
      priority: "medium",
      requester_email: "crm.admin@company.com",
      category: "Software",
      impact: "medium",
      urgency: "low",
      change_type: "standard",
      risk_level: "low",
      approval_status: "approved",
      implementation_plan: "1. Deploy to test environment 2. User acceptance testing 3. Deploy to production 4. User training",
      rollback_plan: "Revert to previous CRM version using automated rollback",
      scheduled_start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      scheduled_end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000) // 2 hours later
    },
    {
      title: "Firewall Rule Update - Security Enhancement",
      description: "Update firewall rules to block newly identified malicious IP ranges and enhance security posture. Emergency change due to recent security threats.",
      priority: "critical",
      requester_email: "security.admin@company.com",
      category: "Security",
      impact: "low",
      urgency: "critical",
      change_type: "emergency",
      risk_level: "low",
      approval_status: "approved",
      implementation_plan: "1. Prepare firewall rules 2. Test in staging 3. Apply to production firewall 4. Monitor traffic",
      rollback_plan: "Remove new rules and revert to previous configuration",
      scheduled_start: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
      scheduled_end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000) // 1 hour later
    },
    {
      title: "Email System Migration to Cloud",
      description: "Migrate on-premise email system to Microsoft 365 cloud service. Large-scale change affecting all users. Comprehensive planning and testing required.",
      priority: "high",
      requester_email: "it.director@company.com",
      category: "Infrastructure",
      impact: "critical",
      urgency: "low",
      change_type: "normal",
      risk_level: "high",
      approval_status: "pending",
      implementation_plan: "1. Microsoft 365 setup 2. Pilot group migration 3. User training 4. Full migration 5. Decommission old system",
      rollback_plan: "Revert to on-premise system if critical issues arise",
      scheduled_start: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      scheduled_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000) // 8 hours later
    }
  ]
};

// Generate ticket number
function generateTicketNumber(type, index) {
  const typeMap = {
    incident: 'INC',
    request: 'REQ', 
    problem: 'PRB',
    change: 'CHG'
  };
  
  const year = new Date().getFullYear();
  const paddedIndex = String(index + 1).padStart(3, '0');
  return `${typeMap[type]}-${year}-${paddedIndex}`;
}

// Calculate SLA targets
function calculateSLATargets(priority, type, createdAt) {
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

  const slaData = slaMatrix[priority] || slaMatrix.medium;
  const baseTime = new Date(createdAt);

  return {
    ...slaData,
    responseDue: new Date(baseTime.getTime() + slaData.responseTime * 60 * 1000),
    resolutionDue: new Date(baseTime.getTime() + slaData.resolutionTime * 60 * 1000),
  };
}

async function resetServiceDeskTickets() {
  try {
    console.log('🗑️  Removing all existing tickets...');
    
    // Delete all existing tickets
    await db.delete(tickets);
    console.log('✅ All existing tickets removed');

    console.log('🎫 Creating new sample tickets...');
    
    let totalCreated = 0;
    
    // Create tickets for each type
    for (const [ticketType, ticketList] of Object.entries(sampleTickets)) {
      console.log(`\n📝 Creating ${ticketType} tickets...`);
      
      for (let i = 0; i < ticketList.length; i++) {
        const ticketData = ticketList[i];
        const createdAt = new Date();
        const ticketNumber = generateTicketNumber(ticketType, i);
        
        // Calculate SLA targets
        const slaTargets = calculateSLATargets(ticketData.priority, ticketType, createdAt);
        
        const newTicket = {
          ticket_number: ticketNumber,
          type: ticketType,
          status: 'new',
          created_at: createdAt,
          updated_at: createdAt,
          
          // SLA fields
          sla_policy: slaTargets.policy,
          sla_response_time: slaTargets.responseTime,
          sla_resolution_time: slaTargets.resolutionTime,
          response_due_at: slaTargets.responseDue,
          resolve_due_at: slaTargets.resolutionDue,
          sla_response_due: slaTargets.responseDue,
          sla_resolution_due: slaTargets.resolutionDue,
          due_date: slaTargets.resolutionDue,
          sla_breached: false,
          sla_response_breached: false,
          sla_resolution_breached: false,
          
          ...ticketData
        };
        
        const [createdTicket] = await db.insert(tickets).values(newTicket).returning();
        
        console.log(`✅ Created ${ticketNumber}: ${ticketData.title}`);
        totalCreated++;
      }
    }
    
    console.log(`\n🎉 Service Desk reset complete!`);
    console.log(`📊 Summary:`);
    console.log(`   • Total tickets created: ${totalCreated}`);
    console.log(`   • Incidents: 5`);
    console.log(`   • Requests: 5`);
    console.log(`   • Problems: 5`);
    console.log(`   • Changes: 5`);
    console.log(`\n💡 All tickets have been created with appropriate SLA targets and realistic scenarios.`);
    
  } catch (error) {
    console.error('❌ Error resetting Service Desk tickets:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the script
resetServiceDeskTickets()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
