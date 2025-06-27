
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

interface TunnelConnection {
  agentId: string;
  websocket: WebSocket;
  lastPing: Date;
  capabilities: string[];
}

class AgentTunnelService extends EventEmitter {
  private connections = new Map<string, TunnelConnection>();
  
  registerAgent(agentId: string, ws: WebSocket, capabilities: string[]) {
    const connection: TunnelConnection = {
      agentId,
      websocket: ws,
      lastPing: new Date(),
      capabilities
    };
    
    this.connections.set(agentId, connection);
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleAgentMessage(agentId, message);
      } catch (error) {
        console.error(`Invalid message from agent ${agentId}:`, error);
      }
    });
    
    ws.on('close', () => {
      this.connections.delete(agentId);
      console.log(`Agent ${agentId} disconnected`);
    });
    
    console.log(`Agent ${agentId} connected with capabilities:`, capabilities);
  }
  
  async executeRemoteCommand(agentId: string, command: string, params: any = {}) {
    const connection = this.connections.get(agentId);
    if (!connection) {
      throw new Error(`Agent ${agentId} not connected`);
    }
    
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, 30000);
      
      const responseHandler = (response: any) => {
        if (response.requestId === requestId) {
          clearTimeout(timeout);
          this.removeListener('commandResponse', responseHandler);
          
          if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'Command failed'));
          }
        }
      };
      
      this.on('commandResponse', responseHandler);
      
      connection.websocket.send(JSON.stringify({
        type: 'command',
        requestId,
        command,
        params
      }));
    });
  }
  
  private handleAgentMessage(agentId: string, message: any) {
    switch (message.type) {
      case 'ping':
        const connection = this.connections.get(agentId);
        if (connection) {
          connection.lastPing = new Date();
          connection.websocket.send(JSON.stringify({ type: 'pong' }));
        }
        break;
        
      case 'commandResponse':
        this.emit('commandResponse', message);
        break;
        
      case 'adSync':
        this.handleADSync(agentId, message.data);
        break;
        
      default:
        console.warn(`Unknown message type from agent ${agentId}:`, message.type);
    }
  }
  
  private async handleADSync(agentId: string, adData: any) {
    try {
      // Process AD sync data
      console.log(`Processing AD sync from agent ${agentId}:`, adData);
      this.emit('adSyncReceived', { agentId, data: adData });
    } catch (error) {
      console.error(`Error processing AD sync from agent ${agentId}:`, error);
    }
  }
  
  getConnectedAgents() {
    return Array.from(this.connections.entries()).map(([agentId, connection]) => ({
      agentId,
      lastPing: connection.lastPing,
      capabilities: connection.capabilities,
      connected: true
    }));
  }
  
  isAgentConnected(agentId: string) {
    return this.connections.has(agentId);
  }
}

export const agentTunnelService = new AgentTunnelService();
