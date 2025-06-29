import { Router } from "express";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Auth middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// Role check middleware - Allow Admin, Manager, Technician
const requireDownloadPermission = (req: any, res: any, next: any) => {
  const userRole = req.user?.role;
  const allowedRoles = ["admin", "manager", "technician"];

  if (allowedRoles.includes(userRole)) {
    next();
  } else {
    res.status(403).json({ message: "Insufficient permissions for agent download" });
  }
};

// Generate platform-specific installation instructions
function generateInstallationInstructions(platform: string): string {
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

## Support
For technical support, contact your system administrator.`;

    default:
      return baseInstructions;
  }
}

// Agent download endpoints for all platforms - NO AUTHENTICATION REQUIRED
router.get("/:platform", async (req, res) => {
  try {
    const { platform } = req.params;
    console.log(`${platform} agent download requested - no auth required`);

    if (!['windows', 'linux', 'macos'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const agentPath = path.join(process.cwd(), 'Agent');

    if (!fs.existsSync(agentPath)) {
      console.error('Agent directory not found at:', agentPath);
      return res.status(404).json({ error: 'Agent files not found' });
    }

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
    archive.on('error', (err: any) => {
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

    // Agent files to include in download
    const agentFiles = [
      'itsm_agent.py',
      'system_collector.py',
      'windows_collector.py',
      'linux_collector.py', 
      'macos_collector.py',
      'api_client.py',
      'service_wrapper.py',
      'config.ini'
    ];

    // Add platform-specific files
    if (platform === 'windows') {
      agentFiles.push('install_windows.py', 'fix_windows_service.py');
    } else if (platform === 'linux') {
      agentFiles.push('install_linux.py');
    } else if (platform === 'macos') {
      agentFiles.push('install_macos.py');
    }

    // Add the entire Agent directory to the archive
    console.log(`Adding entire Agent directory to ${platform} archive`);
    archive.directory(agentPath, false);

    // Add platform-specific installation instructions
    const instructions = generateInstallationInstructions(platform);
    archive.append(instructions, { name: 'INSTALLATION_INSTRUCTIONS.md' });
    console.log(`Added installation instructions for ${platform}`);

    // Finalize the archive
    await archive.finalize();
    console.log(`${platform} agent download completed successfully - no auth required`);

  } catch (error) {
    console.error(`${req.params.platform} agent download error:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download agent' });
    }
  }
});

export default router;