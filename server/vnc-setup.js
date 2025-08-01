
const { spawn } = require('child_process');
const path = require('path');

class VNCServer {
  constructor() {
    this.vncProcess = null;
    this.websockifyProcess = null;
    this.xvfbProcess = null;
  }

  async startVNCServer() {
    try {
      console.log('🖥️  Starting VNC server...');
      
      // Start Xvfb (virtual framebuffer)
      this.xvfbProcess = spawn('Xvfb', [':1', '-screen', '0', '1024x768x24'], {
        stdio: 'pipe'
      });
      
      // Set DISPLAY environment variable
      process.env.DISPLAY = ':1';
      
      // Wait a bit for Xvfb to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start x11vnc
      this.vncProcess = spawn('x11vnc', [
        '-display', ':1',
        '-forever',
        '-nopw',
        '-shared',
        '-rfbport', '5900',
        '-bg'
      ], {
        stdio: 'pipe'
      });
      
      // Wait for VNC server to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Start websockify to bridge VNC to WebSocket
      this.websockifyProcess = spawn('websockify', [
        '--web=/usr/share/novnc/',
        '6080',
        'localhost:5900'
      ], {
        stdio: 'inherit'
      });
      
      console.log('✅ VNC server started successfully');
      console.log('📱 VNC accessible via websockify on port 6080');
      console.log('🔗 NoVNC web client available at http://0.0.0.0:6080/vnc.html');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start VNC server:', error);
      return false;
    }
  }

  stopVNCServer() {
    console.log('🛑 Stopping VNC server...');
    
    if (this.websockifyProcess) {
      this.websockifyProcess.kill();
      this.websockifyProcess = null;
    }
    
    if (this.vncProcess) {
      this.vncProcess.kill();
      this.vncProcess = null;
    }
    
    if (this.xvfbProcess) {
      this.xvfbProcess.kill();
      this.xvfbProcess = null;
    }
    
    console.log('✅ VNC server stopped');
  }
}

// Export for use in other modules
module.exports = VNCServer;

// If run directly, start the server
if (require.main === module) {
  const vncServer = new VNCServer();
  
  vncServer.startVNCServer().then(success => {
    if (success) {
      console.log('VNC Server is running. Press Ctrl+C to stop.');
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\nReceived SIGINT, shutting down gracefully...');
        vncServer.stopVNCServer();
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        console.log('\nReceived SIGTERM, shutting down gracefully...');
        vncServer.stopVNCServer();
        process.exit(0);
      });
    } else {
      console.error('Failed to start VNC server');
      process.exit(1);
    }
  });
}
