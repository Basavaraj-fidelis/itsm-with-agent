
const { Server } = require('ssh2');
const fs = require('fs');
const crypto = require('crypto');

class ITSMSSHServer {
  constructor(port = 2222) {
    this.port = port;
    this.server = null;
    this.activeTunnels = new Map();
  }

  async start() {
    return new Promise((resolve, reject) => {
      // Generate or load host key
      let hostKey;
      try {
        hostKey = fs.readFileSync('ssh_host_rsa_key');
      } catch (err) {
        console.log('Generating new SSH host key...');
        const { privateKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          privateKeyEncoding: {
            type: 'pkcs1',
            format: 'pem'
          }
        });
        hostKey = privateKey;
        fs.writeFileSync('ssh_host_rsa_key', hostKey);
      }

      this.server = new Server({
        hostKeys: [hostKey]
      }, (client) => {
        console.log('SSH Client connected!');

        client.on('authentication', (ctx) => {
          // Simple username/password auth for itsm-user
          if (ctx.method === 'password' && 
              ctx.username === 'itsm-user' && 
              ctx.password === 'itsm-secure-2024') {
            ctx.accept();
          } else {
            ctx.reject();
          }
        }).on('ready', () => {
          console.log('SSH Client authenticated and ready!');

          // Handle reverse port forwarding requests
          client.on('request', (accept, reject, name, info) => {
            if (name === 'tcpip-forward') {
              console.log(`Reverse tunnel request: ${info.bindAddr}:${info.bindPort}`);
              
              // Accept the reverse tunnel
              accept && accept();
              
              // Store tunnel info
              this.activeTunnels.set(client, {
                bindAddr: info.bindAddr,
                bindPort: info.bindPort,
                destAddr: info.destIP || 'localhost',
                destPort: info.destPort || 5900
              });

              console.log(`Reverse tunnel established: ${info.bindPort} -> ${info.destIP || 'localhost'}:${info.destPort || 5900}`);
            }
          });

        }).on('end', () => {
          console.log('SSH Client disconnected');
          this.activeTunnels.delete(client);
        });
      });

      this.server.listen(this.port, '0.0.0.0', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`SSH Server listening on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.activeTunnels.clear();
      console.log('SSH Server stopped');
    }
  }

  getActiveTunnels() {
    return Array.from(this.activeTunnels.values());
  }
}

module.exports = ITSMSSHServer;
