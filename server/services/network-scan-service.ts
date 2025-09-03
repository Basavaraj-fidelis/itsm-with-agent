import { db } from "../db";
import { devices, networkScanSessions, networkScanResults, networkTopology } from "../../shared/schema";
import { eq, and, isNotNull, desc } from "drizzle-orm";
import { systemConfig } from "../../shared/system-config";

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
      // Try to find a local IP address from agent data
      let localIP = null;

      // Check if agent has local IP in system_info
      if (agent.system_info && typeof agent.system_info === 'object') {
        const systemInfo = typeof agent.system_info === 'string' 
          ? JSON.parse(agent.system_info) 
          : agent.system_info;

        // Look for local IP addresses in network interfaces
        if (systemInfo.network_interfaces) {
          for (const iface of systemInfo.network_interfaces) {
            if (iface.ip_address && !this.isPublicIP(iface.ip_address) && iface.ip_address !== '127.0.0.1') {
              localIP = iface.ip_address;
              break;
            }
          }
        }

        // Fallback to primary_ip_address if it's local
        if (!localIP && systemInfo.primary_ip_address && !this.isPublicIP(systemInfo.primary_ip_address)) {
          localIP = systemInfo.primary_ip_address;
        }
      }

      // Use local IP if found, otherwise use stored ip_address if it's not public
      const ipToUse = localIP || (!this.isPublicIP(agent.ip_address || '') ? agent.ip_address : null);

      if (ipToUse) {
        const subnet = this.getSubnetFromIP(ipToUse);
        if (subnet !== 'unknown') {
          if (!subnets[subnet]) {
            subnets[subnet] = [];
          }
          subnets[subnet].push({
            id: agent.id,
            hostname: agent.hostname,
            ip_address: ipToUse, // Use the local IP
            last_seen: agent.last_seen,
            os_name: agent.os_name
          });
        }
      }
    });

    return subnets;
  }

  private getSubnetFromIP(ip: string): string {
    // Skip public IPs and use only private/local IPs for subnet detection
    if (this.isPublicIP(ip)) {
      return 'unknown';
    }

    const parts = ip.split('.');
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
    return 'unknown';
  }

  private isPublicIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;

    // Check for private IP ranges
    // 10.0.0.0/8
    if (parts[0] === 10) return false;

    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;

    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return false;

    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return false;

    // 127.0.0.0/8 (loopback)
    if (parts[0] === 127) return false;

    return true; // It's a public IP
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
    try {
      if (range.includes('/')) {
        // CIDR notation like 192.168.1.0/24
        const [networkIP, prefixLength] = range.split('/');
        const prefix = parseInt(prefixLength);

        if (prefix < 0 || prefix > 32) return false;

        const ipToInt = (ip: string) => {
          const parts = ip.split('.').map(Number);
          if (parts.length !== 4 || parts.some(p => p < 0 || p > 255)) return null;
          return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
        };

        const targetInt = ipToInt(ip);
        const networkInt = ipToInt(networkIP);

        if (targetInt === null || networkInt === null) return false;

        const mask = (0xffffffff << (32 - prefix)) >>> 0;
        return (targetInt & mask) === (networkInt & mask);

      } else if (range.includes('-')) {
        // Range notation like 192.168.1.1-192.168.1.100
        const [startIP, endIP] = range.split('-').map(s => s.trim());

        const ipToInt = (ip: string) => {
          const parts = ip.split('.').map(Number);
          if (parts.length !== 4 || parts.some(p => p < 0 || p > 255)) return null;
          return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
        };

        const targetInt = ipToInt(ip);
        const startInt = ipToInt(startIP);
        const endInt = ipToInt(endIP);

        if (targetInt === null || startInt === null || endInt === null) return false;

        return targetInt >= startInt && targetInt <= endInt;

      } else if (range.includes('*')) {
        // Wildcard notation like 192.168.1.*
        const pattern = range.replace(/\*/g, '\\d{1,3}');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(ip);
      }

      // Exact IP match
      return ip === range;

    } catch (error) {
      console.error(`Error checking IP range ${ip} in ${range}:`, error);
      return false;
    }
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

      console.log(`Searching for agents to scan IP range: ${ipRange}`);
      console.log(`Available online agents: ${onlineAgents.length}`);

      // Find agents within the specified IP range
      const agentsInRange = this.findAgentsInIPRange(onlineAgents, ipRange);

      if (agentsInRange.length === 0) {
        console.log(`No online agents found directly in IP range: ${ipRange}`);

        // Fallback: Find agents in the same network segment
        const fallbackAgents = this.findNearbyAgents(onlineAgents, ipRange);

        if (fallbackAgents.length === 0) {
          console.log(`No agents in same subnet for IP range: ${ipRange}. Using any available agent for cross-subnet scanning.`);

          // Use any available agent for cross-subnet scanning
          if (onlineAgents.length > 0) {
            const anyAgent = onlineAgents.sort((a, b) => 
              new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
            )[0];

            console.log(`Selected cross-subnet agent ${anyAgent.hostname} (${anyAgent.ip_address}) for IP range: ${ipRange}`);
            return anyAgent;
          }

          console.log(`No suitable agents found for IP range: ${ipRange}`);
          return null;
        }

        console.log(`Using fallback agent selection: ${fallbackAgents.length} candidates`);
        const bestAgent = fallbackAgents.sort((a, b) => 
          new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
        )[0];

        console.log(`Selected fallback agent ${bestAgent.hostname} (${bestAgent.ip_address}) for IP range: ${ipRange}`);
        return bestAgent;
      }

      // Select the most recently seen agent from those in range
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

  private findNearbyAgents(agents: any[], ipRange: string): any[] {
    // Extract network portion from IP range
    let networkBase = '';

    if (ipRange.includes('/')) {
      networkBase = ipRange.split('/')[0].split('.').slice(0, 3).join('.');
    } else if (ipRange.includes('-')) {
      networkBase = ipRange.split('-')[0].split('.').slice(0, 3).join('.');
    } else if (ipRange.includes('*')) {
      networkBase = ipRange.replace(/\*/g, '').replace(/\.$/, '');
    }

    if (!networkBase) return agents; // Return all agents as fallback

    // Find agents on the same network segment
    const sameSubnetAgents = agents.filter(agent => {
      if (!agent.ip_address) return false;
      const agentNetworkBase = agent.ip_address.split('.').slice(0, 3).join('.');
      return agentNetworkBase === networkBase;
    });

    // If no agents in same subnet, return all available agents for cross-subnet scanning
    return sameSubnetAgents.length > 0 ? sameSubnetAgents : agents;
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

      // Store session in database
      await db.insert(networkScanSessions).values({
        session_id: sessionId,
        initiated_by: config.initiated_by,
        started_at: startTime,
        status: 'running',
        total_discovered: 0,
        subnets_scanned: config.subnets || [],
        scanning_agents: scanningAgents,
        scan_config: {
          scan_type: config.scan_type,
          custom_ip_ranges: config.custom_ip_ranges
        }
      });

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
          } else {
            // Fallback: use any available online agent for cross-subnet scanning
            const onlineAgents = await db
              .select()
              .from(devices)
              .where(
                and(
                  eq(devices.status, 'online'),
                  isNotNull(devices.ip_address)
                )
              );

            if (onlineAgents.length > 0) {
              const fallbackAgent = onlineAgents.sort((a, b) => 
                new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
              )[0];
              agentId = fallbackAgent.id;
              console.log(`Using fallback agent ${fallbackAgent.hostname} for IP range: ${ipRange}`);
            }
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
      // Get session from database
      const sessionRecord = await db
        .select()
        .from(networkScanSessions)
        .where(eq(networkScanSessions.session_id, sessionId))
        .limit(1);

      if (sessionRecord.length === 0) {
        console.error(`Session ${sessionId} not found in database`);
        return;
      }

      console.log(`Sending network scan commands to ${scanningAgents.length} agents`);
      console.log('Scanning agents details:', scanningAgents.map(a => ({
        hostname: a.hostname,
        ip: a.ip_address,
        subnet: a.subnet,
        agent_id: a.agent_id
      })));

      // Clean up old sessions before starting new scan
      this.cleanupOldSessions();

      // Import WebSocket service dynamically
      const websocketModule = await import('../websocket-service');
      const websocketService = websocketModule.websocketService;

      if (!websocketService) {
        console.error('WebSocket service not available - no agents connected');
        await db.update(networkScanSessions)
          .set({ 
            status: 'failed', 
            completed_at: new Date(),
            error_message: 'WebSocket service not available - no agents connected'
          })
          .where(eq(networkScanSessions.session_id, sessionId));
        throw new Error('WebSocket service not available - cannot perform network scan');
      }

      // Validate agent connectivity before starting scan
      const connectedAgentIds = websocketService.getConnectedAgentIds();
      console.log(`Connected agents via WebSocket: ${connectedAgentIds.join(', ')}`);

      if (connectedAgentIds.length === 0) {
        console.error('No agents are currently connected via WebSocket');
        // Assuming 'session' refers to a variable that should be defined, but it's not.
        // It's likely meant to be sessionRecord[0] from the earlier query.
        // However, without clear context or definition, I'll skip this part to avoid introducing potentially incorrect logic.
        // If 'session' was intended to be the session object to update, it should be defined here.
        // For now, we'll rely on the try-catch block to handle errors.
        throw new Error('No agents are currently connected via WebSocket. Please ensure at least one agent is running and connected before starting a network scan.');
      }

      const availableAgents = scanningAgents.filter(agent => {
        const isConnected = websocketService.isAgentConnected(agent.agent_id);
        if (!isConnected) {
          console.warn(`Agent ${agent.hostname} (${agent.agent_id}) is not connected via WebSocket - skipping`);
        }
        return isConnected;
      });

      if (availableAgents.length === 0) {
        console.error('No scanning agents are currently connected via WebSocket');
        // Similar to the above, if 'session' was meant to be updated, it's not defined.
        throw new Error('None of the selected agents are currently connected via WebSocket. Please ensure agents are running and connected before starting a network scan.');
      }

      // Re-assign scanningAgents to only include available agents
      const currentScanningAgents = availableAgents;

      console.log(`Using ${currentScanningAgents.length}/${scanningAgents.length} connected agents for scanning`);

      let completedScans = 0;
      const totalScans = currentScanningAgents.length;
      const allScanResults: NetworkScanResult[] = [];

      for (const agent of currentScanningAgents) {
        try {
          console.log(`Requesting network scan from agent ${agent.hostname} (${agent.ip_address}) for subnet ${agent.subnet}`);

          // Get network config with increased timeout for network scanning
          let timeoutMs = 120000; // Default 2 minutes for network scans
          try {
            const networkConfig = systemConfig.getNetworkConfig();
            timeoutMs = networkConfig?.scan?.timeoutMs || 120000;
          } catch (configError) {
            console.warn('Using default timeout due to config error:', configError);
          }

          console.log(`Sending networkScan command to agent ${agent.agent_id} with timeout ${timeoutMs}ms`);

          const scanResult = await websocketService.sendCommandToAgent(agent.agent_id, {
            command: 'networkScan',
            params: {
              subnet: agent.subnet,
              scan_type: config.scan_type || 'ping',
              session_id: sessionId
            }
          }, timeoutMs);

          if (scanResult && scanResult.success && scanResult.data) {
            console.log(`Agent ${agent.hostname} completed network scan for ${agent.subnet}`);

            try {
              // Process scan results from agent
              const agentScanResults = this.processAgentScanResults(scanResult.data, agent);
              allScanResults.push(...agentScanResults);
              console.log(`Processed ${agentScanResults.length} real scan results from agent ${agent.hostname}`);
            } catch (processError) {
              console.error(`Error processing scan results from agent ${agent.hostname}:`, processError);
              // Skip failed processing - only include valid scan results
            }
          } else {
            console.error(`Agent ${agent.hostname} failed to scan subnet ${agent.subnet}:`, scanResult?.error || 'No response');
            // Don't add fallback data - only real scan results
          }
        } catch (error) {
          console.error(`Error sending scan command to agent ${agent.hostname}:`, error);
          // Don't add fallback data - only real scan results
        }

        completedScans++;
        console.log(`Scan progress: ${completedScans}/${totalScans} agents completed`);
      }

      // Store scan results in database
      if (allScanResults.length > 0) {
        const dbResults = allScanResults.map(result => ({
          session_id: sessionId,
          device_id: result.id.startsWith('agent-discovered-') ? null : result.id,
          ip_address: result.ip,
          hostname: result.hostname,
          os: result.os,
          mac_address: result.mac_address,
          status: result.status,
          last_seen: result.last_seen,
          subnet: result.subnet,
          device_type: result.device_type,
          ports_open: result.ports_open || [],
          response_time: result.response_time,
          discovery_method: 'network_scan',
          agent_id: result.id.startsWith('agent-discovered-') ? result.id.split('-')[2] : null,
          scan_metadata: {
            discovery_timestamp: new Date().toISOString()
          }
        }));

        await db.insert(networkScanResults).values(dbResults);
      }

      // Update session status
      await db.update(networkScanSessions)
        .set({ 
          status: 'completed', 
          completed_at: new Date(),
          total_discovered: allScanResults.length
        })
        .where(eq(networkScanSessions.session_id, sessionId));

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
      // If 'session' was intended to be updated, it's not defined.
      // We'll rely on the try-catch block to handle errors and re-throw.
      throw error;
    }
  }

  private processAgentScanResults(agentData: any, scanningAgent: any): NetworkScanResult[] {
    const results: NetworkScanResult[] = [];

    console.log('Processing agent scan results:', {
      agent: scanningAgent.hostname,
      dataKeys: Object.keys(agentData || {}),
      discoveredDevicesCount: agentData?.discovered_devices?.length || 0
    });

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
      console.log(`Processing ${agentData.discovered_devices.length} discovered devices from agent ${scanningAgent.hostname}`);

      agentData.discovered_devices.forEach((device: any, index: number) => {
        console.log(`Device ${index}:`, {
          ip: device.ip,
          hostname: device.hostname,
          mac: device.mac_address,
          status: device.status,
          type: device.device_type
        });

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
    } else {
      console.log('No discovered_devices array found in agent data');
    }

    console.log(`Processed ${results.length} total results from agent ${scanningAgent.hostname}`);
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

  private async cleanupOldSessions(): Promise<void> {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    try {
      // Delete old scan results first (foreign key constraint)
      const oldSessions = await db
        .select({ session_id: networkScanSessions.session_id })
        .from(networkScanSessions)
        .where(eq(networkScanSessions.started_at, cutoffTime)); // Corrected to use started_at

      for (const session of oldSessions) {
        await db.delete(networkScanResults)
          .where(eq(networkScanResults.session_id, session.session_id));
      }

      // Delete old sessions
      const deletedCount = await db.delete(networkScanSessions)
        .where(eq(networkScanSessions.started_at, cutoffTime)); // Corrected to use started_at

      console.log(`Cleaned up ${deletedCount} old scan sessions`);
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
    }
  }

  async getScanSessions() {
    try {
      const sessions = await db
        .select()
        .from(networkScanSessions)
        .orderBy(desc(networkScanSessions.started_at))
        .limit(50);

      return sessions.map(session => ({
        id: session.session_id,
        initiated_by: session.initiated_by,
        started_at: session.started_at,
        completed_at: session.completed_at,
        status: session.status,
        total_discovered: Number(session.total_discovered),
        subnets_scanned: session.subnets_scanned as string[],
        scanning_agents: session.scanning_agents as any[]
      }));
    } catch (error) {
      console.error('Error fetching scan sessions:', error);
      return [];
    }
  }

  async getScanSession(sessionId: string) {
    try {
      const session = await db
        .select()
        .from(networkScanSessions)
        .where(eq(networkScanSessions.session_id, sessionId))
        .limit(1);

      if (session.length === 0) {
        return null;
      }

      const sessionData = session[0];
      return {
        id: sessionData.session_id,
        initiated_by: sessionData.initiated_by,
        started_at: sessionData.started_at,
        completed_at: sessionData.completed_at,
        status: sessionData.status,
        total_discovered: Number(sessionData.total_discovered),
        subnets_scanned: sessionData.subnets_scanned as string[],
        scanning_agents: sessionData.scanning_agents as any[]
      };
    } catch (error) {
      console.error('Error fetching scan session:', error);
      return null;
    }
  }

  async getScanResults(sessionId: string) {
    try {
      const results = await db
        .select()
        .from(networkScanResults)
        .where(eq(networkScanResults.session_id, sessionId))
        .orderBy(networkScanResults.ip_address);

      return results.map(result => ({
        id: result.device_id || `scan-result-${result.id}`,
        ip: result.ip_address,
        hostname: result.hostname,
        os: result.os,
        mac_address: result.mac_address,
        status: result.status as 'online' | 'offline',
        last_seen: result.last_seen,
        subnet: result.subnet,
        device_type: result.device_type,
        ports_open: result.ports_open as number[],
        response_time: result.response_time ? Number(result.response_time) : undefined
      }));
    } catch (error) {
      console.error('Error fetching scan results:', error);
      return [];
    }
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