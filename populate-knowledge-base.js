
import pkg from 'pg';
const { Pool } = pkg;

async function populateKnowledgeBase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('aivencloud.com') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔗 Connecting to database...');
    
    // Check if knowledge base table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'knowledge_base'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ knowledge_base table does not exist');
      return;
    }
    
    // Check current articles count
    const countResult = await pool.query('SELECT COUNT(*) FROM knowledge_base');
    const currentCount = parseInt(countResult.rows[0].count);
    
    console.log(`📚 Current knowledge base articles: ${currentCount}`);
    
    if (currentCount === 0) {
      console.log('📝 Creating sample knowledge base articles...');
      
      const sampleArticles = [
        {
          title: 'How to Reset Your Password',
          content: `# Password Reset Guide

## Problem
Forgotten password or need to change your current password.

## Solution
1. Go to the login page
2. Click "Forgot Password?"
3. Enter your email address
4. Check your email for reset instructions
5. Follow the link and create a new password

## Prevention
- Use a password manager
- Create strong passwords with at least 8 characters
- Include uppercase, lowercase, numbers, and special characters
- Change passwords regularly (every 90 days)

## Related Topics
- Account Security
- Two-Factor Authentication
- Password Policies`,
          category: 'Security',
          tags: JSON.stringify(['password', 'reset', 'login', 'security', 'account']),
          author_email: 'admin@company.com',
          status: 'published',
          views: 150,
          helpful_votes: 25
        },
        {
          title: 'Troubleshooting Network Connection Issues',
          content: `# Network Connection Problems

## Common Symptoms
- No internet access
- Slow connection speed
- Intermittent connectivity
- DNS resolution failures

## Troubleshooting Steps

### Step 1: Basic Checks
1. Check physical cable connections
2. Verify network adapter is enabled
3. Check network lights on router/modem
4. Try connecting other devices

### Step 2: Network Diagnostics
1. Open Command Prompt as Administrator
2. Run: \`ipconfig /release\`
3. Run: \`ipconfig /renew\`
4. Run: \`ipconfig /flushdns\`
5. Run: \`netsh winsock reset\`

### Step 3: Advanced Troubleshooting
1. Update network adapter drivers
2. Check DNS settings (use 8.8.8.8, 8.8.4.4)
3. Disable/enable network adapter
4. Contact IT support if issues persist

## Prevention
- Keep network drivers updated
- Monitor network performance regularly
- Use reliable DNS servers
- Regular router firmware updates`,
          category: 'Network',
          tags: JSON.stringify(['network', 'internet', 'connectivity', 'dns', 'adapter', 'troubleshooting']),
          author_email: 'admin@company.com',
          status: 'published',
          views: 320,
          helpful_votes: 50
        },
        {
          title: 'Software Installation and Setup Guide',
          content: `# Installing Software Applications

## Before Installation

### System Requirements Check
1. Verify minimum system requirements
2. Check available disk space
3. Ensure administrative privileges
4. Create system restore point

### Security Verification
1. Download only from official sources
2. Verify digital signatures
3. Scan with antivirus software
4. Check software reviews and ratings

## Installation Process

### Standard Installation
1. Right-click installer and "Run as Administrator"
2. Follow installation wizard prompts
3. Choose installation directory
4. Select additional components if needed
5. Review and accept license agreement

### Custom Installation
1. Choose "Custom" or "Advanced" installation
2. Select specific features to install
3. Change default installation path if needed
4. Configure startup options
5. Set file associations

## Post-Installation
1. Launch application to verify installation
2. Check for updates
3. Configure initial settings
4. Register software if required
5. Create desktop shortcuts if needed

## Troubleshooting Installation Issues

### Common Problems
- Insufficient permissions
- Conflicting software
- Corrupted installer
- Insufficient disk space
- Compatibility issues

### Solutions
1. Run installer as Administrator
2. Temporarily disable antivirus
3. Clear installer cache
4. Free up disk space
5. Check Windows compatibility mode
6. Contact software vendor support`,
          category: 'Software',
          tags: JSON.stringify(['software', 'installation', 'applications', 'setup', 'configuration', 'troubleshooting']),
          author_email: 'admin@company.com',
          status: 'published',
          views: 180,
          helpful_votes: 30
        },
        {
          title: 'Computer Performance Optimization',
          content: `# Improving Computer Performance

## Common Performance Issues
- Slow startup times
- Applications taking long to load
- System freezing or hanging
- High CPU or memory usage
- Slow file operations

## Quick Performance Fixes

### Startup Optimization
1. Press Ctrl+Shift+Esc to open Task Manager
2. Go to "Startup" tab
3. Disable unnecessary startup programs
4. Keep only essential programs enabled

### Disk Cleanup
1. Open "Disk Cleanup" utility
2. Select system drive (usually C:)
3. Check all cleanup options
4. Run cleanup process
5. Consider "Clean up system files"

### Memory Management
1. Close unused applications
2. Check for memory leaks
3. Add more RAM if consistently high usage
4. Use virtual memory settings appropriately

## Advanced Optimization

### System Maintenance
1. Run Windows Update regularly
2. Update device drivers
3. Scan for malware weekly
4. Defragment hard drives monthly
5. Check for disk errors

### Registry Cleanup
1. Use built-in registry tools only
2. Create registry backup before changes
3. Remove orphaned entries carefully
4. Avoid third-party registry cleaners

## Hardware Considerations
- SSD upgrade for faster performance
- Additional RAM for multitasking
- CPU upgrade for processing power
- Regular hardware cleaning
- Monitor temperatures`,
          category: 'Performance',
          tags: JSON.stringify(['performance', 'optimization', 'speed', 'memory', 'cpu', 'disk']),
          author_email: 'admin@company.com',
          status: 'published',
          views: 245,
          helpful_votes: 42
        },
        {
          title: 'Email Setup and Configuration',
          content: `# Email Client Configuration

## Outlook Setup

### IMAP Configuration
- **Incoming Server**: imap.company.com
- **Port**: 993
- **Security**: SSL/TLS
- **Outgoing Server**: smtp.company.com
- **Port**: 587
- **Security**: STARTTLS

### Exchange Server Setup
1. Select "Exchange" account type
2. Enter email address
3. Enter server name (if not auto-detected)
4. Enter username and password
5. Test connection settings

## Mobile Email Setup

### iOS Mail App
1. Go to Settings > Mail > Accounts
2. Tap "Add Account"
3. Select "Other" or specific provider
4. Enter account information
5. Save and sync

### Android Mail Setup
1. Open Email or Gmail app
2. Select "Add Account"
3. Choose account type
4. Enter server settings
5. Complete setup process

## Common Email Issues

### Connection Problems
- Verify server settings
- Check internet connection
- Confirm firewall settings
- Test with webmail access

### Authentication Errors
- Verify username/password
- Check for account lockouts
- Enable "less secure apps" if required
- Use app-specific passwords

### Sync Issues
- Check sync frequency settings
- Verify folder synchronization
- Clear email cache
- Recreate account if necessary

## Security Best Practices
- Enable two-factor authentication
- Use strong passwords
- Avoid public Wi-Fi for email
- Keep email client updated
- Be cautious with attachments`,
          category: 'Communication',
          tags: JSON.stringify(['email', 'outlook', 'configuration', 'setup', 'exchange', 'mobile']),
          author_email: 'admin@company.com',
          status: 'published',
          views: 198,
          helpful_votes: 35
        }
      ];

      for (const article of sampleArticles) {
        await pool.query(`
          INSERT INTO knowledge_base (title, content, category, tags, author_email, status, views, helpful_votes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          article.title,
          article.content,
          article.category,
          article.tags,
          article.author_email,
          article.status,
          article.views,
          article.helpful_votes
        ]);
      }

      console.log(`✅ Created ${sampleArticles.length} sample articles`);
    } else {
      console.log('✅ Knowledge base already has articles');
    }

    // Test the articles exist
    const finalCount = await pool.query('SELECT COUNT(*) FROM knowledge_base');
    console.log(`📊 Final article count: ${finalCount.rows[0].count}`);

    // Show sample of articles
    const sampleArticles = await pool.query(`
      SELECT title, category, array_length(string_to_array(tags::text, ','), 1) as tag_count 
      FROM knowledge_base 
      LIMIT 5
    `);
    
    console.log('\n📋 Sample articles:');
    sampleArticles.rows.forEach(article => {
      console.log(`  - ${article.title} (${article.category})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

populateKnowledgeBase();
