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

// Windows Agent download - simplified approach
router.get('/windows', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Windows agent download requested by:', req.user.email);
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
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=itsm-agent-windows.zip');

    // Create zip archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    let archiveError = false;

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      archiveError = true;
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

    // Track when archive is done
    archive.on('end', () => {
      console.log('Windows agent archive has been finalized successfully');
    });

    // Pipe archive to response
    archive.pipe(res);

    // Define specific Windows agent files to include
    const windowsFiles = [
      'itsm_agent.py',
      'api_client.py',
      'system_collector.py',
      'service_wrapper.py',
      'config.ini',
      'install_windows.py',
      'fix_windows_service.py',
      'agent_websocket_client.py'
    ];

    // Check which files exist and add them individually
    const existingFiles = windowsFiles.filter((fileName) => {
      const filePath = path.join(agentPath, fileName);
      const exists = fs.existsSync(filePath);
      console.log(`Checking ${fileName}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      return exists;
    });

    if (existingFiles.length === 0) {
      console.error('No Windows agent files found!');
      return res.status(404).json({ error: 'No Windows agent files found' });
    }

    console.log(`Found ${existingFiles.length} Windows files:`, existingFiles);

    // Add files individually to ensure they're properly included
    let filesAdded = 0;
    for (const fileName of existingFiles) {
      try {
        const filePath = path.join(agentPath, fileName);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && stats.size > 0) {
          archive.file(filePath, { name: fileName });
          console.log(`Added ${fileName} to archive (${stats.size} bytes)`);
          filesAdded++;
        } else {
          console.warn(`Skipping ${fileName}: not a valid file or empty`);
        }
      } catch (fileError) {
        console.error(`Error processing file ${fileName}:`, fileError);
      }
    }

    console.log(`Total files added to Windows archive: ${filesAdded}`);

    if (filesAdded === 0) {
      console.error('No files were successfully added to the archive!');
      if (!res.headersSent) {
        return res.status(500).json({ error: 'No valid agent files found to package' });
      }
    }

    // Add installation instructions
    const instructions = `# ITSM Agent Installation Instructions - Windows

## Prerequisites
- Python 3.7 or higher
- Administrator privileges

## Installation Steps
1. Extract this archive to your target directory (e.g., C:\\itsm-agent)
2. Edit config.ini and set your ITSM server URL and authentication token:
   - api.base_url: Your ITSM server URL (e.g., http://your-server:5000)
   - api.auth_token: Authentication token from admin panel
   - agent.collection_interval: Data collection frequency (seconds)

3. Open Command Prompt as Administrator
4. Navigate to the extracted directory
5. Run the installation script:
   python install_windows.py

6. Start the service:
   python itsm_agent.py start

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

## Troubleshooting
If you encounter service issues, run:
python fix_windows_service.py

## Support
For technical support, contact your system administrator.
`;

    archive.append(instructions, { name: 'README.md' });
    console.log('Added README.md to archive');

    // Finalize the archive (not async)
    archive.finalize();

  } catch (error) {
    console.error('Windows agent download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download Windows agent' });
    }
  }
});

// Linux Agent download - simplified approach
router.get('/linux', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Linux agent download requested by:', req.user.email);
    const agentPath = path.join(process.cwd(), 'Agent');

    if (!fs.existsSync(agentPath)) {
      console.error('Agent directory not found at:', agentPath);
      return res.status(404).json({ error: 'Agent files not found' });
    }

    const availableFiles = fs.readdirSync(agentPath);
    console.log('Available files for Linux:', availableFiles);

    if (availableFiles.length === 0) {
      console.error('Agent directory is empty!');
      return res.status(404).json({ error: 'Agent directory is empty' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=itsm-agent-linux.zip');

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    let archiveError = false;

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      archiveError = true;
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

    archive.on('end', () => {
      console.log('Linux agent archive has been finalized successfully');
    });

    archive.pipe(res);

    // Add the entire Agent directory
    archive.directory(agentPath, false);
    console.log('Added entire Agent directory to archive');

    // Add Linux install script
    const installScript = `#!/bin/bash
# ITSM Agent Linux Installation Script

echo "Installing ITSM Agent for Linux..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)"
   exit 1
fi

# Install Python dependencies
pip3 install psutil requests configparser websocket-client

# Copy files to /opt/itsm-agent
mkdir -p /opt/itsm-agent
cp *.py /opt/itsm-agent/
cp config.ini /opt/itsm-agent/
chmod +x /opt/itsm-agent/*.py

# Create systemd service
cat > /etc/systemd/system/itsm-agent.service << EOF
[Unit]
Description=ITSM Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/itsm-agent
ExecStart=/usr/bin/python3 /opt/itsm-agent/itsm_agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable itsm-agent
systemctl start itsm-agent

echo "ITSM Agent installed and started successfully!"
echo "Check status with: systemctl status itsm-agent"
echo "View logs with: journalctl -u itsm-agent -f"
`;

    archive.append(installScript, { name: 'install_linux.sh' });

    const linuxInstructions = `# ITSM Agent Installation Instructions - Linux

## Prerequisites
- Python 3.7 or higher
- sudo privileges

## Installation Steps
1. Extract this archive: unzip itsm-agent-linux.zip
2. Edit config.ini with your server details
3. Run: chmod +x install_linux.sh
4. Run: sudo ./install_linux.sh

## Manual Installation
If the script fails, install manually:
1. sudo pip3 install psutil requests configparser websocket-client
2. sudo mkdir -p /opt/itsm-agent
3. sudo cp *.py config.ini /opt/itsm-agent/
4. Create systemd service (see install_linux.sh for reference)

## Configuration
Edit config.ini before installation.
`;

    archive.append(linuxInstructions, { name: 'README.md' });

    archive.finalize();

  } catch (error) {
    console.error('Linux agent download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download Linux agent' });
    }
  }
});

// macOS Agent download - simplified approach
router.get('/macos', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('macOS agent download requested by:', req.user.email);
    const agentPath = path.join(process.cwd(), 'Agent');

    if (!fs.existsSync(agentPath)) {
      console.error('Agent directory not found at:', agentPath);
      return res.status(404).json({ error: 'Agent files not found' });
    }

    const availableFiles = fs.readdirSync(agentPath);
    console.log('Available files for macOS:', availableFiles);

    if (availableFiles.length === 0) {
      console.error('Agent directory is empty!');
      return res.status(404).json({ error: 'Agent directory is empty' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=itsm-agent-macos.zip');

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    let archiveError = false;

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      archiveError = true;
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

    archive.on('end', () => {
      console.log('macOS agent archive has been finalized successfully');
    });

    archive.pipe(res);

    // Add the entire Agent directory
    archive.directory(agentPath, false);
    console.log('Added entire Agent directory to archive');

    const macosInstructions = `# ITSM Agent Installation Instructions - macOS

## Prerequisites
- Python 3.7 or higher
- Administrator privileges

## Installation Steps
1. Extract this archive
2. Edit config.ini with your server details
3. Install Python dependencies:
   pip3 install psutil requests configparser websocket-client
4. Run: sudo python3 itsm_agent.py install
5. Start: sudo python3 itsm_agent.py start

## Configuration
Edit config.ini before installation:
\`\`\`ini
[api]
base_url = http://your-itsm-server:5000
auth_token = your-auth-token-here

[agent]
collection_interval = 300
hostname = auto
\`\`\`

## Manual Service Setup
If automatic service setup fails:
1. Create launchd plist in /Library/LaunchDaemons/
2. Use launchctl to load and start the service

## Support
For technical support, contact your system administrator.
`;

    archive.append(macosInstructions, { name: 'README.md' });

    archive.finalize();

  } catch (error) {
    console.error('macOS agent download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download macOS agent' });
    }
  }
});

export default router;