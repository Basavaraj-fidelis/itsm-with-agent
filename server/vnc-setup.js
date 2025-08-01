import { spawn } from 'child_process';
import path from 'path';

class VNCServer {
  constructor() {
    this.vncDisplay = ':1';
    this.vncPort = 5901;
    this.websockifyPort = 6080;
    this.xvfbProcess = null;
    this.vncProcess = null;
    this.websockifyProcess = null;
  }

  async startXvfb() {
    return new Promise((resolve, reject) => {
      console.log('🖥️ Starting Xvfb virtual display...');

      this.xvfbProcess = spawn('Xvfb', [
        this.vncDisplay,
        '-screen', '0',
        '1024x768x24',
        '-ac',
        '+extension', 'GLX',
        '+render',
        '-noreset'
      ], {
        stdio: 'pipe',
        env: { ...process.env, DISPLAY: this.vncDisplay }
      });

      this.xvfbProcess.on('error', (error) => {
        console.error('❌ Xvfb failed to start:', error.message);
        reject(error);
      });

      this.xvfbProcess.stdout.on('data', (data) => {
        console.log('Xvfb stdout:', data.toString());
      });

      this.xvfbProcess.stderr.on('data', (data) => {
        console.log('Xvfb stderr:', data.toString());
      });

      // Give Xvfb time to start
      setTimeout(() => {
        console.log('✅ Xvfb started successfully');
        resolve(true);
      }, 2000);
    });
  }

  async startVNC() {
    return new Promise((resolve, reject) => {
      console.log('🔒 Starting x11vnc server...');

      this.vncProcess = spawn('x11vnc', [
        '-display', this.vncDisplay,
        '-rfbport', this.vncPort.toString(),
        '-localhost',
        '-nopw',
        '-once',
        '-shared',
        '-forever'
      ], {
        stdio: 'pipe',
        env: { ...process.env, DISPLAY: this.vncDisplay }
      });

      this.vncProcess.on('error', (error) => {
        console.error('❌ x11vnc failed to start:', error.message);
        reject(error);
      });

      this.vncProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('x11vnc:', output);
        if (output.includes('PORT=')) {
          console.log('✅ x11vnc started successfully');
          resolve(true);
        }
      });

      this.vncProcess.stderr.on('data', (data) => {
        console.log('x11vnc stderr:', data.toString());
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.vncProcess.killed) {
          console.log('✅ x11vnc appears to be running');
          resolve(true);
        }
      }, 10000);
    });
  }

  async startWebsockify() {
    return new Promise((resolve, reject) => {
      console.log('🌐 Starting websockify proxy...');

      this.websockifyProcess = spawn('websockify', [
        '--web=/usr/share/novnc',
        this.websockifyPort.toString(),
        `localhost:${this.vncPort}`
      ], {
        stdio: 'pipe'
      });

      this.websockifyProcess.on('error', (error) => {
        console.error('❌ Websockify failed to start:', error.message);
        reject(error);
      });

      this.websockifyProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('websockify:', output);
        if (output.includes('Listen')) {
          console.log('✅ Websockify started successfully');
          resolve(true);
        }
      });

      this.websockifyProcess.stderr.on('data', (data) => {
        console.log('websockify stderr:', data.toString());
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        console.log('✅ Websockify should be running');
        resolve(true);
      }, 5000);
    });
  }

  async startVNCServer() {
    try {
      console.log('🚀 Starting VNC server setup...');

      await this.startXvfb();
      await this.startVNC();
      await this.startWebsockify();

      console.log('✅ VNC server fully operational!');
      console.log(`📱 noVNC web interface: http://localhost:${this.websockifyPort}/vnc.html`);
      console.log(`🔗 VNC direct connection: localhost:${this.vncPort}`);

      return true;
    } catch (error) {
      console.error('❌ Failed to start VNC server:', error);
      this.cleanup();
      return false;
    }
  }

  cleanup() {
    console.log('🧹 Cleaning up VNC processes...');

    if (this.websockifyProcess) {
      this.websockifyProcess.kill();
    }
    if (this.vncProcess) {
      this.vncProcess.kill();
    }
    if (this.xvfbProcess) {
      this.xvfbProcess.kill();
    }
  }

  getStatus() {
    return {
      xvfb: this.xvfbProcess && !this.xvfbProcess.killed,
      vnc: this.vncProcess && !this.vncProcess.killed,
      websockify: this.websockifyProcess && !this.websockifyProcess.killed,
      ports: {
        vnc: this.vncPort,
        websockify: this.websockifyPort
      }
    };
  }
}

// Export for use in other modules
export default VNCServer;

// If run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const vncServer = new VNCServer();

  vncServer.startVNCServer().then(success => {
    if (success) {
      console.log('VNC server started successfully');

      // Handle cleanup on exit
      process.on('SIGINT', () => {
        console.log('Received SIGINT, cleaning up...');
        vncServer.cleanup();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.log('Received SIGTERM, cleaning up...');
        vncServer.cleanup();
        process.exit(0);
      });
    } else {
      console.log('Failed to start VNC server');
      process.exit(1);
    }
  }).catch(error => {
    console.error('Error starting VNC server:', error);
    process.exit(1);
  });
}