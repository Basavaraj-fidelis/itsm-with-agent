
import type { Express } from "express";
const VNCServer = require('../vnc-setup.js');

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
      websockify_port: isRunning ? 6080 : null
    });
  });
}
