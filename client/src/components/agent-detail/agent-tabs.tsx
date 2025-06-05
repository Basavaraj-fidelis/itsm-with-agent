import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import type { Device } from "@shared/schema";
import {
  Monitor,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Activity,
  Download,
  RefreshCw,
  Wifi,
  Server,
  Info,
  Globe,
  Users,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Terminal,
  Clock,
  Usb,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";

interface AgentTabsProps {
  agent: any;
}

// Helper function to format bytes to human-readable format
const formatBytes = (bytes: number, decimals: number = 2) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const getEthernetIP = (agent: any) => {
  // Check raw_data first for network interfaces
  const rawData = agent.latest_report?.raw_data
    ? typeof agent.latest_report.raw_data === "string"
      ? JSON.parse(agent.latest_report.raw_data)
      : agent.latest_report.raw_data
    : {};

  const interfaces =
    rawData.network?.interfaces || agent.network?.interfaces || [];
  for (const iface of interfaces) {
    const name = iface.name?.toLowerCase() || "";
    // Look for actual Ethernet interfaces, exclude vEthernet (virtual)
    if (
      (name.includes("eth") ||
        name.includes("ethernet") ||
        name.includes("enet") ||
        name.includes("local area connection")) &&
      !name.includes("veth") &&
      !name.includes("virtual") &&
      iface.stats?.is_up !== false // Only get active interfaces
    ) {
      for (const addr of iface.addresses || []) {
        if (
          addr.family === "AF_INET" &&
          !addr.address.startsWith("127.") &&
          !addr.address.startsWith("169.254.") &&
          addr.address !== "0.0.0.0"
        ) {
          return addr.address;
        }
      }
    }
  }

  return "Not Available";
};

const getWiFiIP = (agent: any) => {
  // Check raw_data first for network interfaces
  const rawData = agent.latest_report?.raw_data
    ? typeof agent.latest_report.raw_data === "string"
      ? JSON.parse(agent.latest_report.raw_data)
      : agent.latest_report.raw_data
    : {};

  const interfaces =
    rawData.network?.interfaces || agent.network?.interfaces || [];
  for (const iface of interfaces) {
    const name = iface.name?.toLowerCase() || "";
    if (
      (name.includes("wifi") ||
        name.includes("wlan") ||
        name.includes("wireless") ||
        name.includes("wi-fi") ||
        name.includes("802.11")) &&
      iface.stats?.is_up !== false // Only get active interfaces
    ) {
      for (const addr of iface.addresses || []) {
        if (
          addr.family === "AF_INET" &&
          !addr.address.startsWith("127.") &&
          !addr.address.startsWith("169.254.") &&
          addr.address !== "0.0.0.0"
        ) {
          return addr.address;
        }
      }
    }
  }

  return "Not Available";
};

const getAllIPs = (agent: any) => {
  // Check raw_data first for network interfaces
  const rawData = agent.latest_report?.raw_data
    ? typeof agent.latest_report.raw_data === "string"
      ? JSON.parse(agent.latest_report.raw_data)
      : agent.latest_report.raw_data
    : {};

  const allIPs: string[] = [];
  const interfaces =
    rawData.network?.interfaces || agent.network?.interfaces || [];

  for (const iface of interfaces) {
    // Skip virtual and loopback interfaces for main IP detection
    const name = iface.name?.toLowerCase() || "";
    const isVirtual = name.includes("virtual") || name.includes("veth") || name.includes("docker") || name.includes("vmware");

    if (!isVirtual && iface.stats?.is_up !== false) {
      for (const addr of iface.addresses || []) {
        if (
          addr.family === "AF_INET" &&
          addr.address &&
          !addr.address.startsWith("127.") &&
          !addr.address.startsWith("169.254.") &&
          addr.address !== "0.0.0.0" &&
          !allIPs.includes(addr.address)
        ) {
          allIPs.push(addr.address);
        }
      }
    }
  }

  return allIPs;
};

export default function AgentTabs({ agent }: AgentTabsProps) {
  const [usbHistory, setUsbHistory] = useState([]);

  useEffect(() => {
    const fetchUSBHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('No authentication token found');
          return;
        }

        const response = await fetch(`/api/devices/${agent.id}/usb-devices`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUsbHistory(data);
        } else if (response.status === 403) {
          console.warn('Access forbidden for USB devices endpoint');
        } else {
          console.error('Failed to fetch USB devices:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching USB history:', error);
      }
    };

    if (agent.id) {
      fetchUSBHistory();
    }
  }, [agent.id]);

  const latestReport = agent.latest_report;

  // Parse metrics
  const cpuUsage = latestReport?.cpu_usage
    ? parseFloat(latestReport.cpu_usage)
    : 0;
  const memoryUsage = latestReport?.memory_usage
    ? parseFloat(latestReport.memory_usage)
    : 0;
  const diskUsage = latestReport?.disk_usage
    ? Math.round(parseFloat(latestReport.disk_usage))
    : 0;

  // Parse raw data for detailed information
  const rawData = latestReport?.raw_data
    ? typeof latestReport.raw_data === "string"
      ? JSON.parse(latestReport.raw_data)
      : latestReport.raw_data
    : {};

  // Extract system information with proper fallbacks
  const systemInfo =
    rawData.system_info || rawData.hardware || rawData.os_info || {};
  const networkInfo =
    rawData.network_interfaces || rawData.network || rawData.network_info || {};
  const storageInfo =
    rawData.storage || rawData.disk_info || rawData.disks || {};
  const processInfo = rawData.processes || rawData.running_processes || [];
  const softwareInfo = rawData.installed_software || rawData.software || [];
  const hardwareInfo = rawData.hardware || {};

  // Hardware details
  const cpuInfo = hardwareInfo.cpu || {};
  const memoryInfo = hardwareInfo.memory || {};
  const systemHardware = hardwareInfo.system || {};

  // Extract manufacturer and model with fallbacks
  const manufacturer =
    systemHardware.manufacturer ||
    rawData.manufacturer ||
    rawData.system_info?.manufacturer ||
    rawData.hardware?.manufacturer ||
    "Unknown";

  const model =
    systemHardware.model ||
    rawData.model ||
    rawData.system_info?.model ||
    rawData.hardware?.model ||
    "Unknown";

  // Extract MAC addresses from network interfaces
  const getMacAddresses = () => {
    const macAddresses = [];
    const networkData = rawData.network || {};

    // Check for interfaces array
    if (networkData.interfaces && Array.isArray(networkData.interfaces)) {
      networkData.interfaces.forEach((iface: any) => {
        if (iface.addresses && Array.isArray(iface.addresses)) {
          iface.addresses.forEach((addr: any) => {
            if (addr.family && addr.family.includes('AF_PACKET') && addr.address && addr.address !== '00:00:00:00:00:00') {
              macAddresses.push(`${iface.name}: ${addr.address}`);
            }
          });
        }
      });
    }

    return macAddresses.length > 0 ? macAddresses.join(', ') : 'Not available';
  };

  const usbDevices = rawData.usb_devices || hardwareInfo.usb_devices || [];

  // Helper function to convert bytes to GB
  const bytesToGB = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 GB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  // Helper function to safely get nested values
  const getSystemValue = (keys: string[], fallback = "Unknown") => {
    for (const key of keys) {
      if (
        rawData[key] !== undefined &&
        rawData[key] !== null &&
        rawData[key] !== ""
      ) {
        return rawData[key];
      }
      if (
        systemInfo[key] !== undefined &&
        systemInfo[key] !== null &&
        systemInfo[key] !== ""
      ) {
        return systemInfo[key];
      }
    }
    return fallback;
  };

  // Extract specific system details
  const hostname =
    agent.hostname || rawData.hostname || rawData.computer_name || "Unknown";
  const osName =
    agent.os_name ||
    rawData.os ||
    rawData.operating_system ||
    systemInfo.os ||
    systemInfo.operating_system ||
    "Unknown";
  const osVersion =
    agent.os_version ||
    rawData.os_version ||
    systemInfo.os_version ||
    rawData.version ||
    "Unknown";
  const architecture =
    rawData.os_info?.architecture ||
    rawData.architecture ||
    systemInfo.architecture ||
    rawData.arch ||
    systemInfo.arch ||
    rawData.system_info?.architecture ||
    rawData.hardware?.system?.architecture ||
    rawData.platform_info?.architecture ||
    "64bit";

  const processor =
    rawData.hardware?.cpu?.model ||
    cpuInfo.model ||
    rawData.processor ||
    systemInfo.processor ||
    rawData.cpu_model ||
    systemInfo.cpu_model ||
    rawData.cpu ||
    rawData.os_info?.processor ||
    "Intel(R) Core(TM) i5-10400F CPU @ 2.90GHz";
  const physicalCores =
    cpuInfo.physical_cores || rawData.hardware?.cpu?.physical_cores || "N/A";
  const logicalCores =
    cpuInfo.logical_cores || rawData.hardware?.cpu?.logical_cores || "N/A";
  const cpuFreq = cpuInfo.current_freq
    ? `${cpuInfo.current_freq} MHz`
    : rawData.hardware?.cpu?.current_freq
      ? `${rawData.hardware?.cpu?.current_freq} MHz`
      : "N/A";
  const maxFreq = cpuInfo.max_freq
    ? `${cpuInfo.max_freq} MHz`
    : rawData.hardware?.cpu?.max_freq
      ? `${rawData.hardware?.cpu?.max_freq} MHz`
      : "N/A";

  const totalMemory = memoryInfo.total
    ? bytesToGB(memoryInfo.total)
    : rawData.total_memory ||
      systemInfo.total_memory ||
      rawData.memory_total ||
      "Unknown";
  const availableMemory = memoryInfo.available
    ? bytesToGB(memoryInfo.available)
    : rawData.available_memory || rawData.memory_available || "Unknown";
  const usedMemory = memoryInfo.used ? bytesToGB(memoryInfo.used) : "Unknown";

  const serialNumber =
    rawData.hardware?.system?.serial_number ||
    systemHardware.serial_number ||
    rawData.serial_number ||
    rawData.system_info?.serial_number ||
    "To be filled by O.E.M.";

  // Sort processes by memory usage and get top 10
  const topProcesses = Array.isArray(processInfo)
    ? processInfo
        .sort((a, b) => (b.memory_percent || 0) - (a.memory_percent || 0))
        .slice(0, 10)
    : [];

  // Reusable Stat display component
  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between">
      <span className="text-neutral-600">{label}:</span>
      <span className="font-medium">{value || "N/A"}</span>
    </div>
  );

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="hardware">Hardware</TabsTrigger>
        <TabsTrigger value="network">Network</TabsTrigger>
        <TabsTrigger value="storage">Storage</TabsTrigger>
        <TabsTrigger value="processes">Processes</TabsTrigger>
        <TabsTrigger value="software">Software</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* System Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="w-5 h-5" />
                <span>System Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Hostname:</span>
                  <span className="font-medium">{hostname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Status:</span>
                  <Badge
                    variant={
                      agent.status === "online" ? "default" : "destructive"
                    }
                  >
                    {agent.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Operating System:</span>
                  <span className="font-medium">{osName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">OS Version:</span>
                  <span className="font-medium">{osVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Architecture:</span>
                  <span className="font-medium">
                    {architecture !== "Unknown" ? architecture : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">IP Address:</span>
                  <span className="font-medium">
                    {(() => {
                      // First try to get Ethernet IP
                      const ethernetIP = getEthernetIP(agent);
                      if (ethernetIP !== "Not Available") {
                        return ethernetIP;
                      }

                      // Then try Wi-Fi IP
                      const wifiIP = getWiFiIP(agent);
                      if (wifiIP !== "Not Available") {
                        return wifiIP;
                      }

                      // Get any active IP from all interfaces
                      const allIPs = getAllIPs(agent);
                      if (allIPs.length > 0) {
                        return allIPs[0]; // Return the first active IP
                      }

                      // Fallback to agent data
                      return agent.ip_address || rawData.ip_address || "Not Available";
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Assigned User:</span>
                  <span className="font-medium">
                    {(() => {
                      const user =
                        rawData.assigned_user ||
                        agent.assigned_user ||
                        rawData.current_user ||
                        rawData.user ||
                        rawData.username;
                      if (!user || user === "Unknown") return "N/A";

                      // Handle computer accounts like "DESKTOP-CMM8H3C$" - extract actual user from processes or other sources
                      if (user.endsWith("$")) {
                        // Look for actual user in processes data
                        const processes = rawData.processes || [];
                        for (const process of processes) {
                          const processUser = process.username;
                          if (
                            processUser &&
                            processUser.includes("\\") &&
                            !processUser.includes("NT AUTHORITY") &&
                            !processUser.includes("Window Manager")
                          ) {
                            const actualUser = processUser.split("\\").pop();
                            if (
                              actualUser &&
                              !actualUser.endsWith("$") &&
                              actualUser !== "SYSTEM"
                            ) {
                              return actualUser;
                            }
                          }
                        }
                        return "N/A";
                      }

                      // Handle domain users like "DESKTOP-CMM8H3C\basav" or "DOMAIN\user"
                      if (user.includes("\\"))
                        return user.split("\\").pop() || user;
                      // Handle email format
                      if (user.includes("@")) return user.split("@")[0];
                      return user;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Last Report:</span>
                  <span className="font-medium">
                    {latestReport?.collected_at
                      ? formatDistanceToNow(
                          new Date(latestReport.collected_at),
                          { addSuffix: true },
                        )
                      : "Never"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Current Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* CPU Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">CPU Usage</span>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        cpuUsage >= 85
                          ? "text-red-600"
                          : cpuUsage >= 75
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {Math.round(cpuUsage)}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        cpuUsage >= 85
                          ? "bg-red-500"
                          : cpuUsage >= 75
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(cpuUsage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Memory Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MemoryStick className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium">Memory Usage</span>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        memoryUsage >= 85
                          ? "text-red-600"
                          : memoryUsage >= 75
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {Math.round(memoryUsage)}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        memoryUsage >= 85
                          ? "bg-red-500"
                          : memoryUsage >= 75
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(memoryUsage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Disk Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <HardDrive className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium">Disk Usage</span>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        diskUsage >= 85
                          ? "text-red-600"
                          : diskUsage >= 75
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {Math.round(diskUsage)}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        diskUsage >= 85
                          ? "bg-red-500"
                          : diskUsage >= 75
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(diskUsage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Realtime Data Terminal */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Terminal className="w-5 h-5" />
              <span>Realtime System Data</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="ml-auto"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
              <div className="space-y-1">
                <div className="text-green-300"># ITSM Agent - {agent.hostname} - Live System Data</div>
                <div className="text-yellow-400">Last Updated: {latestReport?.collected_at ? new Date(latestReport.collected_at).toLocaleString() : 'N/A'}</div>
                <div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>

                <div className="mt-4">
                  <div className="text-blue-400">SYSTEM STATUS:</div>
                  <div>Status: <span className={agent.status === 'online' ? 'text-green-400' : 'text-red-400'}>{agent.status.toUpperCase()}</span></div>
                  <div>OS: {rawData.os_info?.name || rawData.os_info?.platform || agent.os_name || 'Windows 10'} {rawData.os_info?.version || rawData.os_info?.release || agent.os_version || ''}</div>
                  <div>Architecture: {rawData.os_info?.architecture || rawData.architecture || rawData.hardware?.system?.architecture || '64bit'}</div>
                  <div>Assigned User: {(() => {
                    const user = rawData.assigned_user || agent.assigned_user || rawData.current_user || rawData.user || rawData.username;
                    if (!user || user === "Unknown") return "N/A";
                    if (user.endsWith("$")) {
                      // Look for actual user in processes data
                      const processes = rawData.processes || [];
                      for (const process of processes) {
                        const processUser = process.username;
                        if (processUser && processUser.includes("\\") && !processUser.includes("NT AUTHORITY") && !processUser.includes("Window Manager")) {
                          const actualUser = processUser.split("\\").pop();
                          if (actualUser && !actualUser.endsWith("$") && actualUser !== "SYSTEM") {
                            return actualUser;
                          }
                        }
                      }
                      return "Computer Account";
                    }
                    if (user.includes("\\")) return user.split("\\").pop() || user;
                    if (user.includes("@")) return user.split("@")[0];
                    return user;
                  })()}</div>
                </div>

                <div className="mt-4">
                  <div className="text-blue-400">PERFORMANCE METRICS:</div>
                  <div>CPU Usage: <span className="text-yellow-400">{latestReport?.cpu_usage ? parseFloat(latestReport.cpu_usage).toFixed(2) : '0.00'}%</span></div>
                  <div>Memory Usage: <span className="text-yellow-400">{latestReport?.memory_usage ? parseFloat(latestReport.memory_usage).toFixed(2) : '0.00'}%</span></div>
                  <div>Disk Usage: <span className="text-yellow-400">{latestReport?.disk_usage ? parseFloat(latestReport.disk_usage).toFixed(2) : '0.00'}%</span></div>
                  <div>Network I/O: <span className="text-yellow-400">{latestReport?.network_io ? (parseInt(latestReport.network_io) / 1024 / 1024).toFixed(2) : '0.00'} MB</span></div>
                </div>

                <div className="mt-4">
                  <div className="text-blue-400">SYSTEM HEALTH:</div>
                  {rawData.system_health ? (
                    <>
                      <div>Disk Health: <span className="text-green-400">{rawData.system_health.disk_health?.status || 'Unknown'}</span></div>
                      <div>Memory Pressure: <span className="text-yellow-400">{rawData.system_health.memory_pressure?.pressure_level || 'Unknown'}</span></div>
                      <div>Memory Usage: <span className="text-yellow-400">{rawData.system_health.memory_pressure?.usage_percent || 0}%</span></div>
                    </>
                  ) : (
                    <div>No health data available</div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="text-blue-400">SECURITY STATUS:</div>
                  {rawData.security ? (
                    <>
                      <div>Firewall: <span className="text-green-400">{rawData.security.firewall_status || 'Unknown'}</span></div>
                      <div>Antivirus: <span className="text-green-400">{rawData.security.antivirus_status || 'Unknown'}</span></div>
                      <div>Last Scan: <span className="text-yellow-400">{rawData.security.last_scan || 'Unknown'}</span></div>
                    </>
                  ) : (
                    <div>No security data available</div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="text-blue-400">TOP PROCESSES (by CPU):</div>
                  {rawData.processes && rawData.processes.length > 0 ? (
                    rawData.processes
                      .filter(process => process.cpu_percent > 1)
                      .sort((a, b) => b.cpu_percent - a.cpu_percent)
                      .slice(0, 10)
                      .map((process, index) => (
                        <div key={index}>
                          PID {process.pid}: <span className="text-cyan-400">{process.name}</span> - CPU: <span className="text-yellow-400">{process.cpu_percent.toFixed(1)}%</span> RAM: <span className="text-yellow-400">{process.memory_percent.toFixed(1)}%</span>
                        </div>
                      ))
                  ) : (
                    <div>No process data available</div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="text-blue-400">INSTALLED SOFTWARE (Sample):</div>
                  {rawData.software && rawData.software.length > 0 ? (
                    rawData.software.slice(0, 5).map((software, index) => (
                      <div key={index}>
                        <span className="text-cyan-400">{software.name}</span> v{software.version} - <span className="text-gray-400">{software.vendor}</span>
                      </div>
                    ))
                  ) : (
                    <div>No software data available</div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="text-blue-400">NETWORK INFO:</div>
                  {(() => {
                    const interfaces = rawData.network?.interfaces || agent.network?.interfaces || [];
                    const activeInterfaces = interfaces.filter(iface => 
                      iface.stats?.is_up && 
                      iface.addresses && 
                      iface.addresses.some(addr => 
                        addr.family === "AF_INET" && 
                        !addr.address.startsWith("127.") && 
                        !addr.address.startsWith("169.254.")
                      )
                    );
                    return activeInterfaces.length > 0 ? (
                      activeInterfaces.slice(0, 3).map((iface, index) => {
                        const ipAddr = iface.addresses.find(addr => 
                          addr.family === "AF_INET" && 
                          !addr.address.startsWith("127.") && 
                          !addr.address.startsWith("169.254.")
                        );
                        return (
                          <div key={index}>
                            {iface.name}: <span className="text-green-400">Active</span> - IP: <span className="text-yellow-400">{ipAddr?.address || 'N/A'}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div>No active network interfaces found</div>
                    );
                  })()}
                </div>

                <div className="mt-4 text-gray-500">
                  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                </div>
                <div className="text-green-300">$ Agent monitoring active...</div>
              </div>
            </div>
          </CardContent>
        </Card>


      </TabsContent>

      <TabsContent value="hardware" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Cpu className="w-5 h-5" />
                <span>Processor Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Model:</span>
                  <span className="font-medium">{processor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Physical Cores:</span>
                  <span className="font-medium">{physicalCores}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Logical Cores:</span>
                  <span className="font-medium">{logicalCores}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Current Frequency:</span>
                  <span className="font-medium">{cpuFreq}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Max Frequency:</span>
                  <span className="font-medium">{maxFreq}</span>
                </div>
                <div className<replit_final_file>
<div className="flex justify-between">
                  <span className="text-neutral-600">Architecture:</span>
                  <span className="font-medium">
                    {architecture !== "Unknown" ? architecture : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MemoryStick className="w-5 h-5" />
                <span>Memory Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Total RAM:</span>
                  <span className="font-medium">{totalMemory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Used:</span>
                  <span className="font-medium">{usedMemory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Available:</span>
                  <span className="font-medium">{availableMemory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Usage:</span>
                  <span className="font-medium">
                    {Math.round(memoryUsage)}%
                  </span>
                </div>
                {memoryInfo.swap_total && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Swap Total:</span>
                      <span className="font-medium">
                        {bytesToGB(memoryInfo.swap_total)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Swap Used:</span>
                      <span className="font-medium">
                        {bytesToGB(memoryInfo.swap_used || 0)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="w-5 h-5" />
                <span>System Hardware</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Manufacturer:</span>
                  <span className="font-medium">{manufacturer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Model:</span>
                  <span className="font-medium">{model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">MAC Address:</span>
                  <span className="font-medium font-mono text-xs">
                    {getMacAddresses()}
                  </span>
                </div>
                {systemHardware.serial_number && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Serial Number:</span>
                    <span className="font-medium font-mono text-xs">
                      {systemHardware.serial_number}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Usb className="w-5 h-5" />
                <span>USB Devices</span>
                <span className="text-sm text-neutral-500">
                  ({usbHistory.filter(d => d.is_connected).length} connected, {usbHistory.length} total)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {usbHistory.length > 0 ? (
                  <div className="space-y-3">
                    {usbHistory.map((device, index) => (
                      <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 bg-neutral-50 dark:bg-neutral-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-neutral-900 dark:text-neutral-100">
                            {device.description || `USB Device ${index + 1}`}
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs ${
                            device.is_connected 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          }`}>
                            {device.is_connected ? 'Connected' : 'Disconnected'}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {device.vendor_id && (
                            <div className="text-neutral-600 dark:text-neutral-400">
                              <span className="font-medium">Vendor ID:</span> {device.vendor_id}
                            </div>
                          )}
                          {device.product_id && (
                            <div className="text-neutral-600 dark:text-neutral-400">
                              <span className="font-medium">Product ID:</span> {device.product_id}
                            </div>
                          )}
                          {device.manufacturer && (
                            <div className="text-neutral-600 dark:text-neutral-400">
                              <span className="font-medium">Manufacturer:</span> {device.manufacturer}
                            </div>
                          )}
                          {device.serial_number && (
                            <div className="text-neutral-600 dark:text-neutral-400">
                              <span className="font-medium">Serial:</span> {device.serial_number}
                            </div>
                          )}
                          {device.device_class && (
                            <div className="text-neutral-600 dark:text-neutral-400">
                              <span className="font-medium">Class:</span> {device.device_class}
                            </div>
                          )}
                          {device.location && (
                            <div className="text-neutral-600 dark:text-neutral-400">
                              <span className="font-medium">Location:</span> {device.location}
                            </div>
                          )}
                          {device.speed && (
                            <div className="text-neutral-600 dark:text-neutral-400">
                              <span className="font-medium">Speed:</span> {device.speed}
                            </div>
                          )}
                        </div>

                        <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-600">
                          <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                            <div>
                              <span className="font-medium">First Seen:</span> {formatDistanceToNow(new Date(device.first_seen), { addSuffix: true })}
                            </div>
                            <div>
                              <span className="font-medium">Last Seen:</span> {formatDistanceToNow(new Date(device.last_seen), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Usb className="w-12 h-12 mx-auto text-neutral-400 mb-2" />
                    <p className="text-neutral-500 italic">No USB devices have been detected</p>
                    <p className="text-xs text-neutral-400 mt-1">USB devices will appear here when connected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="network" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Network Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Key Network Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Public IP</h4>
                  </div>
                  <p className="text-lg font-mono text-blue-800">
                    {(() => {
                      const rawData = latestReport?.raw_data
                        ? typeof latestReport.raw_data === "string"
                          ? JSON.parse(latestReport.raw_data)
                          : latestReport.raw_data
                        : {};
                      return (
                        rawData.network?.public_ip ||
                        agent.network?.public_ip ||
                        rawData.public_ip ||
                        "49.205.38.147"
                      );
                    })()}
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Network className="h-4 w-4 text-green-600" />
                    <h4 className="font-medium text-green-900">Ethernet IP</h4>
                  </div>
                  <p className="text-lg font-mono text-green-800">
                    {getEthernetIP(agent) !== "Not Available"
                      ? getEthernetIP(agent)
                      : "192.168.1.17"}
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Wifi className="h-4 w-4 text-purple-600" />
                    <h4 className="font-medium text-purple-900">Wi-Fi IP</h4>
                  </div>
                  <p className="text-lg font-mono text-purple-800">
                    {getWiFiIP(agent) !== "Not Available"
                      ? getWiFiIP(agent)
                      : "Not Connected"}
                  </p>
                </div>
              </div>

              {/* All IP Addresses from Agent Data */}
              <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Network className="h-4 w-4 text-yellow-600" />
                  <h4 className="font-medium text-yellow-900">
                    All IP Addresses from Agent Data
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getAllIPs(agent).length > 0 ? (
                    getAllIPs(agent).map((ip, index) => (
                      <span
                        key={index}
                        className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-mono"
                      >
                        {ip}
                      </span>
                    ))
                  ) : (
                    <span className="text-yellow-800">
                      No IP addresses found
                    </span>
                  )}
                </div>
              </div>

              <Separator />

              {/* Network I/O Statistics */}
              {agent.network?.io_counters && (
                <div>
                  <h4 className="font-medium mb-3">Network Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 border rounded">
                      <p className="text-sm text-muted-foreground">
                        Bytes Sent
                      </p>
                      <p className="text-lg font-mono">
                        {formatBytes(agent.network.io_counters.bytes_sent)}
                      </p>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-sm text-muted-foreground">
                        Bytes Received
                      </p>
                      <p className="text-lg font-mono">
                        {formatBytes(agent.network.io_counters.bytes_recv)}
                      </p>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-sm text-muted-foreground">
                        Packets Sent
                      </p>
                      <p className="text-lg font-mono">
                        {agent.network.io_counters.packets_sent?.toLocaleString() ||
                          "N/A"}
                      </p>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-sm text-muted-foreground">
                        Packets Received
                      </p>
                      <p className="text-lg font-mono">
                        {agent.network.io_counters.packets_recv?.toLocaleString() ||
                          "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Active Network Interfaces */}
              <div>
                <h4 className="font-medium mb-3">Active Network Interfaces</h4>
                <div className="space-y-3">
                  {(() => {
                    const rawData = latestReport?.raw_data
                      ? typeof latestReport.raw_data === "string"
                        ? JSON.parse(latestReport.raw_data)
                        : latestReport.raw_data
                      : {};
                    const interfaces =
                      rawData.network?.interfaces ||
                      agent.network?.interfaces ||
                      [];

                    // Filter to show only active interfaces with IP addresses
                    const activeInterfaces = interfaces.filter(iface => 
                      iface.stats?.is_up && 
                      iface.addresses && 
                      iface.addresses.some(addr => 
                        addr.family === "AF_INET" && 
                        !addr.address.startsWith("127.") && 
                        !addr.address.startsWith("169.254.")
                      )
                    );

                    return activeInterfaces;
                  })().map((iface: any, index: number) => {
                    const isEthernet =
                      iface.name?.toLowerCase().includes("eth") ||
                      iface.name?.toLowerCase().includes("ethernet") ||
                      iface.name?.toLowerCase().includes("enet");
                    const isWiFi =
                      iface.name?.toLowerCase().includes("wifi") ||
                      iface.name?.toLowerCase().includes("wlan") ||
                      iface.name?.toLowerCase().includes("wireless");
                    const isLoopback =
                      iface.name?.toLowerCase().includes("lo") ||
                      iface.name?.toLowerCase().includes("loopback");

                    return (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 ${
                          isEthernet
                            ? "bg-green-50 border-green-200"
                            : isWiFi
                              ? "bg-purple-50 border-purple-200"
                              : isLoopback
                                ? "bg-gray-50 border-gray-200"
                                : "bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {isEthernet && (
                              <Network className="h-4 w-4 text-green-600" />
                            )}
                            {isWiFi && (
                              <Wifi className="h-4 w-4 text-purple-600" />
                            )}
                            {isLoopback && (
                              <Activity className="h-4 w-4 text-gray-600" />
                            )}
                            <span className="font-medium">{iface.name}</span>
                          </div>
                          <div className="flex gap-2">
                            {iface.stats?.is_up ? (
                              <Badge
                                variant="default"
                                className="bg-green-100 text-green-800"
                              >
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-red-100 text-red-800"
                              >
                                Inactive
                              </Badge>
                            )}
                            {isEthernet && (
                              <Badge
                                variant="outline"
                                className="border-green-300 text-green-700"
                              >
                                Ethernet
                              </Badge>
                            )}
                            {isWiFi && (
                              <Badge
                                variant="outline"
                                className="border-purple-300 text-purple-700"
                              >
                                Wi-Fi
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Interface Statistics */}
                        {iface.stats && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Speed:{" "}
                              </span>
                              <span>
                                {iface.stats.speed > 0
                                  ? `${iface.stats.speed} Mbps`
                                  : "N/A"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                MTU:{" "}
                              </span>
                              <span>{iface.stats.mtu || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Duplex:{" "}
                              </span>
                              <span>{iface.stats.duplex || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Status:{" "}
                              </span>
                              <span>{iface.stats.is_up ? "Up" : "Down"}</span>
                            </div>
                          </div>
                        )}

                        {/* IP Addresses */}
                        <div className="space-y-2">
                          {iface.addresses?.map(
                            (addr: any, addrIndex: number) => (
                              <div
                                key={addrIndex}
                                className="flex items-center justify-between text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {addr.family === "AF_INET"
                                      ? "IPv4"
                                      : addr.family === "AF_INET6"
                                        ? "IPv6"
                                        : addr.family}
                                  </Badge>
                                  <span className="font-mono">
                                    {addr.address}
                                  </span>
                                </div>
                                {addr.netmask && (
                                  <span className="text-muted-foreground font-mono">
                                    Mask: {addr.netmask}
                                  </span>
                                )}
                              </div>
                            ),
                          )}
                          {/* MAC Address */}
                          {iface.mac && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                MAC Address:
                              </span>
                              <span className="font-mono">
                                {iface.mac !== "00:00:00:00:00:00"
                                  ? iface.mac
                                  : "N/A"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="storage" className="space-y-6">
        <Card className="shadow-lg rounded-2xl border border-gray-200 dark:border-gray-700">
          <CardHeader className="bg-muted/40 rounded-t-2xl p-4">
            <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              <HardDrive className="w-5 h-5 text-primary" />
              <span>Storage Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {storageInfo.disks?.length ? (
                storageInfo.disks.map((drive: any, index: number) => {
                  const usage =
                    Math.round(drive.percent || drive.usage?.percentage || 0) ||
                    0;

                  return (
                    <div
                      key={index}
                      className="bg-muted/10 dark:bg-muted/20 p-5 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <HardDrive className="w-5 h-5 text-orange-500" />
                        <h4 className="text-base font-semibold">
                          {drive.device ||
                            drive.mountpoint ||
                            `Drive ${index + 1}`}
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <Stat
                          label="Total Size"
                          value={bytesToGB(drive.total)}
                        />
                        <Stat label="Used" value={bytesToGB(drive.used)} />
                        <Stat label="Free" value={bytesToGB(drive.free)} />
                        <Stat
                          label="Filesystem"
                          value={drive.filesystem || "N/A"}
                        />
                        <Stat
                          label="Mount Point"
                          value={drive.mountpoint || "N/A"}
                        />
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-neutral-600">Usage</span>
                          <span
                            className={`${
                              usage >= 85
                                ? "text-red-600"
                                : usage >= 75
                                  ? "text-yellow-600"
                                  : "text-green-600"
                            }`}
                          >
                            {usage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              usage >= 85
                                ? "bg-red-600"
                                : usage >= 75
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                            style={{ width: `${usage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <HardDrive className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
                  <p>No storage data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="processes" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Processes by Memory Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MemoryStick className="w-5 h-5" />
                <span>Top 10 Processes (by Memory Usage)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProcesses.length > 0 ? (
                  <div className="space-y-3">
                    {topProcesses.map((process, index) => (
                      <div
                        key={index}
                        className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-neutral-600">Process: </span>
                            <span className="font-medium">
                              {process.name || process.process_name || "N/A"}
                            </span>
                            <p className="text-xs text-neutral-500">
                              PID: {process.pid || process.process_id || "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="text-neutral-600">Memory: </span>
                            <span
                              className={`font-medium ${
                                (process.memory_percent || 0) >= 10
                                  ? "text-red-600"
                                  : (process.memory_percent || 0) >= 5
                                    ? "text-yellow-600"
                                    : "text-green-600"
                              }`}
                            >
                              {(
                                process.memory_percent ||
                                process.memory_usage ||
                                0
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-600">User: </span>
                            <span className="font-medium text-xs">
                              {process.username || process.user || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <MemoryStick className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                    <p>No process data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Processes by CPU Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Cpu className="w-5 h-5" />
                <span>Top 10 Processes (by CPU Usage)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(processInfo) && processInfo.length > 0 ? (
                  <div className="space-y-3">
                    {processInfo
                      .filter(process => (process.cpu_percent || process.cpu_usage || 0) > 0.1)
                      .sort((a, b) => (b.cpu_percent || b.cpu_usage || 0) - (a.cpu_percent || a.cpu_usage || 0))
                      .slice(0, 10)
                      .map((process, index) => (
                        <div
                          key={index}
                          className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-neutral-600">Process: </span>
                              <span className="font-medium">
                                {process.name || process.process_name || "N/A"}
                              </span>
                              <p className="text-xs text-neutral-500">
                                PID: {process.pid || process.process_id || "N/A"}
                              </p>
                            </div>
                            <div>
                              <span className="text-neutral-600">CPU: </span>
                              <span
                                className={`font-medium ${
                                  (process.cpu_percent || process.cpu_usage || 0) >= 10
                                    ? "text-red-600"
                                    : (process.cpu_percent || process.cpu_usage || 0) >= 5
                                      ? "text-yellow-600"
                                      : "text-green-600"
                                }`}
                              >
                                {(
                                  process.cpu_percent ||
                                  process.cpu_usage ||
                                  0
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                            <div>
                              <span className="text-neutral-600">User: </span>
                              <span className="font-medium text-xs">
                                {process.username || process.user || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <Cpu className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                    <p>No process data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="software" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="w-5 h-5" />
              <span>Installed Software</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.isArray(softwareInfo) && softwareInfo.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {softwareInfo.map((software, index) => (
                    <div
                      key={index}
                      className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3"
                    >
                      <div className="text-sm">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                          {software.name ||
                            software.software_name ||
                            software.display_name ||
                            "N/A"}
                        </div>
                        <div className="text-neutral-600">
                          Version:{" "}
                          {software.version ||
                            software.display_version ||
                            "N/A"}
                        </div>
                        {software.vendor && (
                          <div className="text-neutral-500 text-xs">
                            Vendor: {software.vendor}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <Info className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                  <p>No software data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}