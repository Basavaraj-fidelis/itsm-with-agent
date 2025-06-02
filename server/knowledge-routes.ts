
import { Router } from "express";
import { db } from "./db";
import { eq } from "drizzle-orm";

const router = Router();

// Knowledge base table schema (we'll add this to the database)
interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  author: string;
}

// Mock data for now
const mockArticles: KnowledgeArticle[] = [
  {
    id: "1",
    title: "How to Install ITSM Agent on Windows",
    content: `# ITSM Agent Installation Guide for Windows

## Prerequisites
- Windows 10 or Windows Server 2016+
- Administrator privileges
- Internet connectivity

## Step-by-Step Installation

### 1. Download the Agent
- Visit the IT Support portal
- Navigate to Downloads > Agent Software
- Download the latest Windows agent installer

### 2. Run the Installer
1. Right-click on the downloaded file
2. Select "Run as administrator"
3. Follow the installation wizard
4. Enter your organization's server URL when prompted

### 3. Configuration
- The agent will automatically configure itself
- A system tray icon will appear when installation is complete
- The agent will begin reporting system metrics within 5 minutes

## Troubleshooting
If installation fails:
- Disable antivirus temporarily
- Check Windows Event Viewer for errors
- Contact IT support with error details`,
    category: "Installation",
    status: "published",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    author: "System Administrator"
  },
  {
    id: "2", 
    title: "Troubleshooting Connection Issues",
    content: `# Agent Connection Troubleshooting

## Common Connection Problems

### Agent Shows Offline Status
**Symptoms:** Agent appears offline in the dashboard despite being installed

**Solutions:**
1. Check network connectivity
2. Verify firewall settings allow outbound connections on port 443
3. Restart the ITSM Agent service
4. Check proxy settings if applicable

### High Latency Reports
**Symptoms:** Slow response times or delayed metric reporting

**Solutions:**
1. Check network bandwidth usage
2. Verify DNS resolution is working properly
3. Test connection to server: ping itsm.yourcompany.com
4. Consider adjusting reporting frequency

### Authentication Errors
**Symptoms:** Agent fails to authenticate with server

**Solutions:**
1. Verify agent configuration file has correct server URL
2. Check if agent certificate has expired
3. Regenerate agent credentials from admin panel
4. Ensure system clock is synchronized

## Getting Help
If these steps don't resolve the issue, please contact IT support with:
- Agent version number
- Error messages from logs
- Screenshot of the problem`,
    category: "Troubleshooting",
    status: "published",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    author: "Technical Support"
  },
  {
    id: "3",
    title: "Understanding Alert Severity Levels",
    content: `# Alert Severity Classification Guide

## Severity Levels

### Critical (Red)
- **Response Time:** Immediate (within 15 minutes)
- **Examples:**
  - Server down
  - Security breach detected
  - Complete service outage
- **Action Required:** Immediate escalation to on-call engineer

### High (Orange)
- **Response Time:** Within 1 hour
- **Examples:**
  - High CPU usage (>90%)
  - Disk space critically low (<5%)
  - Service degradation
- **Action Required:** Investigate and resolve promptly

### Medium (Yellow)
- **Response Time:** Within 4 hours
- **Examples:**
  - Memory usage high (>80%)
  - Failed backup job
  - Non-critical service restart
- **Action Required:** Schedule resolution during business hours

### Low (Blue)
- **Response Time:** Within 24 hours
- **Examples:**
  - Software update available
  - Informational events
  - Routine maintenance notifications
- **Action Required:** Review and plan accordingly

## Auto-Resolution
Some alerts may auto-resolve when conditions return to normal. These will be marked with an "Auto-Resolved" status.`,
    category: "Alerts",
    status: "published",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    author: "System Administrator"
  },
  {
    id: "4",
    title: "Password Reset Instructions",
    content: `# How to Reset Your Password

## Self-Service Password Reset

### Step 1: Access the Reset Portal
1. Go to the company login page
2. Click "Forgot Password?" link
3. Enter your email address
4. Click "Send Reset Link"

### Step 2: Check Your Email
- Check both inbox and spam folders
- Look for email from "noreply@yourcompany.com"
- Click the reset link within 15 minutes

### Step 3: Create New Password
**Password Requirements:**
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@, #, $, etc.)
- Cannot be any of your last 5 passwords

### Step 4: Verify Access
- Try logging in with your new password
- Update saved passwords in your browser
- Update password on mobile devices

## Troubleshooting
**Reset link expired?** Request a new one - links are only valid for 15 minutes

**Not receiving emails?** Check with IT support - your email may be blocked

**Still can't access?** Contact the help desk at ext. 2200`,
    category: "Account Management",
    status: "published",
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    author: "Help Desk Team"
  },
  {
    id: "5",
    title: "VPN Setup for Remote Work",
    content: `# VPN Configuration Guide

## Windows Setup

### Download VPN Client
1. Visit the IT portal Downloads section
2. Download "Company VPN Client"
3. Run installer as administrator

### Configuration
1. Launch VPN client
2. Enter server address: vpn.yourcompany.com
3. Use your regular company username and password
4. Enable "Auto-connect on startup" (recommended)

### First Connection
1. Click "Connect" button
2. Accept security certificate when prompted
3. Wait for "Connected" status
4. Test access to internal resources

## Mobile Setup (iOS/Android)

### iOS
1. Settings > General > VPN
2. Add VPN Configuration
3. Type: IKEv2
4. Description: Company VPN
5. Server: vpn.yourcompany.com
6. Remote ID: vpn.yourcompany.com
7. Local ID: [your username]
8. User Authentication: Username
9. Username: [your company username]
10. Password: [your company password]

### Android
1. Settings > Network & Internet > VPN
2. Add VPN profile
3. Name: Company VPN
4. Type: IKEv2/IPSec PSK
5. Server address: vpn.yourcompany.com
6. IPSec identifier: [leave blank]
7. Pre-shared key: [contact IT for key]

## Usage Guidelines
- Always connect to VPN when working remotely
- Disconnect when finished for security
- Report connection issues immediately
- Don't share VPN credentials

## Troubleshooting
**Can't connect:** Check internet connection first
**Slow speeds:** Try different server if available
**Frequent disconnects:** Update VPN client`,
    category: "Network",
    status: "published",
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    author: "Network Team"
  },
  {
    id: "6",
    title: "Software Installation Requests",
    content: `# How to Request Software Installation

## Approved Software List
Before requesting, check if your needed software is on the pre-approved list:
- Microsoft Office Suite ✓
- Adobe Reader ✓
- Chrome, Firefox, Edge ✓
- Zoom, Teams ✓
- 7-Zip, WinRAR ✓
- Notepad++ ✓

## Request Process

### Step 1: Submit Request
1. Go to IT Service Portal
2. Select "Software Request"
3. Fill out the form with:
   - Software name and version
   - Business justification
   - Manager approval
   - Installation deadline

### Step 2: Approval Process
- Manager approval: 1-2 business days
- IT security review: 2-3 business days
- License procurement (if needed): 1-2 weeks

### Step 3: Installation
- IT will schedule installation
- You'll receive calendar invite
- Installation typically takes 30-60 minutes
- Remote installation available for most software

## Requirements
**Business Justification Examples:**
- "Needed for client presentations"
- "Required for project collaboration"
- "Compliance requirement"
- "Productivity enhancement"

**What to Include:**
- Specific use case
- Number of users
- Duration of need
- Alternative solutions considered

## Denied Requests
Common reasons for denial:
- Security risk identified
- Licensing costs too high
- Alternative solution available
- Not business-related

You'll receive detailed explanation if denied.

## Emergency Installations
For urgent needs:
- Call help desk: ext. 2200
- Explain urgency
- Temporary solutions may be provided
- Full approval still required`,
    category: "Software",
    status: "published",
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    author: "IT Services"
  },
  {
    id: "7",
    title: "Email Security Best Practices",
    content: `# Email Security Guidelines

## Identifying Phishing Emails

### Red Flags
- Urgent language: "Act now!" "Limited time!"
- Suspicious sender addresses
- Generic greetings: "Dear Customer"
- Requests for personal information
- Unexpected attachments
- Poor grammar and spelling

### Common Phishing Attempts
1. **Fake IT alerts**: "Your account will be suspended"
2. **Invoice scams**: Fake bills from unknown vendors
3. **CEO fraud**: Fake urgent requests from executives
4. **Banking alerts**: Fake security notifications

## Safe Email Practices

### Before Clicking Links
1. Hover over links to see real destination
2. Look for HTTPS in URLs
3. Verify sender through separate communication
4. When in doubt, don't click

### Handling Attachments
- Only open expected attachments
- Scan all attachments with antivirus
- Be suspicious of .exe, .zip, .scr files
- Verify sender before opening

### Reporting Suspicious Emails
1. Don't click anything in the email
2. Forward to security@yourcompany.com
3. Mark as phishing in email client
4. Delete the original email

## Password Security
- Use unique passwords for each account
- Enable two-factor authentication
- Use password manager
- Never share passwords via email

## Mobile Email Security
- Use company-approved email apps
- Enable screen lock on mobile devices
- Don't use public Wi-Fi for sensitive emails
- Log out when finished

## What to Do If Compromised
1. Change password immediately
2. Contact IT security: ext. 2911
3. Check sent items for unauthorized emails
4. Review recent account activity
5. Run full antivirus scan

Remember: When in doubt, ask! Security team is here to help.`,
    category: "Security",
    status: "published",
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    author: "Security Team"
  },
  {
    id: "8",
    title: "Printer Setup and Troubleshooting",
    content: `# Printer Configuration Guide

## Adding Network Printers

### Windows 10/11
1. Settings > Devices > Printers & scanners
2. Click "Add a printer or scanner"
3. Select your printer from the list
4. If not found, click "The printer that I want isn't listed"
5. Enter printer name: \\\\printserver\\[printer name]
6. Follow setup wizard

### Common Office Printers
- **Main Office Color**: \\\\printserver\\MainColor
- **Reception B&W**: \\\\printserver\\Reception
- **Conference Room**: \\\\printserver\\Conference
- **Finance Secure**: \\\\printserver\\FinanceSecure

## Mobile Printing

### iOS
1. Ensure device is on company Wi-Fi
2. Open document to print
3. Tap Share > Print
4. Select appropriate printer
5. Choose print options
6. Tap Print

### Android
1. Install "Company Print Service" app
2. Settings > Connected devices > Connection preferences
3. Enable "Company Print Service"
4. Print from any app using standard print menu

## Troubleshooting

### Printer Not Found
1. Check network connection
2. Restart print spooler service
3. Remove and re-add printer
4. Contact IT if still not visible

### Print Jobs Stuck
1. Cancel all print jobs
2. Restart printer
3. Restart print spooler on computer
4. Try printing a test page

### Poor Print Quality
1. Check toner/ink levels
2. Clean print heads
3. Check paper type settings
4. Submit supply request if low

### Paper Jams
1. Turn off printer
2. Remove all paper carefully
3. Check for torn pieces
4. Close all trays and covers
5. Turn printer back on

## Supply Requests
- Submit supply requests through IT portal
- Include printer location and supply type
- Normal delivery: 2-3 business days
- Emergency supplies available from reception

## Secure Printing
For confidential documents:
1. Select "Secure Print" in print dialog
2. Enter 4-digit PIN
3. Go to printer within 4 hours
4. Enter PIN on printer display
5. Document prints immediately`,
    category: "Hardware",
    status: "published",
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    author: "IT Services"
  }
];

// Get all articles
router.get("/", (req, res) => {
  res.json(mockArticles.filter(article => article.status === 'published'));
});

// Get article by ID
router.get("/:id", (req, res) => {
  const article = mockArticles.find(a => a.id === req.params.id);
  if (!article) {
    return res.status(404).json({ message: "Article not found" });
  }
  res.json(article);
});

// Create new article
router.post("/", (req, res) => {
  const { title, content, category } = req.body;
  const newArticle: KnowledgeArticle = {
    id: Date.now().toString(),
    title,
    content,
    category,
    status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: "System Administrator"
  };
  mockArticles.push(newArticle);
  res.status(201).json(newArticle);
});

export { router as knowledgeRoutes };
