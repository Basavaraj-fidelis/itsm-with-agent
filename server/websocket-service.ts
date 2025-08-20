import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private channels: Map<string, Set<WebSocket>> = new Map();
  private agentConnections: Map<string, WebSocket> = new Map(); // Store agent connections
  private pendingCommands: Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void; timeout: NodeJS.Timeout }> = new Map(); // Store pending commands

  init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);

          if (data.type === 'subscribe' && data.channel) {
            this.subscribeToChannel(ws, data.channel);
          }

          if (data.type === 'unsubscribe' && data.channel) {
            this.unsubscribeFromChannel(ws, data.channel);
          }

          // Handle agent connection and command responses
          if (data.type === 'agent-connect' && data.agentId) {
            console.log(`Agent connected: ${data.agentId}`);
            this.agentConnections.set(data.agentId, ws);
            // Optionally, send a confirmation or initial command to the agent
          }

          if (data.type === 'command-response' && data.requestId) {
            const commandInfo = this.pendingCommands.get(data.requestId);
            if (commandInfo) {
              clearTimeout(commandInfo.timeout);
              commandInfo.resolve(data.payload);
              this.pendingCommands.delete(data.requestId);
              console.log(`Received response for requestId: ${data.requestId}`);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.removeFromAllChannels(ws);
        // Remove agent connection if it was an agent
        for (const [agentId, connection] of this.agentConnections.entries()) {
          if (connection === ws) {
            this.agentConnections.delete(agentId);
            console.log(`Agent disconnected: ${agentId}`);
            break;
          }
        }
        // Clean up pending commands for closed connections
        for (const [requestId, commandInfo] of this.pendingCommands.entries()) {
          // This is a simplification; ideally, we'd know which agent a command was for.
          // For now, we'll assume any closed connection invalidates pending commands.
          // A more robust solution would tie pendingCommands to specific agent connections.
          clearTimeout(commandInfo.timeout);
          commandInfo.reject(new Error('Connection closed before command could complete'));
          this.pendingCommands.delete(requestId);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeFromAllChannels(ws);
        // Remove agent connection if it was an agent
        for (const [agentId, connection] of this.agentConnections.entries()) {
          if (connection === ws) {
            this.agentConnections.delete(agentId);
            console.error(`WebSocket error for agent ${agentId}:`, error);
            break;
          }
        }
        // Clean up pending commands for errored connections
        for (const [requestId, commandInfo] of this.pendingCommands.entries()) {
          clearTimeout(commandInfo.timeout);
          commandInfo.reject(new Error('WebSocket error occurred'));
          this.pendingCommands.delete(requestId);
        }
      });
    });

    console.log('WebSocket service initialized');
  }

  private subscribeToChannel(ws: WebSocket, channel: string): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }

    this.channels.get(channel)!.add(ws);
    console.log(`Client subscribed to channel: ${channel}`);
  }

  private unsubscribeFromChannel(ws: WebSocket, channel: string): void {
    if (this.channels.has(channel)) {
      this.channels.get(channel)!.delete(ws);
    }
  }

  private removeFromAllChannels(ws: WebSocket): void {
    for (const subscribers of this.channels.values()) {
      subscribers.delete(ws);
    }
  }

  broadcastToChannel(channel: string, data: any): void {
    if (!this.channels.has(channel)) {
      return;
    }

    const subscribers = this.channels.get(channel)!;
    const message = JSON.stringify(data);

    subscribers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
          subscribers.delete(ws);
        }
      } else {
        subscribers.delete(ws);
      }
    });
  }

  broadcastToAll(data: any): void {
    if (!this.wss) return;

    const message = JSON.stringify(data);

    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          console.error('Error broadcasting WebSocket message:', error);
        }
      }
    });
  }

  async sendCommandToAgent(agentId: string, command: any, timeoutMs: number = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      const connection = this.agentConnections.get(agentId);
      if (!connection || connection.readyState !== WebSocket.OPEN) {
        console.error(`Agent ${agentId} is not connected or connection not ready`);
        reject(new Error(`Agent ${agentId} is not connected`));
        return;
      }

      const requestId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(requestId);
        console.error(`Command timeout for agent ${agentId}, command: ${command.command}`);
        reject(new Error(`Command timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingCommands.set(requestId, { resolve, reject, timeout });

      const message = {
        type: 'command',
        requestId,
        ...command
      };

      console.log(`Sending command to agent ${agentId}:`, message);
      connection.send(JSON.stringify(message));
    });
  }
}

export const webSocketService = new WebSocketService();

// Export function for use in other services
export function broadcastToChannel(channel: string, data: any): void {
  webSocketService.broadcastToChannel(channel, data);
}

export function broadcastToAll(data: any): void {
  webSocketService.broadcastToAll(data);
}