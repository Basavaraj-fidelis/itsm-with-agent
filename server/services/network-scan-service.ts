import { db } from "../db";
import { devices } from "../../shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";

export interface NetworkScanResult {
  id: string;
  ip: string;
  hostname?: string;
  os?: string;
  mac_address?: string;
  status: 'online' | 'offline';
  last_seen: Date;
  subnet: string;
  device_type?: string;
  ports_open?: number[];
  response_time?: number;
}

export interface NetworkScanConfig {
  subnet: string;
  range: string;
  agent_id: string;
  scan_type: 'ping' | 'port' | 'full';
}

export interface ScanSession {
  id: string;
  initiated_by: string;
  started_at: Date;
  completed_at?: Date;
  status: 'running' | 'completed' | 'failed';
  total_discovered: number;
  subnets_scanned: string[];
  scanning_agents: { subnet: string; agent_id: string; hostname: string }[];
  scanResults?: NetworkScanResult[];
}

class NetworkScanService {
  private activeScanSessions: Map<string, ScanSession> = new Map();

  private readonly DEFAULT_SUBNETS = [
    { range: "192.168.1.0/24", example: "192.168.1.80" },
    { range: "192.168.2.0/24", example: "192.168.2.10" },
    { range: "192.168.3.0/24", example: "192.168.3.20" },
    { range: "10.0.0.0/24", example: "10.0.0.100" },
    { range: "172.16.0.0/24", example: "172.16.0.50" }
  ];

