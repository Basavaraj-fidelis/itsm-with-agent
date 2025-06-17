
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

const knowledgeBaseArticles = [
  {
    title: "How to Reset Your Windows Password",
    content: `# Password Reset Guide

## For Domain Users (Office Computers)
1. Press Ctrl+Alt+Delete on the login screen
2. Click "Change a password"
3. Enter your old password and new password
4. Click OK to confirm

## For Local Accounts
1. Go to Settings > Accounts > Sign-in options
2. Click "Password" and then "Change"
3. Enter your current password
4. Enter your new password twice
5. Click "Next" to save

## Password Requirements
- Minimum 8 characters
- Include uppercase and lowercase letters
- Include at least one number
- Include at least one special character (!@#$%^&*)

## If You Forgot Your Password
Contact IT Support at support@company.com or call extension 1234.`,
    category: "Account Management",
    tags: ["password", "login", "security", "windows"],
    author_email: "support@company.com",
    status: "published"
  },
  {
    title: "Troubleshooting Slow Computer Performance",
    content: `# Fixing Slow Computer Performance

## Quick Fixes
1. **Restart your computer** - Solves 80% of performance issues
2. **Close unnecessary programs** - Check system tray and task manager
3. **Clear browser cache** - Delete temporary internet files
4. **Run disk cleanup** - Remove temporary files and recycle bin

## Check Available Storage
1. Open File Explorer
2. Right-click on C: drive
3. Select Properties
4. If less than 15% free space, delete unnecessary files

## Performance Troubleshooting Steps
1. Press Ctrl+Shift+Esc to open Task Manager
2. Click "More details" if needed
3. Check CPU and Memory usage
4. End tasks using high resources (if safe to do so)

## When to Contact IT
- Computer takes more than 5 minutes to boot
- Frequent blue screen errors
- Hardware making unusual noises
- Performance doesn't improve after restart`,
    category: "Troubleshooting",
    tags: ["performance", "slow", "optimization", "troubleshooting"],
    author_email: "support@company.com",
    status: "published"
  },
  {
    title: "Setting Up Email on Mobile Devices",
    content: `# Mobile Email Setup Guide

## For iPhone/iPad
1. Go to Settings > Mail > Accounts
2. Tap "Add Account"
3. Select "Microsoft Exchange" or "Other"
4. Enter your work email and password
5. Tap "Next" and follow prompts

## For Android Devices
1. Open Gmail app or Email app
2. Tap "Add account"
3. Select "Exchange" or "Other"
4. Enter your email address
5. Choose "Exchange" when prompted
6. Enter server settings if required

## Server Settings (if needed)
- **Incoming Server**: mail.company.com
- **Port**: 993 (IMAP) or 995 (POP)
- **Security**: SSL/TLS
- **Outgoing Server**: smtp.company.com
- **Port**: 587 or 465

## Troubleshooting
- Ensure you're connected to WiFi or cellular data
- Check email address spelling
- Try removing and re-adding the account
- Contact IT if you get certificate errors`,
    category: "Email Setup",
    tags: ["email", "mobile", "setup", "iphone", "android"],
    author_email: "support@company.com",
    status: "published"
  },
  {
    title: "Connecting to Company WiFi",
    content: `# WiFi Connection Guide

## Windows 10/11
1. Click WiFi icon in system tray
2. Select "CompanyWiFi" network
3. Click "Connect"
4. Enter network password when prompted
5. Check "Connect automatically" for future connections

## Troubleshooting WiFi Issues
1. **Forget and reconnect**
   - Right-click WiFi network
   - Select "Forget"
   - Reconnect with password

2. **Reset network adapter**
   - Go to Settings > Network & Internet
   - Click "Network reset"
   - Restart computer

3. **Update WiFi drivers**
   - Right-click Start button
   - Select Device Manager
   - Expand Network adapters
   - Right-click WiFi adapter > Update driver

## Common Issues
- **Can't see company network**: Check if you're in range
- **Wrong password error**: Verify with IT department
- **Connected but no internet**: Try different DNS servers (8.8.8.8)

## Guest Network Access
Use "CompanyGuest" network for personal devices with password: Guest2024`,
    category: "Network",
    tags: ["wifi", "network", "connection", "troubleshooting"],
    author_email: "support@company.com",
    status: "published"
  },
  {
    title: "VPN Setup and Connection Guide",
    content: `# VPN Setup for Remote Work

## Windows VPN Setup
1. Go to Settings > Network & Internet > VPN
2. Click "Add a VPN connection"
3. Fill in the details:
   - **VPN provider**: Windows (built-in)
   - **Connection name**: Company VPN
   - **Server name**: vpn.company.com
   - **VPN type**: IKEv2
   - **Username**: Your company username
   - **Password**: Your company password

## Connecting to VPN
1. Click network icon in system tray
2. Select "Company VPN"
3. Click "Connect"
4. Enter credentials if prompted

## Troubleshooting VPN Issues
- **Can't connect**: Check internet connection first
- **Slow connection**: Try different VPN server
- **Blocked websites**: Clear browser cache and cookies
- **Connection drops**: Enable "Connect automatically"

## Mobile VPN Setup
Download "Company VPN" app from your device's app store and use your work credentials.

## When to Use VPN
- Working from home
- Using public WiFi
- Accessing company resources remotely
- Required for all remote connections`,
    category: "Network Access",
    tags: ["vpn", "remote", "security", "connection"],
    author_email: "support@company.com",
    status: "published"
  },
  {
    title: "Printer Setup and Troubleshooting",
    content: `# Printer Setup Guide

## Adding Network Printer
1. Go to Settings > Devices > Printers & scanners
2. Click "Add a printer or scanner"
3. Select your printer from the list
4. If not found, click "The printer that I want isn't listed"
5. Enter printer IP address or name

## Common Printer Issues

### Paper Jam
1. Turn off printer
2. Open all printer doors/trays
3. Gently remove visible paper (pull in direction of paper path)
4. Check for small torn pieces
5. Close all doors and turn on printer

### Print Quality Issues
- **Faded prints**: Replace toner/ink cartridge
- **Streaks**: Clean printer heads
- **Blank pages**: Check cartridge installation

### Connection Problems
1. Check power and USB/network cables
2. Restart printer and computer
3. Reinstall printer drivers
4. Check printer queue for stuck jobs

## Office Printers
- **Floor 1**: HP LaserJet Pro (IP: 192.168.1.10)
- **Floor 2**: Canon ImageRunner (IP: 192.168.1.11)
- **Conference Room**: Canon Pixma (IP: 192.168.1.12)

Default username/password for direct access: admin/admin`,
    category: "Hardware",
    tags: ["printer", "printing", "troubleshooting", "setup"],
    author_email: "support@company.com",
    status: "published"
  },
  {
    title: "Microsoft Office Installation and Activation",
    content: `# Microsoft Office Setup

## Installation from Company Portal
1. Open Company Portal app or website
2. Go to "Software" section
3. Find "Microsoft Office 365"
4. Click "Install"
5. Follow installation prompts

## Manual Installation
1. Go to office.com
2. Sign in with your work email
3. Click "Install Office"
4. Download and run the installer
5. Sign in when prompted

## Activation Issues
If Office shows "Product Activation Required":
1. Open any Office app (Word, Excel, etc.)
2. Click "Sign In" in top right
3. Use your work email and password
4. Office should activate automatically

## Common Issues
- **Can't sign in**: Check email address format
- **Subscription error**: Verify with IT department
- **Installation fails**: Run as administrator
- **Apps missing**: Reinstall from Company Portal

## Available Apps
Your license includes:
- Word, Excel, PowerPoint
- Outlook, OneNote, Access
- Teams, SharePoint, OneDrive
- 1TB OneDrive storage

Contact IT if activation fails after 24 hours.`,
    category: "Software Installation",
    tags: ["office", "microsoft", "installation", "activation"],
    author_email: "support@company.com",
    status: "published"
  },
  {
    title: "Browser Issues and Solutions",
    content: `# Web Browser Troubleshooting

## Common Browser Problems

### Pages Won't Load
1. Check internet connection
2. Try a different website
3. Clear browser cache and cookies
4. Disable browser extensions
5. Restart browser

### Slow Browser Performance
1. Close unnecessary tabs
2. Clear browsing data
3. Disable heavy extensions
4. Update browser to latest version
5. Restart computer

## Clearing Browser Data

### Chrome
1. Press Ctrl+Shift+Delete
2. Select time range: "All time"
3. Check: Cookies, Cache, Browsing history
4. Click "Clear data"

### Edge
1. Press Ctrl+Shift+Delete
2. Select "All time"
3. Check all boxes
4. Click "Clear now"

### Firefox
1. Press Ctrl+Shift+Delete
2. Select "Everything"
3. Check all items
4. Click "Clear Now"

## When Websites Don't Work
1. Try incognito/private mode
2. Disable ad blocker temporarily
3. Check if site works in different browser
4. Clear SSL state: Internet Options > Content > Clear SSL state

## Recommended Browsers
- **Primary**: Microsoft Edge or Google Chrome
- **Alternative**: Mozilla Firefox
- **Avoid**: Internet Explorer (outdated)`,
    category: "Software",
    tags: ["browser", "chrome", "edge", "firefox", "troubleshooting"],
    author_email: "support@company.com",
    status: "published"
  },
  {
    title: "File Backup and Recovery Guide",
    content: `# File Backup and Recovery

## OneDrive Backup Setup
1. Open OneDrive (cloud icon in system tray)
2. Click "Help & Settings" > "Settings"
3. Go to "Backup" tab
4. Click "Manage backup"
5. Select Desktop, Documents, Pictures
6. Click "Start backup"

## Manual File Backup
1. Connect external drive
2. Open File Explorer
3. Navigate to important folders
4. Copy files to external drive
5. Verify files copied successfully

## Recovering Deleted Files

### From Recycle Bin
1. Double-click Recycle Bin on desktop
2. Find your file
3. Right-click > "Restore"

### From OneDrive
1. Go to onedrive.com
2. Sign in with work account
3. Click "Recycle bin" (left sidebar)
4. Select files to restore
5. Click "Restore"

## What to Backup
- **Essential**: Documents, Desktop files, Pictures
- **Work files**: Project folders, spreadsheets, presentations
- **Email**: PST files (if using Outlook locally)
- **Settings**: Browser bookmarks, software configurations

## Backup Schedule
- **Daily**: Critical work files (automatic with OneDrive)
- **Weekly**: Complete system backup
- **Monthly**: External drive backup

Files older than 30 days in Recycle Bin are automatically deleted.`,
    category: "Data Management",
    tags: ["backup", "recovery", "onedrive", "files", "data"],
    author_email: "support@company.com",
    status: "published"
  },
  {
    title: "Video Conferencing Setup (Teams/Zoom)",
    content: `# Video Conferencing Guide

## Microsoft Teams Setup
1. Download Teams from teams.microsoft.com
2. Sign in with your work email
3. Go to Settings (gear icon)
4. Test camera and microphone
5. Set up your profile picture

## Joining Meetings

### Teams Meeting
1. Click meeting link in email/calendar
2. Choose "Open in desktop app" or "Join on the web"
3. Test audio/video before joining
4. Click "Join now"

### Zoom Meeting
1. Click Zoom link
2. Download Zoom client if prompted
3. Enter meeting ID if required
4. Test audio/video
5. Click "Join Meeting"

## Audio/Video Troubleshooting

### No Audio
1. Check computer volume
2. Select correct microphone in app
3. Unmute yourself in meeting
4. Check Windows sound settings

### No Video
1. Check camera privacy settings
2. Close other apps using camera
3. Restart video conferencing app
4. Update camera drivers

## Best Practices
- **Mute when not speaking**
- **Good lighting**: Face window or light source
- **Stable internet**: Use ethernet when possible
- **Backup plan**: Have phone dial-in ready
- **Professional background**: Use virtual background if needed

## Camera/Audio Settings
Check Settings > Privacy > Camera/Microphone to ensure apps have permission.`,
    category: "Collaboration",
    tags: ["teams", "zoom", "video", "meetings", "audio"],
    author_email: "support@company.com",
    status: "published"
  },
  {
    title: "Software Installation from Company Portal",
    content: `# Installing Approved Software

## Accessing Company Portal
1. Search for "Company Portal" in Start menu
2. Or visit portal.company.com
3. Sign in with your work credentials
4. Browse available software

## Available Software Categories
- **Productivity**: Office 365, Adobe Reader, Notepad++
- **Communication**: Teams, Zoom, Skype
- **Security**: Antivirus, VPN client
- **Development**: Visual Studio Code, Git
- **Graphics**: Paint.NET, GIMP

## Installation Process
1. Find the software you need
2. Click "Install" or "Request"
3. Wait for download to complete
4. Follow installation prompts
5. Some software may require approval

## Self-Service Software
These can be installed immediately:
- Google Chrome
- Mozilla Firefox
- 7-Zip
- VLC Media Player
- Adobe Reader

## Requesting New Software
1. Go to "Request Software" section
2. Fill out the request form
3. Provide business justification
4. Submit for approval
5. IT will review within 2 business days

## Installation Issues
- **Access denied**: Contact IT for admin rights
- **Download fails**: Check internet connection
- **Installation stuck**: Restart and try again
- **Software not available**: Submit request form

Never download software from unofficial sources.`,
    category: "Software Installation",
    tags: ["software", "installation", "portal", "apps", "approval"],
    author_email: "support@company.com",
    status: "published"
  },
  {
    title: "Keyboard and Mouse Troubleshooting",
    content: `# Input Device Troubleshooting

## Keyboard Issues

### Keys Not Working
1. Check USB/wireless connection
2. Try different USB port
3. Clean keyboard with compressed air
4. Test with on-screen keyboard
5. Replace batteries (wireless)

### Typing Wrong Characters
1. Check keyboard language settings
2. Press Alt+Shift to change language
3. Check if Num Lock is on/off
4. Restart computer

### Sticky Keys Problem
1. Press Shift key 5 times to toggle
2. Go to Settings > Ease of Access > Keyboard
3. Turn off Sticky Keys
4. Turn off Filter Keys

## Mouse Issues

### Mouse Not Moving
1. Check USB connection
2. Try different USB port
3. Clean mouse sensor
4. Replace batteries (wireless)
5. Try different mouse pad

### Double-Click Issues
1. Go to Settings > Devices > Mouse
2. Adjust double-click speed
3. Clean mouse buttons
4. Check for driver updates

### Scroll Wheel Problems
1. Clean scroll wheel with compressed air
2. Update mouse drivers
3. Check mouse settings in Control Panel
4. Try different mouse

## Wireless Device Connection
1. Turn device off and on
2. Re-pair with computer:
   - Go to Settings > Devices > Bluetooth
   - Remove device and re-add
3. Check battery level
4. Move closer to computer

## When to Request Replacement
- Physical damage (keys broken, mouse cracked)
- Multiple keys not working
- Intermittent connection issues
- Device older than 3 years`,
    category: "Hardware",
    tags: ["keyboard", "mouse", "input", "troubleshooting", "hardware"],
    author_email: "support@company.com",
    status: "published"
  },
  {
    title: "Monitor and Display Issues",
    content: `# Display Troubleshooting Guide

## No Display Issues

### Check Connections
1. Verify power cable to monitor
2. Check video cable (HDMI/VGA/DisplayPort)
3. Ensure computer is powered on
4. Try different video port

### Multiple Monitor Setup
1. Right-click desktop > Display settings
2. Click "Detect" if monitor not showing
3. Select "Extend these displays"
4. Arrange monitors by dragging
5. Set primary display

## Display Quality Issues

### Blurry or Fuzzy Display
1. Right-click desktop > Display settings
2. Check resolution (use recommended)
3. Adjust scaling (100%, 125%, 150%)
4. Update graphics drivers

### Wrong Colors
1. Right-click desktop > Display settings
2. Go to Advanced display settings
3. Click "Color calibration"
4. Follow the wizard

### Screen Flickering
1. Update graphics drivers
2. Check refresh rate (usually 60Hz)
3. Try different cable
4. Test with another monitor

## Common Resolutions
- **1920x1080** (Full HD) - Most common
- **1366x768** (HD) - Laptops
- **2560x1440** (2K) - High-end monitors
- **3840x2160** (4K) - Premium displays

## Dual Monitor Tips
- **Windows Key + P**: Quick display options
- **Windows Key + Left/Right**: Snap windows between monitors
- Set different wallpapers for each monitor
- Use one monitor for reference, other for work

## When to Contact IT
- Monitor makes unusual noises
- Visible damage to screen
- Burnt smell from monitor
- Complete display failure after troubleshooting`,
    category: "Hardware",
    tags: ["monitor", "display", "resolution", "dual-monitor", "graphics"],
    author_email: "support@company.com",
    status: "published"
  },
  {
    title: "Security Best Practices for End Users",
    content: `# Cybersecurity Guidelines

## Password Security
- **Use unique passwords** for each account
- **Enable two-factor authentication** when available
- **Never share passwords** with colleagues
- **Use password manager** (recommended: company-approved tools)
- **Change passwords** if you suspect compromise

## Email Security

### Identifying Phishing
- **Check sender address** carefully
- **Hover over links** before clicking
- **Be suspicious of urgent requests** for personal info
- **Verify requests** through alternate communication
- **Don't download unexpected attachments**

### Safe Email Practices
1. Never click suspicious links
2. Don't download attachments from unknown senders
3. Report phishing emails to IT
4. Use company email for business only
5. Don't auto-forward company emails

## Web Browsing Safety
- **Only visit trusted websites**
- **Look for HTTPS** (lock icon) on sensitive sites
- **Keep browser updated**
- **Don't download software** from unknown sources
- **Use ad blockers** to prevent malicious ads

## USB and External Device Safety
- **Never use unknown USB drives**
- **Scan external drives** before opening
- **Don't plug in found devices**
- **Use company-approved storage** only
- **Encrypt sensitive data** on portable devices

## Remote Work Security
- **Use VPN** for all company access
- **Lock screen** when away from computer
- **Secure home WiFi** with WPA3 encryption
- **Work in private areas** to avoid shoulder surfing
- **Use company devices** for work when possible

## Incident Reporting
Report these immediately to IT:
- Suspicious emails or calls
- Suspected malware infection
- Lost or stolen devices
- Accidental data sharing
- Unusual computer behavior

**IT Security Hotline**: security@company.com or extension 911`,
    category: "Security",
    tags: ["security", "phishing", "password", "malware", "best-practices"],
    author_email: "support@company.com",
    status: "published"
  },
  {
    title: "Common Software Error Messages and Solutions",
    content: `# Software Error Troubleshooting

## Windows Error Messages

### "Access Denied"
**Solution:**
1. Right-click the program
2. Select "Run as administrator"
3. If problem persists, contact IT for permissions

### "Application Error"
**Solution:**
1. Close the application completely
2. Restart the application
3. Restart computer if issue continues
4. Reinstall the application

### "DLL File Missing"
**Solution:**
1. Restart computer
2. Run Windows Update
3. Reinstall the affected program
4. Contact IT if error persists

## Office Application Errors

### "Word/Excel Not Responding"
**Solution:**
1. Wait 2-3 minutes for recovery
2. Force close: Ctrl+Alt+Delete > Task Manager
3. Open application in Safe Mode
4. Repair Office installation

### "Outlook Cannot Start"
**Solution:**
1. Close Outlook completely
2. Run Outlook in Safe Mode: Win+R, type "outlook /safe"
3. Create new Outlook profile if needed
4. Repair PST file using scanpst.exe

## Browser Error Messages

### "This Site Can't Be Reached"
**Solution:**
1. Check internet connection
2. Clear browser cache
3. Try different browser
4. Check if VPN is required

### "Certificate Error"
**Solution:**
1. Check computer date/time
2. Clear browser cache and cookies
3. Add site to trusted sites
4. Contact IT for certificate issues

## General Troubleshooting Steps
1. **Restart the application**
2. **Restart the computer**
3. **Check for updates**
4. **Run as administrator**
5. **Check antivirus logs**
6. **Reinstall the software**

## When to Contact IT
- Multiple error messages appear
- System-wide issues affecting productivity
- Security-related error messages
- Hardware error messages
- Error persists after basic troubleshooting

**Include this information when reporting:**
- Exact error message text
- What you were doing when error occurred
- Steps you've already tried
- Screenshots of the error`,
    category: "Troubleshooting",
    tags: ["errors", "troubleshooting", "windows", "office", "solutions"],
    author_email: "support@company.com",
    status: "published"
  }
];

