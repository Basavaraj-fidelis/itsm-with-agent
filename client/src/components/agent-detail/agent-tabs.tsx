import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Device } from "@shared/schema";

interface AgentTabsProps {
  agent: Device;
}

export function AgentTabs({ agent }: AgentTabsProps) {
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
    rawData.architecture ||
    systemInfo.architecture ||
    rawData.arch ||
    systemInfo.arch ||
    "Unknown";

  // Hardware details
  const cpuInfo = hardwareInfo.cpu || {};
  const memoryInfo = hardwareInfo.memory || {};
  const systemHardware = hardwareInfo.system || {};

  const processor =
    cpuInfo.model ||
    rawData.processor ||
    systemInfo.processor ||
    rawData.cpu_model ||
    systemInfo.cpu_model ||
    rawData.cpu ||
    "Unknown";
  const physicalCores = cpuInfo.physical_cores || "Unknown";
  const logicalCores = cpuInfo.logical_cores || "Unknown";
  const cpuFreq = cpuInfo.current_freq
    ? `${cpuInfo.current_freq} MHz`
    : "Unknown";
  const maxFreq = cpuInfo.max_freq ? `${cpuInfo.max_freq} MHz` : "Unknown";

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

  const manufacturer = systemHardware.manufacturer || "Unknown";
  const model = systemHardware.model || "Unknown";
  const serialNumber = systemHardware.serial_number || "Unknown";

  // Sort processes by memory usage and get top 10
  const topProcesses = Array.isArray(processInfo)
    ? processInfo
        .sort((a, b) => (b.memory_percent || 0) - (a.memory_percent || 0))
        .slice(0, 10)
    : [];

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
                  <span className="font-medium">{architecture}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">IP Address:</span>
                  <span className="font-medium">
                    {agent.ip_address || rawData.ip_address || "Unknown"}
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
                      if (!user || user === "Unknown") return "Unknown";
                      // Handle domain users like "DESKTOP-CMM8H3C\basav" or "DOMAIN\user"
                      if (user.includes("\\"))
                        return user.split("\\").pop() || user;
                      // Handle email format
                      if (user.includes("@")) return user.split("@")[0];
                      // Handle computer accounts like "DESKTOP-CMM8H3C$"
                      if (user.endsWith("$")) return "System Account";
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
                <div className="flex justify-between">
                  <span className="text-neutral-600">Architecture:</span>
                  <span className="font-medium">{architecture}</span>
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
                  <span className="text-neutral-600">Serial Number:</span>
                  <span className="font-medium">{serialNumber}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="w-5 h-5" />
                <span>USB Devices</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {Array.isArray(usbDevices) && usbDevices.length > 0 ? (
                  <div className="space-y-2">
                    {usbDevices.map((device, index) => (
                      <div
                        key={index}
                        className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-2"
                      >
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          {device.description ||
                            device.name ||
                            device.device_name ||
                            `USB Device ${index + 1}`}
                        </div>
                        {device.vendor_id && (
                          <div className="text-neutral-600 text-xs">
                            Vendor ID: {device.vendor_id}
                          </div>
                        )}
                        {device.product_id && (
                          <div className="text-neutral-600 text-xs">
                            Product ID: {device.product_id}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-neutral-500">
                    <Server className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                    <p>No USB devices detected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="network" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Network className="w-5 h-5" />
              <span>Network Interfaces</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // Try different network data structures
                const networkData =
                  networkInfo ||
                  rawData.network_interfaces ||
                  rawData.network ||
                  {};

                if (Object.keys(networkData).length === 0) {
                  return (
                    <div className="text-center py-8 text-neutral-500">
                      <Network className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                      <p>No network interface data available</p>
                    </div>
                  );
                }

                return Object.entries(networkData).map(
                  ([interfaceName, details]) => (
                    <div
                      key={interfaceName}
                      className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                    >
                      <div className="flex items-center space-x-2 mb-3">
                        <Wifi className="w-4 h-4 text-blue-600" />
                        <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                          {interfaceName}
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        {typeof details === "object" && details !== null ? (
                          <>
                            {/* Handle array of addresses (psutil format) */}
                            {Array.isArray((details as any).addresses) ? (
                              <div className="space-y-3">
                                {(details as any).addresses.map(
                                  (addr: any, index: number) => (
                                    <div
                                      key={index}
                                      className="border border-neutral-100 dark:border-neutral-800 rounded p-2"
                                    >
                                      <div className="flex justify-between mb-1">
                                        <span className="text-neutral-600">
                                          {addr.family === "AF_INET"
                                            ? "IPv4 Address"
                                            : addr.family === "AF_INET6"
                                              ? "IPv6 Address"
                                              : `${addr.family || "IP"} Address`}
                                          :
                                        </span>
                                        <span
                                          className={`font-medium ${
                                            addr.family === "AF_INET" &&
                                            (addr.address?.startsWith(
                                              "192.168.",
                                            ) ||
                                              addr.address?.startsWith("10.") ||
                                              addr.address?.startsWith("172."))
                                              ? "text-blue-600"
                                              : ""
                                          }`}
                                        >
                                          {addr.address || "N/A"}
                                          {addr.family === "AF_INET" &&
                                            (addr.address?.startsWith(
                                              "192.168.",
                                            ) ||
                                              addr.address?.startsWith("10.") ||
                                              addr.address?.startsWith(
                                                "172.",
                                              )) &&
                                            " (Private)"}
                                        </span>
                                      </div>
                                      {addr.netmask && (
                                        <div className="flex justify-between">
                                          <span className="text-neutral-600">
                                            Netmask:
                                          </span>
                                          <span className="font-medium">
                                            {addr.netmask}
                                          </span>
                                        </div>
                                      )}
                                      {addr.broadcast && (
                                        <div className="flex justify-between">
                                          <span className="text-neutral-600">
                                            Broadcast:
                                          </span>
                                          <span className="font-medium">
                                            {addr.broadcast}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ),
                                )}
                              </div>
                            ) : (
                              <>
                                {/* Handle single IP address formats */}
                                {(details as any).ip_address ||
                                (details as any).ip ||
                                (details as any).address ? (
                                  <div className="flex justify-between">
                                    <span className="text-neutral-600">
                                      IP Address:
                                    </span>
                                    <span
                                      className={`font-medium ${
                                        (
                                          (details as any).ip_address ||
                                          (details as any).ip ||
                                          (details as any).address
                                        )?.startsWith("192.168.") ||
                                        (
                                          (details as any).ip_address ||
                                          (details as any).ip ||
                                          (details as any).address
                                        )?.startsWith("10.") ||
                                        (
                                          (details as any).ip_address ||
                                          (details as any).ip ||
                                          (details as any).address
                                        )?.startsWith("172.")
                                          ? "text-blue-600"
                                          : ""
                                      }`}
                                    >
                                      {(details as any).ip_address ||
                                        (details as any).ip ||
                                        (details as any).address}
                                      {((
                                        (details as any).ip_address ||
                                        (details as any).ip ||
                                        (details as any).address
                                      )?.startsWith("192.168.") ||
                                        (
                                          (details as any).ip_address ||
                                          (details as any).ip ||
                                          (details as any).address
                                        )?.startsWith("10.") ||
                                        (
                                          (details as any).ip_address ||
                                          (details as any).ip ||
                                          (details as any).address
                                        )?.startsWith("172.")) &&
                                        " (Private)"}
                                    </span>
                                  </div>
                                ) : null}
                                {(details as any).netmask && (
                                  <div className="flex justify-between">
                                    <span className="text-neutral-600">
                                      Netmask:
                                    </span>
                                    <span className="font-medium">
                                      {(details as any).netmask}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="flex justify-between">
                              <span className="text-neutral-600">
                                MAC Address:
                              </span>
                              <span className="font-medium">
                                {(details as any).mac_address ||
                                  (details as any).mac ||
                                  "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-600">Status:</span>
                              <Badge
                                variant={
                                  (details as any).status === "up" ||
                                  (details as any).state === "up"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {(details as any).status ||
                                  (details as any).state ||
                                  "Unknown"}
                              </Badge>
                            </div>
                            {(details as any).bytes_sent !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-neutral-600">
                                  Bytes Sent:
                                </span>
                                <span className="font-medium">
                                  {(
                                    (details as any).bytes_sent || 0
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {(details as any).bytes_recv !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-neutral-600">
                                  Bytes Received:
                                </span>
                                <span className="font-medium">
                                  {(
                                    (details as any).bytes_recv || 0
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {(details as any).tx_bytes !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-neutral-600">
                                  TX Bytes:
                                </span>
                                <span className="font-medium">
                                  {(
                                    (details as any).tx_bytes || 0
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {(details as any).rx_bytes !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-neutral-600">
                                  RX Bytes:
                                </span>
                                <span className="font-medium">
                                  {(
                                    (details as any).rx_bytes || 0
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex justify-between col-span-2">
                            <span className="text-neutral-600">Details:</span>
                            <span className="font-medium">
                              {String(details)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="storage" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HardDrive className="w-5 h-5" />
              <span>Storage Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {storageInfo.disks && Array.isArray(storageInfo.disks) ? (
                storageInfo.disks.map((drive: any, index: number) => (
                  <div
                    key={index}
                    className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-2 mb-3">
                      <HardDrive className="w-4 h-4 text-orange-600" />
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                        {drive.device ||
                          drive.mountpoint ||
                          `Drive ${index + 1}`}
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Total Size:</span>
                        <span className="font-medium">
                          {drive.total ? bytesToGB(drive.total) : "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Used:</span>
                        <span className="font-medium">
                          {drive.used ? bytesToGB(drive.used) : "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Free:</span>
                        <span className="font-medium">
                          {drive.free ? bytesToGB(drive.free) : "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Usage:</span>
                        <span
                          className={`font-medium ${
                            Math.round(
                              drive.percent || drive.usage?.percentage || 0,
                            ) >= 85
                              ? "text-red-600"
                              : Math.round(
                                    drive.percent ||
                                      drive.usage?.percentage ||
                                      0,
                                  ) >= 75
                                ? "text-yellow-600"
                                : "text-green-600"
                          }`}
                        >
                          {drive.percent || drive.usage?.percentage
                            ? Math.round(
                                drive.percent || drive.usage?.percentage,
                              )
                            : "Unknown"}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Filesystem:</span>
                        <span className="font-medium">
                          {drive.filesystem || "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Mount Point:</span>
                        <span className="font-medium">
                          {drive.mountpoint || "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : Array.isArray(storageInfo) && storageInfo.length > 0 ? (
                storageInfo.map((drive, index) => (
                  <div
                    key={index}
                    className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-2 mb-3">
                      <HardDrive className="w-4 h-4 text-orange-600" />
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                        {drive.drive ||
                          drive.device ||
                          drive.mountpoint ||
                          `Drive ${index + 1}`}
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Total Size:</span>
                        <span className="font-medium">
                          {drive.total_size
                            ? bytesToGB(drive.total_size)
                            : drive.size
                              ? bytesToGB(drive.size)
                              : drive.total
                                ? bytesToGB(drive.total)
                                : "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Used:</span>
                        <span className="font-medium">
                          {drive.used ? bytesToGB(drive.used) : "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Free:</span>
                        <span className="font-medium">
                          {drive.free ? bytesToGB(drive.free) : "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Usage:</span>
                        <span
                          className={`font-medium ${
                            Math.round(
                              drive.usage_percent ||
                                drive.percent ||
                                drive.usage ||
                                0,
                            ) >= 85
                              ? "text-red-600"
                              : Math.round(
                                    drive.usage_percent ||
                                      drive.percent ||
                                      drive.usage ||
                                      0,
                                  ) >= 75
                                ? "text-yellow-600"
                                : "text-green-600"
                          }`}
                        >
                          {drive.usage_percent || drive.percent || drive.usage
                            ? Math.round(
                                drive.usage_percent ||
                                  drive.percent ||
                                  drive.usage,
                              )
                            : "Unknown"}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Type:</span>
                        <span className="font-medium">
                          {drive.filesystem ||
                            drive.type ||
                            drive.fstype ||
                            "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : Object.entries(storageInfo).length > 0 ? (
                Object.entries(storageInfo).map(([driveName, details]) => (
                  <div
                    key={driveName}
                    className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-2 mb-3">
                      <HardDrive className="w-4 h-4 text-orange-600" />
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                        {driveName}
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {typeof details === "object" && details !== null ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">
                              Total Size:
                            </span>
                            <span className="font-medium">
                              {(details as any).total
                                ? bytesToGB((details as any).total)
                                : (details as any).size
                                  ? bytesToGB((details as any).size)
                                  : "Unknown"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Used:</span>
                            <span className="font-medium">
                              {(details as any).used
                                ? bytesToGB((details as any).used)
                                : "Unknown"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Free:</span>
                            <span className="font-medium">
                              {(details as any).free
                                ? bytesToGB((details as any).free)
                                : "Unknown"}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Details:</span>
                          <span className="font-medium">{String(details)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <HardDrive className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                  <p>No storage data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="processes" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="w-5 h-5" />
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
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
                        <div>
                          <span className="text-neutral-600">Process: </span>
                          <span className="font-medium">
                            {process.name || process.process_name || "Unknown"}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-600">PID: </span>
                          <span className="font-medium">
                            {process.pid || process.process_id || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-600">CPU: </span>
                          <span className="font-medium">
                            {(
                              process.cpu_percent ||
                              process.cpu_usage ||
                              0
                            ).toFixed(1)}
                            %
                          </span>
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
                  <Server className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                  <p>No process data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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
                            "Unknown"}
                        </div>
                        <div className="text-neutral-600">
                          Version:{" "}
                          {software.version ||
                            software.display_version ||
                            "Unknown"}
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