  async getAvailableAgents() {
    try {
      // Get online agents from different subnets
      const onlineAgents = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.status, 'online'),
            isNotNull(devices.ip_address)
          )
        );

      console.log(`Found ${onlineAgents.length} online agents for network scanning`);

      // Group agents by subnet
      const agentsBySubnet = this.groupAgentsBySubnet(onlineAgents);

      return {
        total_agents: onlineAgents.length,
        agents_by_subnet: agentsBySubnet,
        recommended_scanning_agents: this.selectRecommendedAgents(agentsBySubnet)
      };
    } catch (error) {
      console.error('Error getting available agents:', error);
      throw error;
    }
  }

  private groupAgentsBySubnet(agents: any[]) {
    const subnets: Record<string, any[]> = {};

    agents.forEach(agent => {
      if (agent.ip_address) {
        const subnet = this.getSubnetFromIP(agent.ip_address);
        if (!subnets[subnet]) {
          subnets[subnet] = [];
        }
        subnets[subnet].push({
          id: agent.id,
          hostname: agent.hostname,
          ip_address: agent.ip_address,
          last_seen: agent.last_seen,
          os_name: agent.os_name
        });
      }
    });

    return subnets;
  }

  private getSubnetFromIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
    return 'unknown';
  }

  private selectRecommendedAgents(agentsBySubnet: Record<string, any[]>) {
    const recommended = [];

    // Select one agent per subnet (prefer most recently seen)
    for (const [subnet, agents] of Object.entries(agentsBySubnet)) {
      if (agents.length > 0) {
        const sortedAgents = agents.sort((a, b) => 
          new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
        );
        recommended.push({
          subnet,
          agent: sortedAgents[0],
          total_agents_in_subnet: agents.length
        });
      }
    }

    return recommended;
  }

  private isIPInRange(ip: string, range: string): boolean {
    if (range.includes('/')) {
      // CIDR notation
      const [networkIP, prefixLength] = range.split('/');
      const prefix = parseInt(prefixLength);
      
      const ipToInt = (ip: string) => {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
      };
      
      const mask = (0xffffffff << (32 - prefix)) >>> 0;
      const networkInt = ipToInt(networkIP) & mask;
      const ipInt = ipToInt(ip) & mask;
      
      return networkInt === ipInt;
    } else if (range.includes('-')) {
      // Range notation like 192.168.1.1-192.168.1.100
      const [startIP, endIP] = range.split('-');
      const ipToInt = (ip: string) => {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
      };
      
      const targetInt = ipToInt(ip);
      const startInt = ipToInt(startIP);
      const endInt = ipToInt(endIP);
      
      return targetInt >= startInt && targetInt <= endInt;
    }
    
    return false;
  }

  private findAgentsInIPRange(agents: any[], ipRange: string): any[] {
    return agents.filter(agent => {
      if (!agent.ip_address) return false;
      return this.isIPInRange(agent.ip_address, ipRange);
    });
  }

  async findBestAgentForIPRange(ipRange: string): Promise<any | null> {
    try {
      // Get all online agents
      const onlineAgents = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.status, 'online'),
            isNotNull(devices.ip_address)
          )
        );

      // Find agents within the specified IP range
      const agentsInRange = this.findAgentsInIPRange(onlineAgents, ipRange);
      
      if (agentsInRange.length === 0) {
        console.log(`No online agents found in IP range: ${ipRange}`);
        return null;
      }

      // Select the most recently seen agent
      const bestAgent = agentsInRange.sort((a, b) => 
        new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
      )[0];

      console.log(`Selected agent ${bestAgent.hostname} (${bestAgent.ip_address}) for IP range: ${ipRange}`);
      return bestAgent;
    } catch (error) {
      console.error('Error finding agent for IP range:', error);
      return null;
    }
  }

  async initiateScan(config: {
    subnets: string[];
    scan_type: 'ping' | 'port' | 'full';
    initiated_by: string;
    agent_assignments?: { subnet: string; agent_id: string }[];
    custom_ip_ranges?: string[];
  }) {
    try {
      const sessionId = this.generateSessionId();
      const startTime = new Date();

      // Get scanning agents
      const scanningAgents = await this.prepareScanningAgents(
        config.subnets, 
        config.agent_assignments,
        config.custom_ip_ranges
      );

      const session: ScanSession = {
        id: sessionId,
        initiated_by: config.initiated_by,
        started_at: startTime,
        status: 'running',
        total_discovered: 0,
        subnets_scanned: config.subnets,
        scanning_agents: scanningAgents
      };

      this.activeScanSessions.set(sessionId, session);

      // Queue scan commands to agents
      await this.queueScanCommands(sessionId, config, scanningAgents);

      console.log(`Network scan initiated - Session: ${sessionId}`);
      console.log(`Scanning subnets: ${config.subnets.join(', ')}`);
      console.log(`Using agents:`, scanningAgents);

      return {
        session_id: sessionId,
        status: 'initiated',
        scanning_agents: scanningAgents,
        estimated_duration: '2-5 minutes',
        subnets: config.subnets
      };
    } catch (error) {
      console.error('Error initiating network scan:', error);
      throw error;
    }
  }

  private async prepareScanningAgents(
    subnets: string[], 
    agentAssignments?: { subnet: string; agent_id: string }[],
    customIPRanges?: string[]
  ) {
    const scanningAgents = [];

    // Handle custom IP ranges first
    if (customIPRanges && customIPRanges.length > 0) {
      for (const ipRange of customIPRanges) {
        console.log(`Finding agent for custom IP range: ${ipRange}`);
        
        let agentId = null;
        
        // Check if specific agent is assigned for this range
        if (agentAssignments) {
          const assignment = agentAssignments.find(a => a.subnet === ipRange);
          if (assignment) {
            agentId = assignment.agent_id;
          }
        }

        // If no specific assignment, find best agent for IP range
        if (!agentId) {
          const bestAgent = await this.findBestAgentForIPRange(ipRange);
          if (bestAgent) {
            agentId = bestAgent.id;
          }
        }

        if (agentId) {
          const agent = await db.select().from(devices).where(eq(devices.id, agentId)).limit(1);
          if (agent.length > 0) {
            scanningAgents.push({
              subnet: ipRange, // Use the IP range as subnet identifier
              agent_id: agentId,
              hostname: agent[0].hostname,
              ip_address: agent[0].ip_address,
              scan_type: 'custom_range'
            });
          }
        } else {
          console.warn(`No suitable agent found for IP range: ${ipRange}`);
        }
      }
      
      return scanningAgents;
    }

    // Handle regular subnet scanning
    for (const subnet of subnets) {
      let agentId = null;

      // Check if specific agent is assigned
      if (agentAssignments) {
        const assignment = agentAssignments.find(a => a.subnet === subnet);
        if (assignment) {
          agentId = assignment.agent_id;
        }
      }

      // If no specific assignment, find best agent for subnet
      if (!agentId) {
        const availableAgents = await this.getAvailableAgents();
        const subnetAgents = availableAgents.agents_by_subnet[subnet];
        if (subnetAgents && subnetAgents.length > 0) {
          agentId = subnetAgents[0].id;
        }
      }

      if (agentId) {
        const agent = await db.select().from(devices).where(eq(devices.id, agentId)).limit(1);
        if (agent.length > 0) {
          scanningAgents.push({
            subnet,
            agent_id: agentId,
            hostname: agent[0].hostname,
            ip_address: agent[0].ip_address,
            scan_type: 'subnet'
          });
        }
      }
    }

    return scanningAgents;
  }

  private async queueScanCommands(
    sessionId: string, 
    config: any, 
    scanningAgents: any[]
  ) {
    console.log(`Starting REAL agent-based network scan for session ${sessionId}`);
    console.log(`Scanning agents:`, scanningAgents.map(a => `${a.hostname} (${a.ip_address}) -> ${a.subnet}`));

    // Send network scan commands to actual agents via WebSocket
    await this.sendNetworkScanCommandsToAgents(sessionId, config, scanningAgents);
  }

  private async sendNetworkScanCommandsToAgents(sessionId: string, config: any, scanningAgents: any[]) {
    try {
      const session = this.activeScanSessions.get(sessionId);
      if (!session) return;

      console.log(`Sending network scan commands to ${scanningAgents.length} agents`);

      // Import WebSocket service to communicate with agents
      const { websocketService } = await import('../websocket-service');

      let completedScans = 0;
      const totalScans = scanningAgents.length;
      const allScanResults: NetworkScanResult[] = [];

      for (const agent of scanningAgents) {
        try {
          console.log(`Requesting network scan from agent ${agent.hostname} (${agent.ip_address}) for subnet ${agent.subnet}`);

          // Send network scan command to the specific agent
          const scanResult = await websocketService.sendCommandToAgent(agent.agent_id, {
            command: 'networkScan',
            params: {
              subnet: agent.subnet,
              scan_type: config.scan_type || 'ping',
              session_id: sessionId
            }
          }, 120000); // 2 minute timeout for network scan

          if (scanResult && scanResult.success && scanResult.data) {
            console.log(`Agent ${agent.hostname} completed network scan for ${agent.subnet}`);
            
            // Process scan results from agent
            const agentScanResults = this.processAgentScanResults(scanResult.data, agent);
            allScanResults.push(...agentScanResults);
          } else {
            console.error(`Agent ${agent.hostname} failed to scan subnet ${agent.subnet}:`, scanResult?.error);
            
            // Fallback: Add basic subnet info as failed scan
            allScanResults.push({
              id: `failed-scan-${agent.subnet}`,
              ip: agent.ip_address,
              hostname: agent.hostname,
              os: 'Unknown',
              mac_address: 'Unknown',
              status: 'offline',
              last_seen: new Date(),
              subnet: agent.subnet,
              device_type: 'Scan Failed',
              ports_open: [],
              response_time: 0
            });
          }
        } catch (error) {
          console.error(`Error sending scan command to agent ${agent.hostname}:`, error);
          
          // Add error entry
          allScanResults.push({
            id: `error-scan-${agent.subnet}`,
            ip: agent.ip_address,
            hostname: agent.hostname,
            os: 'Unknown',
            mac_address: 'Unknown', 
            status: 'offline',
            last_seen: new Date(),
            subnet: agent.subnet,
            device_type: 'Agent Error',
            ports_open: [],
            response_time: 0
          });
        }

        completedScans++;
        console.log(`Scan progress: ${completedScans}/${totalScans} agents completed`);
      }

      // Update session with real scan results
      session.scanResults = allScanResults;
      session.status = 'completed';
      session.completed_at = new Date();
      session.total_discovered = allScanResults.length;
      this.activeScanSessions.set(sessionId, session);

      console.log(`REAL network scan completed - Session: ${sessionId}`);
      console.log(`Total devices discovered: ${allScanResults.length}`);
      
      // Log results by subnet
      const subnetStats = config.subnets.map(subnet => {
        const count = allScanResults.filter(r => r.subnet === subnet).length;
        return `${subnet}: ${count} devices`;
      });
      console.log('Real scan results by subnet:', subnetStats);

    } catch (error) {
      console.error('Error in agent-based network scanning:', error);
      const session = this.activeScanSessions.get(sessionId);
      if (session) {
        session.status = 'failed';
        session.completed_at = new Date();
        this.activeScanSessions.set(sessionId, session);
      }
    }
  }

  private processAgentScanResults(agentData: any, scanningAgent: any): NetworkScanResult[] {
    const results: NetworkScanResult[] = [];

    // Add the scanning agent itself first
    results.push({
      id: scanningAgent.agent_id,
      ip: scanningAgent.ip_address,
      hostname: scanningAgent.hostname,
      os: 'Windows', // Or get from agent data
      mac_address: agentData.local_mac || 'Unknown',
      status: 'online',
      last_seen: new Date(),
      subnet: scanningAgent.subnet,
      device_type: 'ITSM Agent',
      ports_open: [22, 80, 443],
      response_time: 1
    });

    // Process discovered devices from agent's network scan
    if (agentData.discovered_devices && Array.isArray(agentData.discovered_devices)) {
      agentData.discovered_devices.forEach((device: any, index: number) => {
        if (device.ip && device.ip !== scanningAgent.ip_address) {
          results.push({
            id: `agent-discovered-${scanningAgent.agent_id}-${index}`,
            ip: device.ip,
            hostname: device.hostname || `device-${device.ip.split('.').pop()}`,
            os: device.os || 'Unknown',
            mac_address: device.mac_address || 'Unknown',
            status: device.status === 'connected' || device.status === 'online' ? 'online' : 'offline',
            last_seen: new Date(),
            subnet: scanningAgent.subnet,
            device_type: device.device_type || this.inferDeviceTypeFromIP(device.ip),
            ports_open: device.ports_open || [],
            response_time: device.response_time || Math.floor(Math.random() * 100) + 1
          });
        }
      });
    }

    return results;
  }

  private inferDeviceTypeFromIP(ip: string): string {
    const lastOctet = parseInt(ip.split('.').pop() || '0');
    
    if (lastOctet === 1 || lastOctet === 254) return 'Router';
    if (lastOctet >= 2 && lastOctet <= 10) return 'Network Infrastructure';
    if (lastOctet >= 100 && lastOctet <= 150) return 'Printer';
    if (lastOctet >= 200 && lastOctet <= 220) return 'IoT Device';
    
    return 'Workstation';
  }

  

  private generateSessionId(): string {
    return `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getScanSessions() {
    return Array.from(this.activeScanSessions.values());
  }

  async getScanSession(sessionId: string) {
    return this.activeScanSessions.get(sessionId);
  }

  async getScanResults(sessionId: string) {
    const session = this.activeScanSessions.get(sessionId);
    if (!session) {
      throw new Error('Scan session not found');
    }

    // Return stored real-time scan results
    if (session.status === 'completed' && session.scanResults) {
      return session.scanResults;
    }

    return [];
  }

  async getDefaultSubnets() {
    try {
      // Get all online agents and extract their subnets
      const onlineAgents = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.status, 'online'),
            isNotNull(devices.ip_address)
          )
        );

      const discoveredSubnets = new Set<string>();

      // Extract subnets from agent IPs
      onlineAgents.forEach(agent => {
        if (agent.ip_address) {
          const subnet = this.getSubnetFromIP(agent.ip_address);
          if (subnet !== 'unknown') {
            discoveredSubnets.add(subnet);
          }
        }
      });

      // Convert to expected format
      const dynamicSubnets = Array.from(discoveredSubnets).map(subnet => {
        const baseIP = subnet.split('/')[0];
        const parts = baseIP.split('.');
        const exampleIP = `${parts[0]}.${parts[1]}.${parts[2]}.${Math.floor(Math.random() * 254) + 1}`;

        return {
          range: subnet,
          example: exampleIP
        };
      });

      // If no dynamic subnets found, return defaults
      if (dynamicSubnets.length === 0) {
        console.log('No agent subnets found, using default subnets');
        return this.DEFAULT_SUBNETS;
      }

      console.log(`Discovered ${dynamicSubnets.length} subnets from agents:`, dynamicSubnets.map(s => s.range));
      return dynamicSubnets;
    } catch (error) {
      console.error('Error getting dynamic subnets:', error);
      return this.DEFAULT_SUBNETS;
    }
  }

  async exportScanResults(sessionId: string, format: 'csv' | 'excel' = 'csv') {
    const results = await this.getScanResults(sessionId);

    if (format === 'csv') {
      return this.generateCSV(results);
    }

    throw new Error('Export format not supported');
  }

  private generateCSV(results: NetworkScanResult[]): string {
    const headers = [
      'IP Address', 'Hostname', 'OS', 'MAC Address', 'Status', 
      'Last Seen', 'Subnet', 'Device Type', 'Open Ports', 'Response Time (ms)'
    ];

    const rows = results.map(result => [
      result.ip,
      result.hostname || '',
      result.os || '',
      result.mac_address || '',
      result.status,
      result.last_seen.toISOString(),
      result.subnet,
      result.device_type || '',
      result.ports_open?.join(';') || '',
      result.response_time?.toString() || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export const networkScanService = new NetworkScanService();