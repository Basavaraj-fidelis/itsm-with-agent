
import type { Express } from "express";
import VNCServer from '../vnc-setup.js';

let vncServerInstance: any = null;

export function registerVNCRoutes(app: Express, authenticateToken: any) {
  // Start VNC server endpoint
  app.post("/api/vnc/start", authenticateToken, async (req, res) => {
    try {
      if (vncServerInstance && vncServerInstance.vncProcess) {
        return res.json({
          success: true,
          message: "VNC server is already running",
          websockify_url: "ws://0.0.0.0:6080/websockify",
          novnc_url: "http://0.0.0.0:6080/vnc.html"
        });
      }

      vncServerInstance = new VNCServer();
      const started = await vncServerInstance.startVNCServer();

      if (started) {
        res.json({
          success: true,
          message: "VNC server started successfully",
          websockify_url: "ws://0.0.0.0:6080/websockify",
          novnc_url: "http://0.0.0.0:6080/vnc.html",
          vnc_port: 5900,
          websockify_port: 6080
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to start VNC server"
        });
      }
    } catch (error) {
      console.error("Error starting VNC server:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  });

  // Stop VNC server endpoint
  app.post("/api/vnc/stop", authenticateToken, async (req, res) => {
    try {
      if (vncServerInstance) {
        vncServerInstance.stopVNCServer();
        vncServerInstance = null;
      }

      res.json({
        success: true,
        message: "VNC server stopped"
      });
    } catch (error) {
      console.error("Error stopping VNC server:", error);
      res.status(500).json({
        success: false,
        message: "Failed to stop VNC server",
        error: error.message
      });
    }
  });

  // Check VNC server status
  app.get("/api/vnc/status", authenticateToken, (req, res) => {
    const isRunning = vncServerInstance && vncServerInstance.vncProcess;
    
    res.json({
      running: isRunning,
      websockify_url: isRunning ? "ws://0.0.0.0:6080/websockify" : null,
      novnc_url: isRunning ? "http://0.0.0.0:6080/vnc.html" : null,
      vnc_port: isRunning ? 5900 : null,
      websockify_port: isRunning ? 6080 : null,
      reverse_tunnel_port: 5901,
      reverse_tunnel_command: "ssh -R 5901:localhost:5900 itsm-user@0.0.0.0"
    });
  });

  // Generate agent-specific reverse tunnel command
  app.post("/api/vnc/reverse-tunnel", authenticateToken, async (req, res) => {
    try {
      const { agent_id, agent_hostname } = req.body;
      
      if (!vncServerInstance || !vncServerInstance.vncProcess) {
        return res.status(400).json({
          success: false,
          message: "VNC server is not running. Start VNC server first."
        });
      }

      const tunnelCommand = `ssh -R 5901:localhost:5900 itsm-user@0.0.0.0`;
      const instructions = [
        {
          step: 1,
          title: "Install SSH Client (if not already installed)",
          windows_command: "winget install Microsoft.OpenSSH.Beta",
          description: "Install OpenSSH client on Windows endpoint"
        },
        {
          step: 2,
          title: "Create Reverse Tunnel",
          command: tunnelCommand,
          description: "Run this command on the Windows endpoint to create reverse tunnel"
        },
        {
          step: 3,
          title: "Keep Tunnel Alive",
          command: `ssh -R 5901:localhost:5900 -N -f itsm-user@0.0.0.0`,
          description: "Use -N -f flags to run tunnel in background"
        }
      ];

      res.json({
        success: true,
        agent_id,
        agent_hostname,
        tunnel_command: tunnelCommand,
        local_vnc_url: "http://0.0.0.0:6080/vnc.html?host=localhost&port=5901",
        instructions,
        notes: [
          "The tunnel creates a reverse connection from the endpoint back to this server",
          "Once established, VNC traffic will flow through the SSH tunnel",
          "This works even when the endpoint is behind NAT/firewall"
        ]
      });
    } catch (error) {
      console.error("Error generating reverse tunnel command:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate reverse tunnel command",
        error: error.message
      });
    }
  });
}
