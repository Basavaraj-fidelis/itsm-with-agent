import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private channels: Map<string, Set<WebSocket>> = new Map();
  // Store agent connections with enhanced metadata: ws instance, last ping time, alive status, connection time, message count
  private agentConnections: Map<string, { ws: WebSocket; lastPing: number; isAlive: boolean; connectedAt?: number; messageCount?: number }> = new Map();
  private pendingCommands: Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void; timeout: NodeJS.Timeout }> = new Map(); // Store pending commands

  init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      // Expecting a message with agentId upon connection
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);

          // Handle agent registration first
          if (data.type === 'agent-connect' && data.agentId) {
            this.onConnection(ws, data.agentId); // Call the improved connection handler
            return; // Processed as connection event
          }

          // If not agent-connect, it's a regular message from an already known agent or client
          // Try to find the agentId if it's an agent message
          let agentId: string | null = null;
          if (data.agentId) {
            agentId = data.agentId;
            // Update connection metadata if it's an agent message
            const connection = this.agentConnections.get(agentId);
            if (connection) {
              connection.messageCount = (connection.messageCount || 0) + 1;
              if (data.type === 'pong') {
                connection.lastPing = Date.now();
                connection.isAlive = true;
              }
            }
          } else if (data.type === 'pong') {
            // Handle pong from a client or an agent that didn't send agentId with pong
            // This part might need refinement if distinguishing between client pongs and agent pongs is critical
            // For now, we'll assume pongs from non-agents don't affect agentConnection status.
          }

          if (data.type === 'subscribe' && data.channel) {
            this.subscribeToChannel(ws, data.channel);
          }

          if (data.type === 'unsubscribe' && data.channel) {
            this.unsubscribeFromChannel(ws, data.channel);
          }

          // Handle command responses from agents
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

      // Handle initial connection setup and message routing
      // The actual agent registration is now triggered by the 'agent-connect' message.
      // The ws.on('connection') handler in WebSocketServer is more about the raw connection event.
      // We'll defer agent-specific logic to the 'agent-connect' message handling.

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.removeFromAllChannels(ws);
        // Remove agent connection if it was an agent that initiated this WS
        for (const [agentId, connection] of this.agentConnections.entries()) {
          if (connection.ws === ws) {
            console.log(`Agent ${agentId} disconnected from WebSocket.`);
            this.agentConnections.delete(agentId);
            // Clean up pending commands for this agent
            for (const [requestId, commandInfo] of this.pendingCommands.entries()) {
              // This is a simplification; ideally, we'd know which agent a command was for.
              // A more robust solution would tie pendingCommands to specific agent connections.
              // Here, we'll assume any closed connection invalidates pending commands.
              clearTimeout(commandInfo.timeout);
              commandInfo.reject(new Error(`Connection closed for agent ${agentId} before command could complete`));
              this.pendingCommands.delete(requestId);
            }
            break;
          }
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeFromAllChannels(ws);
        // Remove agent connection if it was an agent that initiated this WS
        for (const [agentId, connection] of this.agentConnections.entries()) {
          if (connection.ws === ws) {
            console.error(`WebSocket error for agent ${agentId}:`, error);
            this.agentConnections.delete(agentId);
            // Clean up pending commands for errored connections
            for (const [requestId, commandInfo] of this.pendingCommands.entries()) {
              clearTimeout(commandInfo.timeout);
              commandInfo.reject(new Error(`WebSocket error occurred for agent ${agentId}`));
              this.pendingCommands.delete(requestId);
            }
            break;
          }
        }
      });
    });

    console.log('WebSocket service initialized');
  }

  // Handles the initial connection setup for an agent
  onConnection(ws: WebSocket, deviceId: string): void {
    console.log(`Agent ${deviceId} connected via WebSocket`);

    // Store connection with enhanced metadata
    this.agentConnections.set(deviceId, {
      ws,
      lastPing: Date.now(),
      isAlive: true,
      connectedAt: Date.now(),
      messageCount: 0
    });

    // Set up heartbeat interval for this connection to periodically ping the agent
    const heartbeatInterval = setInterval(() => {
      if (this.agentConnections.has(deviceId)) {
        this.sendPing(deviceId); // Send a ping to check if the agent is still alive
      } else {
        clearInterval(heartbeatInterval); // Stop interval if agent is no longer connected
      }
    }, 30000); // Ping every 30 seconds

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);

        // Update connection metadata upon receiving a message
        const connection = this.agentConnections.get(deviceId);
        if (connection) {
          connection.messageCount++;
          if (data.type === 'pong') { // If agent responds to ping
            connection.lastPing = Date.now();
            connection.isAlive = true;
          }
        }

        this.handleAgentMessage(deviceId, data); // Handle the actual message content
      } catch (error) {
        console.error(`Error parsing message from agent ${deviceId}:`, error);
      }
    });

    ws.on('close', () => {
      console.log(`Agent ${deviceId} disconnected from WebSocket`);
      this.agentConnections.delete(deviceId);
      clearInterval(heartbeatInterval); // Clean up the heartbeat interval
    });

    ws.on('error', (error: any) => {
      console.error(`WebSocket error for agent ${deviceId}:`, error);
      this.agentConnections.delete(deviceId);
      clearInterval(heartbeatInterval); // Clean up the heartbeat interval
    });

    // Send immediate ping to verify connection upon registration
    this.sendPing(deviceId);

    // Announce connection status to server logs
    console.log(`Total WebSocket connections: ${this.agentConnections.size}`);
  }

  // Placeholder for handling specific agent messages after connection establishment
  private handleAgentMessage(deviceId: string, data: any): void {
    // This is where you'd route messages based on data.type for specific agent actions
    // For example, processing performance data, scan results, etc.
    // The original code handled 'agent-connect', 'command-response', 'subscribe', 'unsubscribe' here.
    // We've now separated 'agent-connect' to onConnection.
    // Command responses are handled directly where pendingCommands are managed.
    // Subscribe/unsubscribe are handled directly within the main message handler.
    // The performance data parsing logic would likely go here or be called from here.

    // Example: Logging performance data if received
    if (data.type === 'performance-data' && data.payload) {
      console.log(`Received performance data from ${deviceId}:`, data.payload);
      // You would typically process and store this data here.
      // The original error mentioned issues parsing raw_data, so that logic would go here.
      // Example:
      // this.processPerformanceData(deviceId, data.payload);
    }
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
          subscribers.delete(ws); // Remove unresponsive client
        }
      } else {
        subscribers.delete(ws); // Remove closed client
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

  // Sends a ping to a specific agent
  sendPing(agentId: string): void {
    const connection = this.agentConnections.get(agentId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      const pingMessage = JSON.stringify({ type: 'ping', timestamp: Date.now() });
      connection.ws.send(pingMessage);
      connection.lastPing = Date.now(); // Update last ping time proactively
      // console.log(`Sent ping to agent ${agentId}`); // Optional: for debugging
    } else if (connection) {
      console.warn(`Could not send ping to agent ${agentId}: WebSocket not open (state: ${connection.ws.readyState}). Assuming disconnected.`);
      this.agentConnections.delete(agentId); // Remove if connection is not open
    }
  }

  async sendCommandToAgent(agentId: string, command: any, timeoutMs: number = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      const connection = this.agentConnections.get(agentId);

      console.log(`Attempting to send command to agent ${agentId}`);
      console.log(`Available agent connections: ${Array.from(this.agentConnections.keys()).join(', ')}`);
      console.log(`Total connected agents: ${this.agentConnections.size}`);

      if (!connection) {
        console.error(`Agent ${agentId} is not found in agent connections`);
        console.error(`This likely means the agent is not connected via WebSocket`);
        reject(new Error(`Agent ${agentId} is not connected`));
        return;
      }

      if (connection.ws.readyState !== WebSocket.OPEN) {
        console.error(`Agent ${agentId} connection is not ready. State: ${connection.ws.readyState}`);
        console.error(`WebSocket states: CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3`);
        reject(new Error(`Agent ${agentId} connection is not ready`));
        return;
      }

      const requestId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(requestId);
        console.error(`Command timeout for agent ${agentId}, command: ${command.command}`);
        reject(new Error(`Command timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingCommands.set(requestId, { resolve, reject, timeout });

      let message: any;
      switch (command.command) {
        case 'networkScan':
          console.log(`Forwarding networkScan command to agent ${agentId}:`, command.params);
          if (command.params) {
            message = {
              type: 'command',
              requestId,
              command: 'networkScan',
              params: {
                subnet: command.params.subnet,
                scan_type: command.params.scan_type || 'ping',
                session_id: command.params.session_id
              }
            };
            console.log(`Sending networkScan command with params:`, message.params);
          } else {
             console.error(`networkScan command for agent ${agentId} requires params.`);
             clearTimeout(timeout);
             this.pendingCommands.delete(requestId);
             reject(new Error('networkScan command requires params'));
             return;
          }
          break;
        // Add other command types here if needed
        default:
          message = {
            type: 'command',
            requestId,
            ...command
          };
          break;
      }


      console.log(`Sending command to agent ${agentId}:`, message);
      connection.ws.send(JSON.stringify(message));
    });
  }

  // Endpoint to get status of all agent connections
  getConnectionStatus(): any {
    const connections = Array.from(this.agentConnections.entries()).map(([id, conn]) => ({
      agentId: id,
      isAlive: conn.isAlive,
      lastPing: conn.lastPing,
      connectedAt: conn.connectedAt || Date.now(), // Ensure connectedAt is always present
      messageCount: conn.messageCount || 0, // Ensure messageCount is always present
      connectionAge: Date.now() - (conn.connectedAt || Date.now()) // Calculate age of connection
    }));

    return {
      totalConnections: this.agentConnections.size,
      connectedAgents: Array.from(this.agentConnections.keys()),
      // lastActivity: this.lastActivity, // Assuming lastActivity is managed elsewhere or not relevant here
      connectionDetails: connections
    };
  }
}

export const webSocketService = new WebSocketService();
export const websocketService = webSocketService; // Alternative export name

// Export function for use in other services
export function broadcastToChannel(channel: string, data: any): void {
  webSocketService.broadcastToChannel(channel, data);
}

export function broadcastToAll(data: any): void {
  webSocketService.broadcastToAll(data);
}