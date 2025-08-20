
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
}

class NetworkScanService {
  private activeScanSessions: Map<string, ScanSession> = new Map();
  
  private readonly DEFAULT_SUBNETS = [
    { range: "192.168.1.0/24", example: "192.168.1.80" },
    { range: "192.168.2.0/24", example: "192.168.2.10" },
    { range: "192.168.3.0/24", example: "192.168.3.20" }
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

  async initiateScan(config: {
    subnets: string[];
    scan_type: 'ping' | 'port' | 'full';
    initiated_by: string;
    agent_assignments?: { subnet: string; agent_id: string }[];
  }) {
    try {
      const sessionId = this.generateSessionId();
      const startTime = new Date();

      // Get scanning agents
      const scanningAgents = await this.prepareScanningAgents(
        config.subnets, 
        config.agent_assignments
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
    agentAssignments?: { subnet: string; agent_id: string }[]
  ) {
    const scanningAgents = [];
    
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
            ip_address: agent[0].ip_address
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
    // In a real implementation, this would queue commands to the agents
    // For now, we'll simulate the scan process
    console.log(`Queuing scan commands for session ${sessionId}`);
    
    // Simulate scan execution after delay
    setTimeout(() => {
      this.simulateScanResults(sessionId, config, scanningAgents);
    }, 3000);
  }

  private async simulateScanResults(sessionId: string, config: any, scanningAgents: any[]) {
    try {
      const session = this.activeScanSessions.get(sessionId);
      if (!session) return;

      // Generate mock scan results
      const mockResults = this.generateMockScanResults(config.subnets);
      
      // Update session
      session.status = 'completed';
      session.completed_at = new Date();
      session.total_discovered = mockResults.length;
      
      this.activeScanSessions.set(sessionId, session);
      
      console.log(`Network scan completed - Session: ${sessionId}, Discovered: ${mockResults.length} devices`);
    } catch (error) {
      console.error('Error processing scan results:', error);
      const session = this.activeScanSessions.get(sessionId);
      if (session) {
        session.status = 'failed';
        session.completed_at = new Date();
        this.activeScanSessions.set(sessionId, session);
      }
    }
  }

  private generateMockScanResults(subnets: string[]): NetworkScanResult[] {
    const results: NetworkScanResult[] = [];
    
    subnets.forEach(subnet => {
      const baseIP = subnet.split('/')[0].split('.').slice(0, 3).join('.');
      
      // Generate 5-15 random devices per subnet
      const deviceCount = Math.floor(Math.random() * 10) + 5;
      
      for (let i = 1; i <= deviceCount; i++) {
        const lastOctet = Math.floor(Math.random() * 254) + 1;
        const ip = `${baseIP}.${lastOctet}`;
        
        results.push({
          id: `scan-${Date.now()}-${i}`,
          ip,
          hostname: `device-${lastOctet}`,
          os: this.getRandomOS(),
          mac_address: this.generateRandomMAC(),
          status: Math.random() > 0.1 ? 'online' : 'offline',
          last_seen: new Date(),
          subnet,
          device_type: this.getRandomDeviceType(),
          ports_open: this.getRandomOpenPorts(),
          response_time: Math.floor(Math.random() * 100) + 1
        });
      }
    });
    
    return results;
  }

  private getRandomOS(): string {
    const osList = ['Windows 10', 'Windows 11', 'Ubuntu 20.04', 'macOS', 'CentOS 7', 'Debian 11', 'Unknown'];
    return osList[Math.floor(Math.random() * osList.length)];
  }

  private getRandomDeviceType(): string {
    const types = ['Workstation', 'Server', 'Printer', 'Router', 'Switch', 'IoT Device', 'Mobile Device'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private generateRandomMAC(): string {
    const hex = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
      if (i > 0) mac += ':';
      mac += hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)];
    }
    return mac;
  }

  private getRandomOpenPorts(): number[] {
    const commonPorts = [22, 23, 53, 80, 135, 139, 443, 445, 993, 995, 3389, 5985];
    const numPorts = Math.floor(Math.random() * 4) + 1;
    const shuffled = commonPorts.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numPorts);
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

    // In a real implementation, this would retrieve stored results
    // For now, generate fresh mock data
    if (session.status === 'completed') {
      return this.generateMockScanResults(session.subnets_scanned);
    }

    return [];
  }

  async getDefaultSubnets() {
    return this.DEFAULT_SUBNETS;
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
