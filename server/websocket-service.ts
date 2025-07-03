
import WebSocket from 'ws';
import { Server } from 'http';

class WebSocketService {
  private wss: WebSocket.Server | null = null;
  private channels: Map<string, Set<WebSocket>> = new Map();

  init(server: Server): void {
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection established');
      
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          
          if (data.type === 'subscribe' && data.channel) {
            this.subscribeToChannel(ws, data.channel);
          }
          
          if (data.type === 'unsubscribe' && data.channel) {
            this.unsubscribeFromChannel(ws, data.channel);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.removeFromAllChannels(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeFromAllChannels(ws);
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
}

export const webSocketService = new WebSocketService();

// Export function for use in other services
export function broadcastToChannel(channel: string, data: any): void {
  webSocketService.broadcastToChannel(channel, data);
}

export function broadcastToAll(data: any): void {
  webSocketService.broadcastToAll(data);
}
