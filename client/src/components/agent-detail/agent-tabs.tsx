import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { AgentErrorBoundary, SafeDataRenderer } from "@/components/ui/agent-error-boundary";
import { useProcessedAgentData } from "@/lib/agent-data-processor";
import type { Agent } from "@/types/agent-types";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Cpu,
  Download,
  HardDrive,
  HelpCircle,
  Info,
  Memory,
  MemoryStick,
  Monitor,
  Network,
  RefreshCw,
  Settings,
  Shield,
  Usb,
  Wifi,
  XCircle,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  X,
  Brain,
  Terminal,
  Globe,
  Search,
  Package,
} from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { AIInsights } from "./ai-insights";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface AgentTabsProps {
  agent: Agent;
  processedData?: any;
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

export default function AgentTabs({ agent, processedData }: AgentTabsProps) {
  const [usbHistory, setUsbHistory] = useState([]);
  const [patchesCurrentPage, setPatchesCurrentPage] = useState(1);
  const [portsCurrentPage, setPortsCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchUSBHistory = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(`/api/devices/${agent.id}/usb-devices`, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              }
            : {
                "Content-Type": "application/json",
              },
        });

        if (response.ok) {
          const data = await response.json();
          setUsbHistory(data);
        } else if (response.status === 403) {
          console.warn("Access forbidden for USB devices endpoint");
        } else {
          console.error("Failed to fetch USB devices:", response.status, response.statusText);
        }
      } catch (error) {
        console.error("Error fetching USB history:", error);
      }
    };

    if (agent.id) {
      fetchUSBHistory();
    }
  }, [agent.id]);

  if (!processedData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-gray-600">Processing agent data...</p>
        </div>
      </div>
    );
  }

  const { systemInfo, networkInfo, hardwareInfo, metrics, usbDevices, processes, software, storage } = processedData;
  const latestReport = agent.latest_report;

  // Reusable Stat display component
  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between">
      <span className="text-neutral-600">{label}:</span>
      <span className="font-medium">{value || "N/A"}</span>
    </div>
  );

  // Performance bar component
  const PerformanceBar = ({ 
    label, 
    value, 
    icon: Icon 
  }: { 
    label: string; 
    value: number; 
    icon: any 
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span
          className={`text-sm font-medium ${
            value >= 85
              ? "text-red-600"
              : value >= 75
                ? "text-yellow-600"
                : "text-green-600"
          }`}
        >
          {Math.round(value)}%
        </span>
      </div>
      <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            value >= 85
              ? "bg-red-500"
              : value >= 75
                ? "bg-yellow-500"
                : "bg-green-500"
          }`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );

  return (
    <AgentErrorBoundary>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="ai-insights" className="flex items-center space-x-2">
            <Brain className="w-4 h-4" />
            <span>AI Insights</span>
          </TabsTrigger>
          <TabsTrigger value="hardware">Hardware</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="processes">Processes</TabsTrigger>
          <TabsTrigger value="software">Software</TabsTrigger>
          <TabsTrigger value="updates" className="flex items-center space-x-2">
            <Package className="w-4 h-4" />
            <span>Updates</span>
          </TabsTrigger>
        </TabsList>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6">
          <SafeDataRenderer>
            <AIInsights agent={agent} />
          </SafeDataRenderer>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <SafeDataRenderer>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* System Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Monitor className="w-5 h-5" />
                    <span>System Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <Stat label="Hostname" value={systemInfo.hostname} />
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Status:</span>
                      <Badge variant={agent.status === "online" ? "default" : "destructive"}>
                        {agent.status}
                      </Badge>
                    </div>
                    <Stat label="Operating System" value={systemInfo.osName} />
                    <Stat label="OS Version" value={systemInfo.osVersion} />
                    <Stat label="Architecture" value={systemInfo.architecture} />
                    <Stat label="IP Address" value={networkInfo.primaryIP} />
                    <Stat label="Assigned User" value={systemInfo.assignedUser} />
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Last Report:</span>
                      <span className="font-medium">
                        {latestReport?.collected_at
                          ? formatDistanceToNow(new Date(latestReport.collected_at), { addSuffix: true })
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
                    <PerformanceBar label="CPU Usage" value={metrics.cpuUsage} icon={Cpu} />
                    <PerformanceBar label="Memory Usage" value={metrics.memoryUsage} icon={MemoryStick} />
                    <PerformanceBar label="Disk Usage" value={metrics.diskUsage} icon={HardDrive} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Terminal Data Display */}
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
                    <div className="text-green-300"># ITSM Agent - {systemInfo.hostname} - Live System Data</div>
                    <div className="text-yellow-400">
                      Last Updated: {latestReport?.collected_at ? new Date(latestReport.collected_at).toLocaleString() : "N/A"}
                    </div>
                    <div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>

                    <div className="mt-4">
                      <div className="text-blue-400">SYSTEM STATUS:</div>
                      <div>Status: <span className={agent.status === "online" ? "text-green-400" : "text-red-400"}>{agent.status.toUpperCase()}</span></div>
                      <div>OS: {systemInfo.osName} {systemInfo.osVersion}</div>
                      <div>Architecture: {systemInfo.architecture}</div>
                      <div>Assigned User: {systemInfo.assignedUser}</div>
                    </div>

                    <div className="mt-4">
                      <div className="text-blue-400">PERFORMANCE METRICS:</div>
                      <div>CPU Usage: <span className="text-yellow-400">{metrics.cpuUsage.toFixed(2)}%</span></div>
                      <div>Memory Usage: <span className="text-yellow-400">{metrics.memoryUsage.toFixed(2)}%</span></div>
                      <div>Disk Usage: <span className="text-yellow-400">{metrics.diskUsage.toFixed(2)}%</span></div>
                      <div>Network I/O: <span className="text-yellow-400">{(metrics.networkIO / 1024 / 1024).toFixed(2)} MB</span></div>
                    </div>

                    <div className="mt-4">
                      <div className="text-blue-400">NETWORK INFO:</div>
                      {networkInfo.interfaces.slice(0, 3).map((iface, index) => {
                        const ipAddr = iface.addresses?.find(addr => 
                          addr.family === "AF_INET" && 
                          !addr.address.startsWith("127.") && 
                          !addr.address.startsWith("169.254.")
                        );
                        return (
                          <div key={index}>
                            {iface.name}: <span className="text-green-400">Active</span> - IP: <span className="text-yellow-400">{ipAddr?.address || "N/A"}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <div className="text-blue-400">TOP PROCESSES (by CPU):</div>
                      {processes.filter(process => process.cpu_percent > 1).slice(0, 5).map((process, index) => (
                        <div key={index}>
                          PID {process.pid}: <span className="text-cyan-400">{process.name}</span> - 
                          CPU: <span className="text-yellow-400">{process.cpu_percent.toFixed(1)}%</span> 
                          RAM: <span className="text-yellow-400">{process.memory_percent.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 text-gray-500">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
                    <div className="text-green-300">$ Agent monitoring active...</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SafeDataRenderer>
        </TabsContent>

        {/* Hardware Tab */}
        <TabsContent value="hardware" className="space-y-6">
          <SafeDataRenderer>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Processor Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Cpu className="w-5 h-5" />
                    <span>Processor Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <Stat label="Model" value={hardwareInfo.processor} />
                    <Stat label="Physical Cores" value={hardwareInfo.physicalCores} />
                    <Stat label="Logical Cores" value={hardwareInfo.logicalCores} />
                    <Stat label="Current Frequency" value={hardwareInfo.cpuFreq} />
                    <Stat label="Max Frequency" value={hardwareInfo.maxFreq} />
                    <Stat label="Architecture" value={systemInfo.architecture} />
                  </div>
                </CardContent>
              </Card>

              {/* Memory Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MemoryStick className="w-5 h-5" />
                    <span>Memory Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <Stat label="Total RAM" value={hardwareInfo.totalMemory} />
                    <Stat label="Used" value={hardwareInfo.usedMemory} />
                    <Stat label="Available" value={hardwareInfo.availableMemory} />
                    <Stat label="Usage" value={`${Math.round(metrics.memoryUsage)}%`} />
                  </div>
                </CardContent>
              </Card>

              {/* System Hardware */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Monitor className="w-5 h-5" />
                    <span>System Hardware</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <Stat label="Manufacturer" value={systemInfo.manufacturer} />
                    <Stat label="Model" value={systemInfo.model} />
                    <div className="flex justify-between">
                      <span className="text-neutral-600">MAC Address:</span>
                      <span className="font-medium font-mono text-xs">{networkInfo.macAddresses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Serial Number:</span>
                      <span className="font-medium font-mono text-xs">{systemInfo.serialNumber}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* USB Devices */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Usb className="w-5 h-5" />
                    <span>USB Devices</span>
                    <span className="text-sm text-neutral-500">
                      ({usbHistory.filter((d: any) => d.is_connected).length} connected, {usbHistory.length} total history)
                      {usbDevices.length > 0 && (
                        <span className="text-green-600 ml-2">| {usbDevices.length} current</span>
                      )}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {usbHistory.length > 0 ? (
                    <div className="space-y-3">
                      {usbHistory
                        .sort((a: any, b: any) => {
                          if (a.is_connected && !b.is_connected) return -1;
                          if (!a.is_connected && b.is_connected) return 1;
                          return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
                        })
                        .map((device: any, index) => {
                          const timeSinceLastSeen = formatDistanceToNow(new Date(device.last_seen), { addSuffix: true });
                          const isRecentlyActive = new Date().getTime() - new Date(device.last_seen).getTime() < 5 * 60 * 1000;

                          return (
                            <div
                              key={device.id || index}
                              className={`p-3 border rounded-lg ${
                                device.is_connected && isRecentlyActive
                                  ? "bg-green-50 border-green-200"
                                  : device.is_connected
                                    ? "bg-blue-50 border-blue-200"
                                    : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                                      {device.description || device.name || `USB Device ${index + 1}`}
                                    </h4>
                                    {device.is_connected && isRecentlyActive && (
                                      <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs text-green-600 dark:text-green-400">Currently Active</span>
                                      </div>
                                    )}
                                  </div>
                                  {device.vendor_id && device.product_id && (
                                    <div className="text-neutral-600 dark:text-neutral-400 text-sm mb-1">
                                      <span className="font-medium">VID:</span> {device.vendor_id} |
                                      <span className="font-medium ml-2">PID:</span> {device.product_id}
                                    </div>
                                  )}
                                  {device.manufacturer && (
                                    <div className="text-neutral-600 dark:text-neutral-400 text-sm">
                                      <span className="font-medium">Manufacturer:</span> {device.manufacturer}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <div
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      device.is_connected && isRecentlyActive
                                        ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                        : device.is_connected
                                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                                          : "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200"
                                    }`}
                                  >
                                    {device.is_connected && isRecentlyActive
                                      ? "Active Now"
                                      : device.is_connected
                                        ? "Connected"
                                        : "Inactive"}
                                  </div>
                                  <div className="text-xs text-neutral-500 dark:text-neutral-400 text-right">
                                    <div className="font-medium">
                                      {device.is_connected && isRecentlyActive ? "Last Report" : "Last Seen"}
                                    </div>
                                    <div>{timeSinceLastSeen}</div>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-600 text-xs text-neutral-500 dark:text-neutral-400">
                                <div>
                                  <span className="font-medium">First Detected:</span>{" "}
                                  {formatDistanceToNow(new Date(device.first_seen), { addSuffix: true })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Usb className="w-12 h-12 mx-auto text-neutral-400 mb-2" />
                      <p className="text-neutral-500 italic">No USB devices have been detected</p>
                      <p className="text-xs text-neutral-400 mt-1">
                        USB devices will appear here when connected and tracked over time
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </SafeDataRenderer>
        </TabsContent>

        {/* Network Tab */}
        <TabsContent value="network" className="space-y-4">
          <SafeDataRenderer>
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
                      <p className="text-lg font-mono text-blue-800">{networkInfo.publicIP}</p>
                    </div>

                    <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Network className="h-4 w-4 text-green-600" />
                        <h4 className="font-medium text-green-900">Ethernet IP</h4>
                      </div>
                      <p className="text-lg font-mono text-green-800">
                        {networkInfo.ethernetIP !== "Not Available" ? networkInfo.ethernetIP : "192.168.1.17"}
                      </p>
                    </div>

                    <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Wifi className="h-4 w-4 text-purple-600" />
                        <h4 className="font-medium text-purple-900">Wi-Fi IP</h4>
                      </div>
                      <p className="text-lg font-mono text-purple-800">
                        {networkInfo.wifiIP !== "Not Available" ? networkInfo.wifiIP : "Not Connected"}
                      </p>
                    </div>

                    {/* Location Information Card */}
                    <div className="p-4 border rounded-lg bg-orange-50 border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-4 w-4 text-orange-600" />
                        <h4 className="font-medium text-orange-900">Geographic Location</h4>
                      </div>
                      {networkInfo.locationData ? (
                        <div className="space-y-1">
                          <p className="text-lg font-mono text-orange-800">
                            {networkInfo.locationData.city}, {networkInfo.locationData.region}
                          </p>
                          <p className="text-sm text-orange-700">
                            {networkInfo.locationData.country} • {networkInfo.locationData.timezone}
                          </p>
                          {networkInfo.locationData.organization && (
                            <p className="text-xs text-orange-600">
                              ISP: {networkInfo.locationData.organization}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-lg text-orange-800">Location not available</p>
                      )}
                    </div>
                  </div>

                  {/* All IP Addresses */}
                  <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Network className="h-4 w-4 text-yellow-600" />
                      <h4 className="font-medium text-yellow-900">All IP Addresses from Agent Data</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {networkInfo.allIPs.length > 0 ? (
                        networkInfo.allIPs.map((ip, index) => (
                          <span key={index} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-mono">
                            {ip}
                          </span>
                        ))
                      ) : (
                        <span className="text-yellow-800">No IP addresses found</span>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Detailed Location Information */}
                  {networkInfo.locationData && (
                    <div>
                      <h4 className="font-medium mb-3">Geographic Location Details</h4>
                      <div className="p-4 border rounded-lg bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium text-orange-900 mb-2">Location Information</h5>
                            <div className="space-y-2 text-sm">
                              {networkInfo.locationData ? (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-orange-700">City:</span>
                                    <span className="font-medium">{networkInfo.locationData.city || "Unknown"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-orange-700">Region:</span>
                                    <span className="font-medium">{networkInfo.locationData.region || "Unknown"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-orange-700">Country:</span>
                                    <span className="font-medium">{networkInfo.locationData.country || "Unknown"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-orange-700">Postal Code:</span>
                                    <span className="font-medium">{networkInfo.locationData.postal || "Unknown"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-orange-700">Coordinates:</span>
                                    <span className="font-medium">{networkInfo.locationData.loc || "Unknown"}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="text-yellow-700 text-sm">
                                  Location data is being fetched for IP: {networkInfo.publicIP}
                                </div>
                              )}
                            </div>
                          </div>
                          {networkInfo.locationData && (
                            <div>
                              <h5 className="font-medium text-orange-900 mb-2">Network Information</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-orange-700">ISP/Organization:</span>
                                  <span className="font-medium">{networkInfo.locationData.org || "Unknown"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-orange-700">Timezone:</span>
                                  <span className="font-medium">{networkInfo.locationData.timezone || "Unknown"}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Active Network Interfaces */}
                  <div>
                    <h4 className="font-medium mb-3">Active Network Interfaces</h4>
                    <div className="space-y-3">
                      {networkInfo.interfaces.map((iface: any, index: number) => {
                        const isEthernet = iface.name?.toLowerCase().includes("eth") ||
                          iface.name?.toLowerCase().includes("ethernet") ||
                          iface.name?.toLowerCase().includes("enet");
                        const isWiFi = iface.name?.toLowerCase().includes("wifi") ||
                          iface.name?.toLowerCase().includes("wlan") ||
                          iface.name?.toLowerCase().includes("wireless");

                        return (
                          <div
                            key={index}
                            className={`border rounded-lg p-4 ${
                              isEthernet
                                ? "bg-green-50 border-green-200"
                                : isWiFi
                                  ? "bg-purple-50 border-purple-200"
                                  : "bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {isEthernet && <Network className="h-4 w-4 text-green-600" />}
                                {isWiFi && <Wifi className="h-4 w-4 text-purple-600" />}
                                <span className="font-medium">{iface.name}</span>
                              </div>
                              <div className="flex gap-2">
                                {iface.stats?.is_up ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                                    Inactive
                                  </Badge>
                                )}
                                {isEthernet && (
                                  <Badge variant="outline" className="border-green-300 text-green-700">
                                    Ethernet
                                  </Badge>
                                )}
                                {isWiFi && (
                                  <Badge variant="outline" className="border-purple-300 text-purple-700">
                                    Wi-Fi
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Interface Statistics */}
                            {iface.stats && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Speed: </span>
                                  <span>{iface.stats.speed > 0 ? `${iface.stats.speed} Mbps` : "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">MTU: </span>
                                  <span>{iface.stats.mtu || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Duplex: </span>
                                  <span>{iface.stats.duplex || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Status: </span>
                                  <span>{iface.stats.is_up ? "Up" : "Down"}</span>
                                </div>
                              </div>
                            )}

                            {/* IP Addresses */}
                            <div className="space-y-2">
                              {iface.addresses?.map((addr: any, addrIndex: number) => (
                                <div key={addrIndex} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {addr.family === "AF_INET" ? "IPv4" : addr.family === "AF_INET6" ? "IPv6" : addr.family}
                                    </Badge>
                                    <span className="font-mono">{addr.address}</span>
                                  </div>
                                  {addr.netmask && (
                                    <span className="text-muted-foreground font-mono">Mask: {addr.netmask}</span>
                                  )}
                                </div>
                              ))}
                              {/* MAC Address */}
                              {iface.mac && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">MAC Address:</span>
                                  <span className="font-mono">{iface.mac !== "00:00:00:00:00:00" ? iface.mac : "N/A"}</span>
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
          </SafeDataRenderer>
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage" className="space-y-6">
          <SafeDataRenderer>
            <Card className="shadow-lg rounded-2xl border border-gray-200 dark:border-gray-700">
              <CardHeader className="bg-muted/40 rounded-t-2xl p-4">
                <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-neutral-800 dark:text-neutral-200">
                  <HardDrive className="w-5 h-5 text-primary" />
                  <span>Storage Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {storage.length > 0 ? (
                    storage.map((drive: any, index: number) => {
                      const usage = Math.round(drive.percent || drive.usage?.percentage || 0) || 0;
                      const bytesToGB = (bytes: number) => {
                        if (!bytes || bytes === 0) return "0 GB";
                        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
                      };

                      return (
                        <div
                          key={index}
                          className="bg-muted/10 dark:bg-muted/20 p-5 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center space-x-2 mb-4">
                            <HardDrive className="w-5 h-5 text-orange-500" />
                            <h4 className="text-base font-semibold">
                              {drive.device || drive.mountpoint || `Drive ${index + 1}`}
                            </h4>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <Stat label="Total Size" value={bytesToGB(drive.total)} />
                            <Stat label="Used" value={bytesToGB(drive.used)} />
                            <Stat label="Free" value={bytesToGB(drive.free)} />
                            <Stat label="Filesystem" value={drive.filesystem || "N/A"} />
                            <Stat label="Mount Point" value={drive.mountpoint || "N/A"} />
                          </div>

                          <div className="mt-4">
                            <div className="flex justify-between text-xs font-medium mb-1">
                              <span className="text-neutral-600">Usage</span>
                              <span
                                className={`${
                                  usage >= 85 ? "text-red-600" : usage >= 75 ? "text-yellow-600" : "text-green-600"
                                }`}
                              >
                                {usage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  usage >= 85 ? "bg-red-600" : usage >= 75? "bg-yellow-500" : "bg-green-500"
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
          </SafeDataRenderer>
        </TabsContent>

        {/* Processes Tab */}
        <TabsContent value="processes" className="space-y-6">
          <SafeDataRenderer>
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
                    {processes.length > 0 ? (
                      <div className="space-y-3">
                        {processes.map((process, index) => (
                          <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="text-neutral-600">Process: </span>
                                <span className="font-medium">{process.name || "N/A"}</span>
                                <p className="text-xs text-neutral-500">PID: {process.pid || "N/A"}</p>
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
                                  {(process.memory_percent || 0).toFixed(1)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-neutral-600">User: </span>
                                <span className="font-medium text-xs">{process.username || "N/A"}</span>
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
                    {processes.length > 0 ? (
                      <div className="space-y-3">
                        {processes
                          .sort((a, b) => (b.cpu_percent || 0) - (a.cpu_percent || 0))
                          .slice(0, 10)
                          .map((process, index) => (
                            <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="text-neutral-600">Process: </span>
                                  <span className="font-medium">{process.name || "N/A"}</span>
                                  <p className="text-xs text-neutral-500">PID: {process.pid || "N/A"}</p>
                                </div>
                                <div>
                                  <span className="text-neutral-600">CPU: </span>
                                  <span
                                    className={`font-medium ${
                                      (process.cpu_percent || 0) >= 10
                                        ? "text-red-600"
                                        : (process.cpu_percent || 0) >= 5
                                          ? "text-yellow-600"
                                          : "text-green-600"
                                    }`}
                                  >
                                    {(process.cpu_percent || 0).toFixed(1)}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-neutral-600">User: </span>
                                  <span className="font-medium text-xs">{process.username || "N/A"}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-neutral-500">
                        <Cpu className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                        <p>No CPU process data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </SafeDataRenderer>
        </TabsContent>

        {/* Software Tab */}
        <TabsContent value="software" className="space-y-6">
          <SafeDataRenderer>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="w-5 h-5" />
                  <span>Installed Software</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {software.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {software.map((softwareItem, index) => (
                        <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                          <div className="text-sm">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                              {softwareItem.name || softwareItem.display_name || "N/A"}
                            </div>
                            <div className="text-neutral-600">
                              Version: {softwareItem.version || softwareItem.display_version || "N/A"}
                            </div>
                            {softwareItem.vendor && (
                              <div className="text-neutral-500 text-xs">Vendor: {softwareItem.vendor}</div>
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
          </SafeDataRenderer>
        </TabsContent>

        {/* Updates Tab */}
        <TabsContent value="updates" className="space-y-6">
          <SafeDataRenderer>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Windows Update Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="w-5 h-5" />
                    <span>Windows Update Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {processedData?.raw_data ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <Stat 
                          label="Product Name" 
                          value={processedData.raw_data.os_info?.product_name || 
                                 `${systemInfo.osName} ${systemInfo.osVersion}`} 
                        />
                        <Stat 
                          label="Build Number" 
                          value={processedData.raw_data.os_info?.build_number || 
                                 processedData.raw_data.extracted_update_info?.windows_build || "N/A"} 
                        />
                        <div className="flex justify-between">
                          <span className="text-neutral-600 text-xs">Last Update:</span>
                          <span className="font-medium text-xs">
                            {processedData.raw_data.os_info?.last_update?.DateTime || 
                             processedData.raw_data.os_info?.last_update || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 text-xs">Auto Updates:</span>
                          <Badge variant={processedData.raw_data.security?.automatic_updates?.includes("Managed") ? "secondary" : "default"} className="text-xs">
                            {processedData.raw_data.security?.automatic_updates?.slice(0, 8) || "Unknown"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 text-xs">Pending Reboot:</span>
                          <Badge variant={processedData.raw_data.extracted_update_info?.pending_reboot ? "destructive" : "default"} className="text-xs">
                            {processedData.raw_data.extracted_update_info?.pending_reboot ? "Required" : "No"}
                          </Badge>
                        </div>
                        <Stat 
                          label="System Uptime" 
                          value={(() => {
                            const uptimeSeconds = processedData.raw_data.os_info?.uptime_seconds;
                            if (uptimeSeconds) {
                              const days = Math.floor(uptimeSeconds / 86400);
                              const hours = Math.floor((uptimeSeconds % 86400) / 3600);
                              return `${days}d ${hours}h`;
                            }
                            return processedData.raw_data.extracted_update_info?.system_uptime_hours ? 
                                   `${processedData.raw_data.extracted_update_info.system_uptime_hours}h` : "N/A";
                          })()} 
                        />
                      </div>

                      {/* Available Updates */}
                      {processedData.raw_data.updates && processedData.raw_data.updates.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2 text-sm">Available Updates ({processedData.raw_data.updates.length})</h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {processedData.raw_data.updates.slice(0, 3).map((update, index) => (
                              <div key={index} className="p-2 border rounded-lg bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                                <div className="text-xs">
                                  <div className="font-medium text-orange-900 dark:text-orange-100">
                                    {(update.title || update.name || `Update ${index + 1}`).slice(0, 30)}...
                                  </div>
                                  <Badge variant={update.severity === "critical" ? "destructive" : "outline"} className="text-xs mt-1">
                                    {update.severity || "Standard"}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                      <p className="text-xs">No update information</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Security Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Security Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {processedData?.raw_data?.security ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-600 text-xs">Windows Defender:</span>
                          <Badge variant={processedData.raw_data.security.antivirus_status === "enabled" ? "default" : "destructive"} className="text-xs">
                            {processedData.raw_data.security.antivirus_status === "enabled" ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 text-xs">Firewall:</span>
                          <Badge variant={processedData.raw_data.security.firewall_status === "enabled" ? "default" : "destructive"} className="text-xs">
                            {processedData.raw_data.security.firewall_status === "enabled" ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 text-xs">Real-time Protection:</span>
                          <span className="font-medium text-xs">
                            {processedData.raw_data.security.real_time_protection || 
                             (processedData.raw_data.security.antivirus_status === "enabled" ? "Active" : "Unknown")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 text-xs">Last Virus Scan:</span>
                          <span className="font-medium text-xs">
                            {processedData.raw_data.security.last_virus_scan?.slice(0, 10) || 
                             processedData.raw_data.security.last_scan?.slice(0, 10) || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 text-xs">UAC Status:</span>
                          <Badge variant={processedData.raw_data.security.uac_enabled ? "default" : "destructive"} className="text-xs">
                            {processedData.raw_data.security.uac_enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>

                      {/* Security Services */}
                      {processedData.raw_data.security.security_services && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2 text-sm">Security Services</h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {processedData.raw_data.security.security_services.slice(0, 3).map((service, index) => (
                              <div key={index} className="p-2 border rounded bg-muted/20">
                                <div className="text-xs">
                                  <div className="font-medium">{service.name?.slice(0, 20)}...</div>
                                  <Badge variant={service.status === "running" ? "default" : "secondary"} className="text-xs mt-1">
                                    {service.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Shield className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                      <p className="text-xs">No security information</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Installed Patches */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Installed Patches</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {processedData?.raw_data?.os_info?.patches && processedData.raw_data.os_info.patches.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-600 text-xs">Total Patches:</span>
                          <span className="font-medium text-xs">{processedData.raw_data.os_info.patches.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 text-xs">Last Patch:</span>
                          <span className="font-medium text-xs">
                            {processedData.raw_data.os_info.patches[0]?.installed_on?.DateTime?.slice(0, 10) || 
                             processedData.raw_data.os_info.patches[0]?.installed_on?.slice(0, 10) || "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="font-medium mb-2 text-sm">Patches (Page {patchesCurrentPage})</h4>
                        <div className="space-y-2">
                          {(() => {
                            const patches = processedData.raw_data.os_info.patches;
                            const startIndex = (patchesCurrentPage - 1) * itemsPerPage;
                            const endIndex = startIndex + itemsPerPage;
                            const currentPatches = patches.slice(startIndex, endIndex);

                            return currentPatches.map((patch, index) => (
                              <div key={startIndex + index} className="p-2 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                                <div className="text-xs">
                                  <div className="font-medium text-green-900 dark:text-green-100">
                                    {(patch.id || `Patch ${startIndex + index + 1}`).slice(0, 35)}
                                    {(patch.id || `Patch ${startIndex + index + 1}`).length > 35 ? '...' : ''}
                                  </div>
                                  <div className="text-green-600 dark:text-green-400 text-xs mt-1">
                                    {patch.installed_on?.DateTime?.slice(0, 10) || patch.installed_on?.slice(0, 10) || "Unknown"}
                                  </div>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>

                        {/* Patches Pagination */}
                        {(() => {
                          const patches = processedData.raw_data.os_info.patches;
                          const totalPages = Math.ceil(patches.length / itemsPerPage);

                          if (totalPages > 1) {
                            return (
                              <div className="mt-4">
                                <Pagination>
                                  <PaginationContent>
                                    <PaginationItem>
                                      <PaginationPrevious 
                                        onClick={() => setPatchesCurrentPage(Math.max(1, patchesCurrentPage - 1))}
                                        className={patchesCurrentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                      />
                                    </PaginationItem>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                      <PaginationItem key={page}>
                                        <PaginationLink
                                          onClick={() => setPatchesCurrentPage(page)}
                                          isActive={page === patchesCurrentPage}
                                          className="cursor-pointer"
                                        >
                                          {page}
                                        </PaginationLink>
                                      </PaginationItem>
                                    ))}

                                    <PaginationItem>
                                      <PaginationNext 
                                        onClick={() => setPatchesCurrentPage(Math.min(totalPages, patchesCurrentPage + 1))}
                                        className={patchesCurrentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                      />
                                    </PaginationItem>
                                  </PaginationContent>
                                </Pagination>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                      <p className="text-xs">No patch information</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Network Ports */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Network className="w-5 h-5" />
                    <span>Active Network Ports</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {processedData?.raw_data?.active_ports && processedData.raw_data.active_ports.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-600 text-xs">Total Connections:</span>
                          <span className="font-medium text-xs">{processedData.raw_data.active_ports.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 text-xs">Local Ports:</span>
                          <span className="font-medium text-xs">
                            {new Set(processedData.raw_data.active_ports.map(port => port.LocalPort)).size}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 text-xs">Remote Ports:</span>
                          <span className="font-medium text-xs">
                            {new Set(processedData.raw_data.active_ports.map(port => port.RemotePort)).size}
                          </span>
                        </div>
                      </div>

                      {/* Port Analysis */}
                      <div className="mt-4 p-2 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                        <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2 text-sm">Port Analysis</h5>
                        <div className="grid grid-cols-1 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-blue-600 dark:text-blue-400">HTTPS (443):</span>
                            <span className="font-medium">
                              {processedData.raw_data.active_ports.filter(p => p.RemotePort === 443).length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-600 dark:text-blue-400">HTTP (80):</span>
                            <span className="font-medium">
                              {processedData.raw_data.active_ports.filter(p => p.RemotePort === 80).length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-600 dark:text-blue-400">Custom:</span>
                            <span className="font-medium">
                              {processedData.raw_data.active_ports.filter(p => 
                                ![443, 80, 22, 21, 25, 53, 3389, 5228, 7680].includes(p.RemotePort)
                              ).length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Port Connections */}
                      <div className="mt-4">
                        <h4 className="font-medium mb-2 text-sm">Port Connections (Page {portsCurrentPage})</h4>
                        <div className="space-y-1">
                          {(() => {
                            const ports = processedData.raw_data.active_ports.sort((a, b) => a.LocalPort - b.LocalPort);
                            const startIndex = (portsCurrentPage - 1) * itemsPerPage;
                            const endIndex = startIndex + itemsPerPage;
                            const currentPorts = ports.slice(startIndex, endIndex);

                            return currentPorts.map((port, index) => (
                              <div key={startIndex + index} className="p-2 border rounded-lg bg-muted/20">
                                <div className="flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-medium text-blue-900 dark:text-blue-100">
                                      {port.LocalPort} → {port.RemotePort}
                                    </span>
                                    {port.RemoteAddress && (
                                      <div className="text-neutral-500 text-xs mt-1">
                                        {port.RemoteAddress.slice(0, 20)}{port.RemoteAddress.length > 20 ? '...' : ''}
                                      </div>
                                    )}
                                  </div>
                                  <Badge variant="default" className="text-xs">
                                    {port.RemotePort === 443 ? "HTTPS" :
                                     port.RemotePort === 80 ? "HTTP" :
                                     port.RemotePort === 22 ? "SSH" :
                                     port.RemotePort === 3389 ? "RDP" :
                                     "Custom"}
                                  </Badge>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>

                        {/* Ports Pagination */}
                        {(() => {
                          const ports = processedData.raw_data.active_ports;
                          const totalPages = Math.ceil(ports.length / itemsPerPage);

                          if (totalPages > 1) {
                            return (
                              <div className="mt-4">
                                <Pagination>
                                  <PaginationContent>
                                    <PaginationItem>
                                      <PaginationPrevious 
                                        onClick={() => setPortsCurrentPage(Math.max(1, portsCurrentPage - 1))}
                                        className={portsCurrentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                      />
                                    </PaginationItem>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                      <PaginationItem key={page}>
                                        <PaginationLink
                                          onClick={() => setPortsCurrentPage(page)}
                                          isActive={page === portsCurrentPage}
                                          className="cursor-pointer"
                                        >
                                          {page}
                                        </PaginationLink>
                                      </PaginationItem>
                                    ))}

                                    <PaginationItem>
                                      <PaginationNext 
                                        onClick={() => setPortsCurrentPage(Math.min(totalPages, portsCurrentPage + 1))}
                                        className={portsCurrentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                      />
                                    </PaginationItem>
                                  </PaginationContent>
                                </Pagination>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Network className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                      <p className="text-xs">No port information</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </SafeDataRenderer>
        </TabsContent>
      </Tabs>
    </AgentErrorBoundary>
  );
}