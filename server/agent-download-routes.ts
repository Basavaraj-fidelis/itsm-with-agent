import express from 'express';
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Enhanced authentication middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log('Auth header:', authHeader);
  console.log('Token:', token);

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    console.log("Decoded token:", decoded);

    // Try to get user from database first
    try {
      const { pool } = await import("./db");
      const result = await pool.query(
        `SELECT id, email, role, first_name, last_name, username, is_active FROM users WHERE id = $1`,
        [decoded.userId || decoded.id],
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        if (!user.is_active) {
          return res.status(403).json({ error: "User account is inactive" });
        }
        req.user = user;
        console.log('User authenticated:', user.email, 'Role:', user.role);
        return next();
      }
    } catch (dbError) {
      console.log("Database lookup failed, trying fallback:", dbError.message);
    }

    // Fallback for demo users
    req.user = { 
      id: decoded.userId || decoded.id, 
      email: decoded.email, 
      role: decoded.role || 'admin',
      is_active: true
    };
    console.log('Fallback user authenticated:', req.user.email, 'Role:', req.user.role);
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(403).json({ error: "Invalid token" });
  }
};

// Middleware to check admin permissions
const requireAdmin = (req: any, res: any, next: any) => {
  console.log('Checking admin permissions for user:', req.user);
  if (!req.user || req.user.role !== 'admin') {
    console.log('Admin access denied for user role:', req.user?.role);
    return res.status(403).json({ error: 'Admin access required' });
  }
  console.log('Admin access granted');
  next();
};

// Simplified download function for all platforms
const downloadAgent = async (req: any, res: any, platform: string) => {
  try {
    console.log(`${platform} agent download requested by:`, req.user.email);
    const agentPath = path.join(process.cwd(), 'Agent');

    console.log('Agent path:', agentPath);
    console.log('Agent directory exists:', fs.existsSync(agentPath));

    // Check if Agent directory exists
    if (!fs.existsSync(agentPath)) {
      console.error('Agent directory not found at:', agentPath);
      return res.status(404).json({ error: 'Agent files not found' });
    }

    // List all files in Agent directory
    const availableFiles = fs.readdirSync(agentPath);
    console.log('Available files in Agent directory:', availableFiles);

    if (availableFiles.length === 0) {
      console.error('Agent directory is empty!');
      return res.status(404).json({ error: 'Agent directory is empty' });
    }

    // Set response headers for zip download
    const filename = `itsm-agent-${platform}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    // Create zip archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

    // Track when archive is done
    archive.on('end', () => {
      console.log(`${platform} agent archive has been finalized successfully`);
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add the entire Agent directory to the archive
    console.log(`Adding entire Agent directory to ${platform} archive`);
    archive.directory(agentPath, false);

    // Add platform-specific installation instructions
    const instructions = generateInstallationInstructions(platform);
    archive.append(instructions, { name: 'INSTALLATION_INSTRUCTIONS.md' });
    console.log(`Added installation instructions for ${platform}`);

    // Finalize the archive
    await archive.finalize();
    console.log(`${platform} agent download completed successfully`);

  } catch (error) {
    console.error(`${platform} agent download error:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download agent' });
    }
  }
};

// Generate platform-specific installation instructions
const generateInstallationInstructions = (platform: string): string => {
  const baseInstructions = `# ITSM Agent Installation Instructions - ${platform.charAt(0).toUpperCase() + platform.slice(1)}

## Prerequisites
- Python 3.7 or higher
- Administrator/root privileges

## Configuration
Before installation, edit config.ini:
\`\`\`ini
[api]
base_url = http://your-itsm-server:5000
auth_token = your-auth-token-here

[agent]
collection_interval = 300
hostname = auto
\`\`\`

## Installation Steps`;

  switch (platform) {
    case 'windows':
      return `${baseInstructions}

1. Extract this archive to your target directory (e.g., C:\\itsm-agent)
2. Edit config.ini with your ITSM server details
3. Open Command Prompt as Administrator
4. Navigate to the extracted directory
5. Install Python dependencies:
   \`\`\`
   pip install psutil requests configparser websocket-client
   \`\`\`
6. Run the installation script:
   \`\`\`
   python install_windows.py
   \`\`\`
7. Start the service:
   \`\`\`
   python itsm_agent.py start
   \`\`\`

## Troubleshooting
If you encounter service issues, run:
\`\`\`
python fix_windows_service.py
\`\`\`

## Support
For technical support, contact your system administrator.`;

    case 'linux':
      return `${baseInstructions}

1. Extract this archive: \`unzip itsm-agent-linux.zip\`
2. Edit config.ini with your server details
3. Install Python dependencies:
   \`\`\`
   sudo pip3 install psutil requests configparser websocket-client
   \`\`\`
4. Copy files to system directory:
   \`\`\`
   sudo mkdir -p /opt/itsm-agent
   sudo cp *.py config.ini /opt/itsm-agent/
   sudo chmod +x /opt/itsm-agent/*.py
   \`\`\`
5. Start the agent:
   \`\`\`
   sudo python3 /opt/itsm-agent/itsm_agent.py
   \`\`\`

## Systemd Service (Optional)
To run as a service:
1. Create service file: \`sudo nano /etc/systemd/system/itsm-agent.service\`
2. Add service configuration
3. Enable: \`sudo systemctl enable itsm-agent\`
4. Start: \`sudo systemctl start itsm-agent\`

## Support
For technical support, contact your system administrator.`;

    case 'macos':
      return `${baseInstructions}

1. Extract this archive
2. Edit config.ini with your server details
3. Install Python dependencies:
   \`\`\`
   pip3 install psutil requests configparser websocket-client
   \`\`\`
4. Run the agent:
   \`\`\`
   sudo python3 itsm_agent.py
   \`\`\`

## Running as Service (Optional)
To run as a background service:
1. Create a launchd plist file
2. Load with launchctl
3. Start the service

## Support
For technical support, contact your system administrator.`;

    default:
      return baseInstructions;
  }
};

// Windows Agent download
router.get('/windows', authenticateToken, requireAdmin, async (req, res) => {
  await downloadAgent(req, res, 'windows');
});

// Linux Agent download
router.get('/linux', authenticateToken, requireAdmin, async (req, res) => {
  await downloadAgent(req, res, 'linux');
});

// macOS Agent download
router.get('/macos', authenticateToken, requireAdmin, async (req, res) => {
  await downloadAgent(req, res, 'macos');
});

export default router;