async function createKBArticles() {
  try {
    console.log("📚 Creating 15 comprehensive knowledge base articles...\n");
    
    // Check if articles already exist
    const existingResult = await pool.query('SELECT COUNT(*) FROM knowledge_base');
    const existingCount = parseInt(existingResult.rows[0].count);
    
    if (existingCount >= 15) {
      console.log(`⚠️  Found ${existingCount} existing articles. Skipping creation to avoid duplicates.`);
      return;
    }

    let createdCount = 0;

    for (const article of knowledgeBaseArticles) {
      const insertQuery = `
        INSERT INTO knowledge_base (
          title, content, category, tags, author_email, status, views, helpful_votes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, title, category;
      `;
      
      const values = [
        article.title,
        article.content,
        article.category,
        JSON.stringify(article.tags),
        article.author_email,
        article.status,
        0, // initial views
        0  // initial helpful votes
      ];
      
      const result = await pool.query(insertQuery, values);
      const created = result.rows[0];
      
      console.log(`✅ Created article: ${created.title} (${created.category})`);
      createdCount++;
    }
    
    console.log(`\n🎉 Successfully created ${createdCount} knowledge base articles!`);
    
    // Show article count by category
    const categoryResult = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM knowledge_base 
      GROUP BY category 
      ORDER BY category;
    `);
    
    console.log("\n📊 Articles by category:");
    categoryResult.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} articles`);
    });
    
  } catch (error) {
    console.error("❌ Error creating knowledge base articles:", error);
  } finally {
    await pool.end();
  }
}

createKBArticles();
