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

// Agent download endpoints
router.get('/download/windows', authenticateToken, requireAdmin, async (req, res) => {
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

    // List files in Agent directory
    const files = fs.readdirSync(agentPath);
    console.log('Files in Agent directory:', files);

    // Set response headers for zip download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=itsm-agent-windows.zip');

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

    // Pipe archive to response
    archive.pipe(res);

    // Add specific files for Windows

    // Add Windows agent files (using actual file structure)
    const windowsFiles = [
      'itsm_agent.py',
      'config.ini',
      'service_wrapper.py',
      'install_windows.py',
      'fix_windows_service.py',
      'system_collector.py',
      'api_client.py'
    ];

    let filesAdded = 0;
    windowsFiles.forEach(fileName => {
      const filePath = path.join(agentPath, fileName);
      console.log(`Checking file: ${filePath}, exists: ${fs.existsSync(filePath)}`);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath);
        archive.append(fileContent, { name: fileName });
        console.log(`Added ${fileName} to Windows archive (${fileContent.length} bytes)`);
        filesAdded++;
      } else {
        console.warn(`Windows file not found: ${fileName}`);
      }
    });

    console.log(`Total files added to Windows archive: ${filesAdded}`);

    // Add installation instructions
    const instructions = `# ITSM Agent Installation Instructions

## Windows Installation

### Prerequisites
- Python 3.7 or higher
- Administrator privileges

### Installation Steps
1. Extract this archive to your target directory
2. Edit config.ini and set your ITSM server URL and authentication token
3. Run the installation script as Administrator:
   python install_windows.py
4. Start the service:
   python itsm_agent.py start

### Configuration
Edit config.ini before installation:
- api.base_url: Your ITSM server URL
- api.auth_token: Authentication token from admin panel
- agent.collection_interval: Data collection frequency (seconds)

### Support
For technical support, contact your system administrator.
`;

    archive.append(instructions, { name: 'README.md' });

    // Finalize the archive and wait for it to complete
    archive.finalize();
    
    // Wait for the archive to finish
    archive.on('end', () => {
      console.log('Windows agent download completed - archive data has been drained');
    });
    
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Archive warning:', err);
      } else {
        console.error('Archive error:', err);
        throw err;
      }
    });

  } catch (error) {
    console.error('Windows agent download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download Windows agent' });
    }
  }
});

router.get('/download/linux', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Linux agent download requested by:', req.user.email);
    const agentPath = path.join(process.cwd(), 'Agent');

    if (!fs.existsSync(agentPath)) {
      console.error('Agent directory not found at:', agentPath);
      return res.status(404).json({ error: 'Agent files not found' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=itsm-agent-linux.zip');

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

    archive.pipe(res);

    // Add Linux agent files (using actual file structure)
    const linuxFiles = [
      'itsm_agent.py',
      'config.ini',
      'service_wrapper.py',
      'system_collector.py',
      'api_client.py'
    ];

    let filesAdded = 0;
    linuxFiles.forEach(fileName => {
      const filePath = path.join(agentPath, fileName);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath);
        archive.append(fileContent, { name: fileName });
        console.log(`Added ${fileName} to Linux archive (${fileContent.length} bytes)`);
        filesAdded++;
      } else {
        console.warn(`Linux file not found: ${fileName}`);
      }
    });

    console.log(`Total files added to Linux archive: ${filesAdded}`);

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
pip3 install psutil requests configparser

# Copy files to /opt/itsm-agent
mkdir -p /opt/itsm-agent
cp *.py /opt/itsm-agent/
cp config.ini /opt/itsm-agent/

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

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable itsm-agent
systemctl start itsm-agent

echo "ITSM Agent installed and started successfully!"
echo "Check status with: systemctl status itsm-agent"
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

## Configuration
Edit config.ini before installation.
`;

    archive.append(linuxInstructions, { name: 'README.md' });
    
    archive.finalize();
    
    archive.on('end', () => {
      console.log('Linux agent download completed - archive data has been drained');
    });

  } catch (error) {
    console.error('Linux agent download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download Linux agent' });
    }
  }
});

router.get('/download/macos', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('macOS agent download requested by:', req.user.email);
    const agentPath = path.join(process.cwd(), 'Agent');

    if (!fs.existsSync(agentPath)) {
      console.error('Agent directory not found at:', agentPath);
      return res.status(404).json({ error: 'Agent files not found' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=itsm-agent-macos.zip');

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

    archive.pipe(res);

    // Add macOS agent files (using actual file structure)
    const macosFiles = [
      'itsm_agent.py',
      'system_collector.py',
      'api_client.py',
      'service_wrapper.py',
      'config.ini'
    ];

    let filesAdded = 0;
    macosFiles.forEach(fileName => {
      const filePath = path.join(agentPath, fileName);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath);
        archive.append(fileContent, { name: fileName });
        console.log(`Added ${fileName} to macOS archive (${fileContent.length} bytes)`);
        filesAdded++;
      } else {
        console.warn(`macOS file not found: ${fileName}`);
      }
    });

    console.log(`Total files added to macOS archive: ${filesAdded}`);

    const macosInstructions = `# ITSM Agent Installation Instructions - macOS

## Prerequisites
- Python 3.7 or higher
- Administrator privileges

## Installation Steps
1. Extract this archive
2. Edit config.ini with your server details
3. Run: sudo python3 itsm_agent.py install
4. Start: sudo python3 itsm_agent.py start

## Configuration
Edit config.ini before installation.
`;

    archive.append(macosInstructions, { name: 'README.md' });
    
    archive.finalize();
    
    archive.on('end', () => {
      console.log('macOS agent download completed - archive data has been drained');
    });

  } catch (error) {
    console.error('macOS agent download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download macOS agent' });
    }
  }
});

export default router;