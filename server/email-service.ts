
import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  priority?: 'high' | 'normal' | 'low';
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  
  constructor() {
    // Configure your email provider (Gmail, Outlook, etc.)
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'noreply@company.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
      }
    };

    this.transporter = nodemailer.createTransport(config);
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"ITSM System" <${process.env.SMTP_USER || 'noreply@company.com'}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        priority: options.priority || 'normal',
        headers: {
          'X-Priority': options.priority === 'high' ? '1' : '3',
          'X-MSMail-Priority': options.priority === 'high' ? 'High' : 'Normal'
        }
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${options.to}: ${result.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendSLAEscalationEmail(
    recipientEmail: string,
    ticket: any,
    escalationLevel: string,
    minutesUntilBreach: number,
    escalationTarget?: string
  ): Promise<boolean> {
    const isOverdue = minutesUntilBreach < 0;
    const timeText = isOverdue 
      ? `<span style="color: #dc2626; font-weight: bold;">overdue by ${Math.abs(minutesUntilBreach)} minutes</span>`
      : `<span style="color: #ea580c; font-weight: bold;">due in ${minutesUntilBreach} minutes</span>`;

    const priorityColor = {
      'critical': '#dc2626',
      'high': '#ea580c', 
      'medium': '#d97706',
      'low': '#65a30d'
    }[ticket.priority] || '#6b7280';

    const subject = `🚨 SLA ${isOverdue ? 'BREACH' : 'ALERT'}: ${ticket.ticket_number} - ${escalationLevel}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626, #ea580c); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
          .ticket-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid ${priorityColor}; }
          .alert-box { background: ${isOverdue ? '#fef2f2' : '#fff7ed'}; border: 1px solid ${isOverdue ? '#fecaca' : '#fed7aa'}; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; color: white; background: ${priorityColor}; }
          .action-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🚨 SLA Escalation Alert</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">${escalationLevel} - Immediate Action Required</p>
          </div>
          
          <div class="content">
            <div class="alert-box">
              <h3 style="margin: 0 0 10px 0; color: ${isOverdue ? '#dc2626' : '#ea580c'};">
                ${isOverdue ? '⚠️ SLA BREACH DETECTED' : '⏰ SLA DEADLINE APPROACHING'}
              </h3>
              <p style="margin: 0; font-size: 16px;">
                This ticket is <strong>${timeText}</strong> for resolution.
              </p>
            </div>

            <div class="ticket-info">
              <h3 style="margin: 0 0 15px 0;">Ticket Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 5px 0; font-weight: bold;">Ticket:</td><td>${ticket.ticket_number}</td></tr>
                <tr><td style="padding: 5px 0; font-weight: bold;">Title:</td><td>${ticket.title}</td></tr>
                <tr><td style="padding: 5px 0; font-weight: bold;">Priority:</td><td><span class="priority-badge">${ticket.priority.toUpperCase()}</span></td></tr>
                <tr><td style="padding: 5px 0; font-weight: bold;">Status:</td><td>${ticket.status}</td></tr>
                <tr><td style="padding: 5px 0; font-weight: bold;">Assigned To:</td><td>${ticket.assigned_to || 'Unassigned'}</td></tr>
                ${escalationTarget ? `<tr><td style="padding: 5px 0; font-weight: bold;">Escalated To:</td><td>${escalationTarget}</td></tr>` : ''}
                <tr><td style="padding: 5px 0; font-weight: bold;">Created:</td><td>${new Date(ticket.created_at).toLocaleString()}</td></tr>
                <tr><td style="padding: 5px 0; font-weight: bold;">SLA Due:</td><td>${new Date(ticket.sla_resolution_due).toLocaleString()}</td></tr>
              </table>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tickets/${ticket.id}" class="action-button">
                View Ticket Details
              </a>
            </div>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0;">Required Actions:</h4>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Review ticket details and current status</li>
                <li>Take immediate action to resolve the issue</li>
                <li>Update ticket status and add progress comments</li>
                <li>Escalate to next level if unable to resolve</li>
                ${isOverdue ? '<li style="color: #dc2626; font-weight: bold;">Document breach reason and recovery plan</li>' : ''}
              </ul>
            </div>
          </div>

          <div class="footer">
            <p>This is an automated SLA escalation notification from the ITSM System.</p>
            <p>Please do not reply to this email. For support, contact your system administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      priority: isOverdue ? 'high' : 'normal'
    });
  }

  async sendSLASummaryEmail(
    recipientEmail: string,
    alerts: any[],
    dashboardData: any
  ): Promise<boolean> {
    const critical = alerts.filter(a => a.escalationLevel === 3).length;
    const high = alerts.filter(a => a.escalationLevel === 2).length;
    const medium = alerts.filter(a => a.escalationLevel === 1).length;

    const subject = `📊 Daily SLA Summary - ${alerts.length} Active Alerts (${dashboardData.compliance}% Compliance)`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1f2937, #374151); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
          .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .metric-card { background: white; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #e5e7eb; }
          .alert-list { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .alert-item { padding: 10px; border-left: 4px solid #dc2626; margin: 10px 0; background: #fef2f2; }
          .compliance-good { color: #16a34a; font-weight: bold; }
          .compliance-warning { color: #ea580c; font-weight: bold; }
          .compliance-critical { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📊 SLA Management Summary</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Daily Report - ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="content">
            <div style="text-align: center; margin: 20px 0;">
              <h2 style="margin: 0;">SLA Compliance: 
                <span class="${dashboardData.compliance >= 95 ? 'compliance-good' : dashboardData.compliance >= 85 ? 'compliance-warning' : 'compliance-critical'}">
                  ${dashboardData.compliance}%
                </span>
              </h2>
            </div>

            <div class="metrics">
              <div class="metric-card">
                <h3 style="margin: 0; color: #dc2626;">🔴 Critical</h3>
                <p style="font-size: 24px; font-weight: bold; margin: 5px 0;">${critical}</p>
              </div>
              <div class="metric-card">
                <h3 style="margin: 0; color: #ea580c;">🟡 High</h3>
                <p style="font-size: 24px; font-weight: bold; margin: 5px 0;">${high}</p>
              </div>
              <div class="metric-card">
                <h3 style="margin: 0; color: #65a30d;">🟢 Medium</h3>
                <p style="font-size: 24px; font-weight: bold; margin: 5px 0;">${medium}</p>
              </div>
              <div class="metric-card">
                <h3 style="margin: 0; color: #6b7280;">📊 Total Alerts</h3>
                <p style="font-size: 24px; font-weight: bold; margin: 5px 0;">${alerts.length}</p>
              </div>
            </div>

            <div class="alert-list">
              <h3 style="margin: 0 0 15px 0;">Recent Escalations</h3>
              ${alerts.slice(0, 5).map(alert => `
                <div class="alert-item">
                  <strong>${alert.ticketNumber}</strong> (${alert.priority.toUpperCase()}) - 
                  ${alert.minutesUntilBreach < 0 ? 
                    `<span style="color: #dc2626;">Overdue by ${Math.abs(alert.minutesUntilBreach)} minutes</span>` : 
                    `Due in ${alert.minutesUntilBreach} minutes`
                  }
                </div>
              `).join('')}
              ${alerts.length > 5 ? `<p style="text-align: center; margin: 15px 0;">... and ${alerts.length - 5} more alerts</p>` : ''}
            </div>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0;">Action Items:</h4>
              <ul style="margin: 0; padding-left: 20px;">
                ${critical > 0 ? '<li style="color: #dc2626; font-weight: bold;">Immediate attention required for critical breaches</li>' : ''}
                ${high > 0 ? '<li>Review high-priority tickets approaching SLA deadline</li>' : ''}
                <li>Monitor team workload and redistribute if necessary</li>
                <li>Review SLA policies if compliance is below target</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/sla-management" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View SLA Dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      priority: critical > 0 ? 'high' : 'normal'
    });
  }
}

export const emailService = new EmailService();
