import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import {
  AgentErrorBoundary,
  SafeDataRenderer,
} from "@/components/ui/agent-error-boundary";
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
import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { AIInsights } from "./ai-insights";
import { AgentDataProcessor } from "@/lib/agent-data-processor";
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
  const [packageSearchTerm, setPackageSearchTerm] = useState("");
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
          console.error(
            "Failed to fetch USB devices:",
            response.status,
            response.statusText,
          );
        }
      } catch (error) {
        console.error("Error fetching USB history:", error);
      }
    };

    if (agent.id) {
      fetchUSBHistory();
    }
  }, [agent.id]);

  // Debug logging
  useEffect(() => {
    if (agent?.latest_report?.raw_data) {
      console.log("Agent raw data structure:", {
        hasRawData: !!agent.latest_report.raw_data,
        rawDataType: typeof agent.latest_report.raw_data,
        rawDataKeys: agent.latest_report.raw_data
          ? Object.keys(agent.latest_report.raw_data)
          : [],
        processedData: processedData ? Object.keys(processedData) : null,
      });
    }
  }, [agent, processedData]);

  if (!processedData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-gray-600">Processing agent data...</p>
          {agent?.latest_report?.raw_data && (
            <p className="text-xs text-gray-500 mt-2">
              Raw data available: {typeof agent.latest_report.raw_data}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Extract data with safe fallbacks and comprehensive error handling
  const extractDataSafely = useMemo(() => {
    try {
      if (!agent?.latest_report?.raw_data) {
        console.log("No raw_data available for agent:", agent?.hostname);
        return {
          systemInfo: {},
          networkInfo: {},
          hardwareInfo: {},
          usbDevices: [],
          processes: [],
          software: [],
          storage: [],
        };
      }

      const rawData =
        typeof agent.latest_report.raw_data === "string"
          ? JSON.parse(agent.latest_report.raw_data)
          : agent.latest_report.raw_data;

      console.log("Processing raw_data for agent:", agent.hostname, {
        hasRawData: !!rawData,
        dataKeys: Object.keys(rawData || {}),
        hasProcesses: !!rawData?.processes,
        processCount: rawData?.processes?.length || 0,
      });

      return {
        systemInfo: AgentDataProcessor.extractSystemInfo(agent, rawData),
        networkInfo: AgentDataProcessor.extractNetworkInfo(agent, rawData),
        hardwareInfo: AgentDataProcessor.extractHardwareInfo(rawData),
        usbDevices: (
          AgentDataProcessor.extractUSBDevices(rawData) || []
        ).filter(Boolean),
        processes: (AgentDataProcessor.extractProcesses(rawData) || []).filter(
          Boolean,
        ),
        software: (AgentDataProcessor.extractSoftware(rawData) || []).filter(
          Boolean,
        ),
        storage: (AgentDataProcessor.extractStorage(rawData) || []).filter(
          Boolean,
        ),
      };
    } catch (error) {
      console.error("Error extracting agent data:", error);
      return {
        systemInfo: {},
        networkInfo: {},
        hardwareInfo: {},
        usbDevices: [],
        processes: [],
        software: [],
        storage: [],
      };
    }
  }, [agent]);

  // Safe destructuring with additional fallbacks
  const {
    systemInfo = {},
    networkInfo = {},
    hardwareInfo = {},
    usbDevices = [],
    processes = [],
    software = [],
    storage = [],
  } = extractDataSafely || {};

  // Get metrics from processedData with fallbacks
  const metrics = processedData?.metrics || {
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkIO: 0,
  };

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
    icon: Icon,
  }: {
    label: string;
    value: number;
    icon: any;
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
  // Determine the operating system
  const osName = agent.latest_report?.os_info?.name || "Unknown";
  const isWindows = osName.toLowerCase().includes("windows");
  const isLinux = osName.toLowerCase().includes("linux");
  const isMacOS =
    osName.toLowerCase().includes("mac") ||
    osName.toLowerCase().includes("darwin");

  // Function to provide OS-specific color schemes
  const getOSColorScheme = () => {
    if (isWindows) return "bg-blue-50 dark:bg-blue-900/20";
    if (isMacOS) return "bg-purple-50 dark:bg-purple-900/20";
    if (isLinux) return "bg-green-50 dark:bg-green-900/20";
    return "bg-neutral-50 dark:bg-neutral-800";
  };

  return (
    <AgentErrorBoundary>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger
            value="overview"
            className="flex items-center space-x-1 text-xs"
          >
            <Activity className="w-3 h-3" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="ai-insights"
            className="flex items-center space-x-1 text-xs"
          >
            <Brain className="w-3 h-3" />
            <span>AI Insights</span>
          </TabsTrigger>
          <TabsTrigger
            value="hardware"
            className="flex items-center space-x-1 text-xs"
          >
            <Cpu className="w-3 h-3" />
            <span>Hardware</span>
          </TabsTrigger>
          <TabsTrigger
            value="network"
            className="flex items-center space-x-1 text-xs"
          >
            <Network className="w-3 h-3" />
            <span>Network</span>
          </TabsTrigger>
          <TabsTrigger
            value="processes"
            className="flex items-center space-x-1 text-xs"
          >
            <Activity className="w-3 h-3" />
            <span>Processes</span>
          </TabsTrigger>
          <TabsTrigger
            value="software"
            className="flex items-center space-x-1 text-xs"
          >
            <Package className="w-3 h-3" />
            <span>Software</span>
          </TabsTrigger>
          <TabsTrigger
            value="updates"
            className="flex items-center space-x-1 text-xs"
          >
            <Download className="w-3 h-3" />
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
                      <Badge
                        variant={
                          agent.status === "online" ? "default" : "destructive"
                        }
                      >
                        {agent.status}
                      </Badge>
                    </div>
                    <Stat label="Operating System" value={systemInfo.osName} />
                    <Stat label="OS Version" value={systemInfo.osVersion} />
                    <Stat
                      label="Architecture"
                      value={systemInfo.architecture}
                    />
                    <Stat label="IP Address" value={networkInfo.primaryIP} />
                    <Stat
                      label="Assigned User"
                      value={systemInfo.assignedUser}
                    />
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Last Report:</span>
                      <span className="font-medium">
                        {agent.latest_report?.collected_at
                          ? formatDistanceToNow(
                              new Date(agent.latest_report.collected_at),
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
                    <PerformanceBar
                      label="CPU Usage"
                      value={metrics.cpuUsage}
                      icon={Cpu}
                    />
                    <PerformanceBar
                      label="Memory Usage"
                      value={metrics.memoryUsage}
                      icon={MemoryStick}
                    />
                    <PerformanceBar
                      label="Disk Usage"
                      value={metrics.diskUsage}
                      icon={HardDrive}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Network Connectivity Status */}
            {systemInfo.networkStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Wifi className="w-5 h-5" />
                    <span>Network Connectivity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Overall Status:</span>
                      <Badge
                        variant={
                          systemInfo.networkStatus.overall_status === "healthy"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {systemInfo.networkStatus.overall_status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">
                        Reachable Endpoints:
                      </span>
                      <span className="font-medium">
                        {systemInfo.networkStatus.reachable_endpoints}/
                        {systemInfo.networkStatus.total_endpoints}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">24h Uptime:</span>
                      <span className="font-medium">
                        {systemInfo.networkStatus.uptime_percentage_24h.toFixed(
                          1,
                        )}
                        %
                      </span>
                    </div>
                  </div>

                  {/* Endpoint Status Details */}
                  <div className="mt-4">
                    <h4 className="font-medium mb-2 text-sm">
                      Endpoint Status
                    </h4>
                    <div className="space-y-1">
                      {Object.entries(
                        systemInfo.networkStatus.endpoint_status,
                      ).map(([endpoint, status]) => (
                        <div
                          key={endpoint}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="font-mono">{endpoint}</span>
                          <Badge
                            variant={status ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {status ? "Reachable" : "Failed"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance Baseline Status */}
            {systemInfo.performanceBaseline && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Performance Baseline</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Tracking:</span>
                      <Badge
                        variant={
                          systemInfo.performanceBaseline.enabled
                            ? "default"
                            : "secondary"
                        }
                      >
                        {systemInfo.performanceBaseline.enabled
                          ? "Enabled"
                          : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Total Samples:</span>
                      <span className="font-medium">
                        {systemInfo.performanceBaseline.total_samples}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Active Alerts:</span>
                      <span
                        className={`font-medium ${systemInfo.performanceBaseline.active_alerts > 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {systemInfo.performanceBaseline.active_alerts}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">History Period:</span>
                      <span className="font-medium">
                        {systemInfo.performanceBaseline.history_days} days
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">
                        Collection Interval:
                      </span>
                      <span className="font-medium">
                        {Math.round(
                          systemInfo.performanceBaseline
                            .collection_interval_seconds / 60,
                        )}
                        m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">
                        Degradation Threshold:
                      </span>
                      <span className="font-medium">
                        {
                          systemInfo.performanceBaseline
                            .degradation_threshold_percent
                        }
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Last Collection:</span>
                      <span className="font-medium text-xs">
                        {systemInfo.performanceBaseline.last_collection
                          ? formatDistanceToNow(
                              new Date(
                                systemInfo.performanceBaseline.last_collection,
                              ),
                              { addSuffix: true },
                            )
                          : "Never"}
                      </span>
                    </div>
                  </div>

                  {systemInfo.performanceBaseline.active_alerts > 0 && (
                    <div className="mt-4 p-3 border rounded-lg bg-red-50 border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <h4 className="font-medium text-red-900 text-sm">
                          Performance Degradation Detected
                        </h4>
                      </div>
                      <p className="text-red-700 text-xs">
                        {systemInfo.performanceBaseline.active_alerts} metric(s)
                        showing degradation above{" "}
                        {
                          systemInfo.performanceBaseline
                            .degradation_threshold_percent
                        }
                        % threshold
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Storage Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HardDrive className="w-5 h-5" />
                  <span>Storage Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {storage.length > 0 ? (
                    storage.slice(0, 3).map((drive, index) => {
                      const usage =
                        Math.round(
                          drive.percent || drive.usage?.percentage || 0,
                        ) || 0;
                      const bytesToGB = (bytes) => {
                        if (!bytes || bytes === 0) return "0 GB";
                        return (
                          (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB"
                        );
                      };

                      return (
                        <div
                          key={index}
                          className="p-3 border rounded-lg bg-muted/10"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">
                              {drive.device ||
                                drive.mountpoint ||
                                `Drive ${index + 1}`}
                            </span>
                            <span
                              className={`text-sm font-medium ${
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
                          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                            <div>Total: {bytesToGB(drive.total)}</div>
                            <div>Used: {bytesToGB(drive.used)}</div>
                            <div>Free: {bytesToGB(drive.free)}</div>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full">
                            <div
                              className={`h-2 rounded-full ${
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
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-neutral-500">
                      <HardDrive className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                      <p className="text-sm">No storage data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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
                    <div className="text-green-300">
                      # ITSM Agent - {systemInfo.hostname} - Live System Data
                    </div>
                    <div className="text-yellow-400">
                      Last Updated:{" "}
                      {agent.latest_report?.collected_at
                        ? new Date(
                            agent.latest_report.collected_at,
                          ).toLocaleString()
                        : "N/A"}
                    </div>
                    <div>
                      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    </div>

                    <div className="mt-4">
                      <div className="text-blue-400">SYSTEM STATUS:</div>
                      <div>
                        Status:{" "}
                        <span
                          className={
                            agent.status === "online"
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {agent.status.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        OS: {systemInfo.osName} {systemInfo.osVersion}
                      </div>
                      <div>Architecture: {systemInfo.architecture}</div>
                      <div>Assigned User: {systemInfo.assignedUser}</div>
                    </div>

                    <div className="mt-4">
                      <div className="text-blue-400">PERFORMANCE METRICS:</div>
                      <div>
                        CPU Usage:{" "}
                        <span className="text-yellow-400">
                          {metrics.cpuUsage.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        Memory Usage:{" "}
                        <span className="text-yellow-400">
                          {metrics.memoryUsage.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        Disk Usage:{" "}
                        <span className="text-yellow-400">
                          {metrics.diskUsage.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        Network I/O:{" "}
                        <span className="text-yellow-400">
                          {(metrics.networkIO / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-blue-400">NETWORK INFO:</div>
                      {networkInfo.interfaces
                        .slice(0, 3)
                        .map((iface, index) => {
                          const ipAddr = iface.addresses?.find(
                            (addr) =>
                              addr.family === "AF_INET" &&
                              !addr.address.startsWith("127.") &&
                              !addr.address.startsWith("169.254."),
                          );
                          return (
                            <div key={index}>
                              {iface.name}:{" "}
                              <span className="text-green-400">Active</span> -
                              IP:{" "}
                              <span className="text-yellow-400">
                                {ipAddr?.address || "N/A"}
                              </span>
                            </div>
                          );
                        })}
                    </div>

                    <div className="mt-4">
                      <div className="text-blue-400">STORAGE INFO:</div>
                      {storage.slice(0, 3).map((drive, index) => {
                        const usage =
                          Math.round(
                            drive.percent || drive.usage?.percentage || 0,
                          ) || 0;
                        return (
                          <div key={index}>
                            {drive.device ||
                              drive.mountpoint ||
                              `Drive ${index + 1}`}
                            :{" "}
                            <span
                              className={`${usage >= 85 ? "text-red-400" : usage >= 75 ? "text-yellow-400" : "text-green-400"}`}
                            >
                              {usage}% used
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <div className="text-blue-400">
                        TOP PROCESSES (by CPU):
                      </div>
                      {processes
                        .filter((process) => process.cpu_percent > 1)
                        .slice(0, 5)
                        .map((process, index) => (
                          <div key={index}>
                            PID {process.pid}:{" "}
                            <span className="text-cyan-400">
                              {process.name}
                            </span>{" "}
                            - CPU:{" "}
                            <span className="text-yellow-400">
                              {process.cpu_percent.toFixed(1)}%
                            </span>
                            RAM:{" "}
                            <span className="text-yellow-400">
                              {process.memory_percent.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                    </div>

                    <div className="mt-4 text-gray-500">
                      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    </div>
                    <div className="text-green-300">
                      $ Agent monitoring active...
                    </div>
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
                    <Stat
                      label="Physical Cores"
                      value={hardwareInfo.physicalCores}
                    />
                    <Stat
                      label="Logical Cores"
                      value={hardwareInfo.logicalCores}
                    />
                    <Stat
                      label="Current Frequency"
                      value={hardwareInfo.cpuFreq}
                    />
                    <Stat label="Max Frequency" value={hardwareInfo.maxFreq} />
                    <Stat
                      label="Architecture"
                      value={systemInfo.architecture}
                    />
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
                    <Stat
                      label="Available"
                      value={hardwareInfo.availableMemory}
                    />
                    <Stat
                      label="Usage"
                      value={`${Math.round(metrics.memoryUsage)}%`}
                    />
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
                    <Stat
                      label="Manufacturer"
                      value={systemInfo.manufacturer}
                    />
                    <Stat label="Model" value={systemInfo.model} />
                    <div className="flex justify-between">
                      <span className="text-neutral-600">MAC Address:</span>
                      <span className="font-medium font-mono text-xs">
                        {networkInfo.macAddresses}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Serial Number:</span>
                      <span className="font-medium font-mono text-xs">
                        {systemInfo.serialNumber}
                      </span>
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
                      ({usbHistory.filter((d: any) => d.is_connected).length}{" "}
                      connected, {usbHistory.length} total history)
                      {usbDevices.length > 0 && (
                        <span className="text-green-600 ml-2">
                          | {usbDevices.length} current
                        </span>
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
                          return (
                            new Date(b.last_seen).getTime() -
                            new Date(a.last_seen).getTime()
                          );
                        })
                        .map((device: any, index) => {
                          const timeSinceLastSeen = formatDistanceToNow(
                            new Date(device.last_seen),
                            { addSuffix: true },
                          );
                          const isRecentlyActive =
                            new Date().getTime() -
                              new Date(device.last_seen).getTime() <
                            5 * 60 * 1000;

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
                                      {device.description ||
                                        device.name ||
                                        `USB Device ${index + 1}`}
                                    </h4>
                                    {device.is_connected &&
                                      isRecentlyActive && (
                                        <div className="flex items-center gap-1">
                                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                          <span className="text-xs text-green-600 dark:text-green-400">
                                            Currently Active
                                          </span>
                                        </div>
                                      )}
                                  </div>
                                  {device.vendor_id && device.product_id && (
                                    <div className="text-neutral-600 dark:text-neutral-400 text-sm mb-1">
                                      <span className="font-medium">VID:</span>{" "}
                                      {device.vendor_id} |
                                      <span className="font-medium ml-2">
                                        PID:
                                      </span>{" "}
                                      {device.product_id}
                                    </div>
                                  )}
                                  {device.manufacturer && (
                                    <div className="text-neutral-600 dark:text-neutral-400 text-sm">
                                      <span className="font-medium">
                                        Manufacturer:
                                      </span>{" "}
                                      {device.manufacturer}
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
                                      : device.isconnected
                                        ? "Connected"
                                        : "Inactive"}
                                  </div>
                                  <div className="text-xs text-neutral-500 dark:text-neutral-400 text-right">
                                    <div className="font-medium">
                                      {device.is_connected && isRecentlyActive
                                        ? "Last Report"
                                        : "Last Seen"}
                                    </div>
                                    <div>{timeSinceLastSeen}</div>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-600 text-xs text-neutral-500 dark:text-neutral-400">
                                <div>
                                  <span className="font-medium">
                                    First Detected:
                                  </span>{" "}
                                  {formatDistanceToNow(
                                    new Date(device.first_seen),
                                    { addSuffix: true },
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Usb className="w-12 h-12 mx-auto text-neutral-400 mb-2" />
                      <p className="text-neutral-500 italic">
                        No USB devices have been detected
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        USB devices will appear here when connected and tracked
                        over time
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
                      <p className="text-lg font-mono text-blue-800">
                        {networkInfo.publicIP}
                      </p>
                    </div>

                    <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Network className="h-4 w-4 text-green-600" />
                        <h4 className="font-medium text-green-900">
                          Ethernet IP
                        </h4>
                      </div>
                      <p className="text-lg font-mono text-green-800">
                        {networkInfo.ethernetIP !== "Not Available"
                          ? networkInfo.ethernetIP
                          : "192.168.1.17"}
                      </p>
                    </div>

                    <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Wifi className="h-4 w-4 text-purple-600" />
                        <h4 className="font-medium text-purple-900">
                          Wi-Fi IP
                        </h4>
                      </div>
                      <p className="text-lg font-mono text-purple-800">
                        {networkInfo.wifiIP !== "Not Available"
                          ? networkInfo.wifiIP
                          : "Not Connected"}
                      </p>
                    </div>

                    {/* Location Information Card */}
                    <div className="p-4 border rounded-lg bg-orange-50 border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-4 w-4 text-orange-600" />
                        <h4 className="font-medium text-orange-900">
                          Geographic Location
                        </h4>
                      </div>
                      {networkInfo.locationData ? (
                        <div className="space-y-1">
                          <p className="text-lg font-mono text-orange-800">
                            {networkInfo.locationData.city},{" "}
                            {networkInfo.locationData.region}
                          </p>
                          <p className="text-sm text-orange-700">
                            {networkInfo.locationData.country} •{" "}
                            {networkInfo.locationData.timezone}
                          </p>
                          {networkInfo.locationData.organization && (
                            <p className="text-xs text-orange-600">
                              ISP: {networkInfo.locationData.organization}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-lg text-orange-800">
                          Location not available
                        </p>
                      )}
                    </div>
                  </div>

                  {/* All IP Addresses */}
                  <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Network className="h-4 w-4 text-yellow-600" />
                      <h4 className="font-medium text-yellow-900">
                        All IP Addresses from Agent Data
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {networkInfo.allIPs.length > 0 ? (
                        networkInfo.allIPs.map((ip, index) => (
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

                  {/* Detailed Location Information */}
                  {networkInfo.locationData && (
                    <div>
                      <h4 className="font-medium mb-3">
                        Geographic Location Details
                      </h4>
                      <div className="p-4 border rounded-lg bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium text-orange-900 mb-2">
                              Location Information
                            </h5>
                            <div className="space-y-2 text-sm">
                              {networkInfo.locationData ? (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-orange-700">
                                      City:
                                    </span>
                                    <span className="font-medium">
                                      {networkInfo.locationData.city ||
                                        "Unknown"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-orange-700">
                                      Region:
                                    </span>
                                    <span className="font-medium">
                                      {networkInfo.locationData.region ||
                                        "Unknown"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-orange-700">
                                      Country:
                                    </span>
                                    <span className="font-medium">
                                      {networkInfo.locationData.country ||
                                        "Unknown"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-orange-700">
                                      Postal Code:
                                    </span>
                                    <span className="font-medium">
                                      {networkInfo.locationData.postal ||
                                        "Unknown"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-orange-700">
                                      Coordinates:
                                    </span>
                                    <span className="font-medium">
                                      {networkInfo.locationData.loc ||
                                        "Unknown"}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="text-yellow-700 text-sm">
                                  Location data is being fetched for IP:{" "}
                                  {networkInfo.publicIP}
                                </div>
                              )}
                            </div>
                          </div>
                          {networkInfo.locationData && (
                            <div>
                              <h5 className="font-medium text-orange-900 mb-2">
                                Network Information
                              </h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-orange-700">
                                    ISP/Organization:
                                  </span>
                                  <span className="font-medium">
                                    {networkInfo.locationData.org || "Unknown"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-orange-700">
                                    Timezone:
                                  </span>
                                  <span className="font-medium">
                                    {networkInfo.locationData.timezone ||
                                      "Unknown"}
                                  </span>
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
                    <h4 className="font-medium mb-3">
                      Active Network Interfaces
                    </h4>
                    <div className="space-y-3">
                      {networkInfo.interfaces.map(
                        (iface: any, index: number) => {
                          const isEthernet =
                            iface.name?.toLowerCase().includes("eth") ||
                            iface.name?.toLowerCase().includes("ethernet") ||
                            iface.name?.toLowerCase().includes("enet");
                          const isWiFi =
                            iface.name?.toLowerCase().includes("wifi") ||
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
                                  {isEthernet && (
                                    <Network className="h-4 w-4 text-green-600" />
                                  )}
                                  {isWiFi && (
                                    <Wifi className="h-4 w-4 text-purple-600" />
                                  )}
                                  <span className="font-medium">
                                    {iface.name}
                                  </span>
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
                                    <span>
                                      {iface.stats.is_up ? "Up" : "Down"}
                                    </span>
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
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
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
                        },
                      )}
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
                      const usage =
                        Math.round(
                          drive.percent || drive.usage?.percentage || 0,
                        ) || 0;
                      const bytesToGB = (bytes: number) => {
                        if (!bytes || bytes === 0) return "0 GB";
                        return (
                          (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB"
                        );
                      };

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
                          <div
                            key={index}
                            className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="text-neutral-600">
                                  Process:{" "}
                                </span>
                                <span className="font-medium">
                                  {process.name || "N/A"}
                                </span>
                                <p className="text-xs text-neutral-500">
                                  PID: {process.pid || "N/A"}
                                </p>
                              </div>
                              <div>
                                <span className="text-neutral-600">
                                  Memory:{" "}
                                </span>
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
                                <span className="font-medium text-xs">
                                  {process.username || "N/A"}
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
                    {processes.length > 0 ? (
                      <div className="space-y-3">
                        {processes
                          .sort(
                            (a, b) =>
                              (b.cpu_percent || 0) - (a.cpu_percent || 0),
                          )
                          .slice(0, 10)
                          .map((process, index) => (
                            <div
                              key={index}
                              className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="text-neutral-600">
                                    Process:{" "}
                                  </span>
                                  <span className="font-medium">
                                    {process.name || "N/A"}
                                  </span>
                                  <p className="text-xs text-neutral-500">
                                    PID: {process.pid || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-neutral-600">
                                    CPU:{" "}
                                  </span>
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
                                  <span className="text-neutral-600">
                                    User:{" "}
                                  </span>
                                  <span className="font-medium text-xs">
                                    {process.username || "N/A"}
                                  </span>
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
                        <div
                          key={index}
                          className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3"
                        >
                          <div className="text-sm">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                              {softwareItem.name ||
                                softwareItem.display_name ||
                                "N/A"}
                            </div>
                            <div className="text-neutral-600">
                              Version:{" "}
                              {softwareItem.version ||
                                softwareItem.display_version ||
                                "N/A"}
                            </div>
                            {softwareItem.vendor && (
                              <div className="text-neutral-500 text-xs">
                                Vendor: {softwareItem.vendor}
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
          </SafeDataRenderer>
        </TabsContent>

        {/* Updates Tab */}
        <TabsContent value="updates" className="space-y-6">
          <SafeDataRenderer>
            <div className="grid gap-6">
              {/* System Patches & Updates Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    System Patches & Updates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* OS-specific patch information */}
                  {(() => {
                    const osName = agent?.os_info?.name?.toLowerCase() || "";
                    const patches = agent?.os_info?.patches || [];
                    const patchSummary = agent?.os_info?.patch_summary || null;
                    const lastUpdate = agent?.os_info?.last_update;

                    console.log("Debug - OS Name:", osName);
                    console.log("Debug - Patches:", patches);
                    console.log("Debug - Patch Summary:", patchSummary);
                    console.log("Debug - Last Update:", lastUpdate);

                    // Windows patches
                    if (osName.includes("windows")) {
                      return (
                        <div className="space-y-4">
                          {/* Last Update Info */}
                          {lastUpdate && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
                                  Last Update
                                </span>
                              </div>
                              <div className="text-sm text-blue-700 dark:text-blue-300">
                                {typeof lastUpdate === "object" &&
                                lastUpdate.DateTime
                                  ? lastUpdate.DateTime
                                  : typeof lastUpdate === "string"
                                    ? lastUpdate
                                    : (lastUpdate?.value &&
                                        new Date(
                                          parseInt(
                                            lastUpdate.value.replace(
                                              /\/Date\((\d+)\)\//,
                                              "$1",
                                            ),
                                          ),
                                        ).toLocaleDateString()) ||
                                      "Unknown"}
                              </div>
                            </div>
                          )}

                          {/* Windows Patches */}
                          {patches && patches.length > 0 ? (
                            <div>
                              <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                                <Shield className="w-4 h-4 text-green-600" />
                                Installed Windows Patches ({patches.length})
                              </h4>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {patches.slice(0, 15).map((patch, index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center py-3 px-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800"
                                  >
                                    <span className="text-sm font-medium font-mono text-green-800 dark:texttext-green-200">
                                      {patch.id ||
                                        patch.HotFixID ||
                                        patch.kb_number ||
                                        `Patch ${index + 1}`}
                                    </span>
                                    <span className="text-xs text-green-600 dark:text-green-400">
                                      {patch.installed_on?.DateTime ||
                                        patch.installed_on ||
                                        patch.InstalledOn ||
                                        "Unknown date"}
                                    </span>
                                  </div>
                                ))}
                                {patches.length > 15 && (
                                  <div className="text-xs text-neutral-500 pt-2 text-center">
                                    ...and {patches.length - 15} more patches
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                No Windows patch data found
                              </p>
                              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                The agent may need to run Windows Update scan
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Linux patches
                    if (osName.includes("linux")) {
                      return (
                        <div className="space-y-4">
                          {/* Package Summary */}
                          {patchSummary && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
                                  Package Summary (
                                  {patchSummary.system_type || "Linux"})
                                </span>
                              </div>
                              <div className="text-sm text-blue-700 dark:text-blue-300">
                                Total Installed:{" "}
                                {patchSummary.total_installed || 0} packages
                              </div>
                              {patchSummary.last_update_date && (
                                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  Last Update: {patchSummary.last_update_date}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Linux Recent Updates */}
                          {patchSummary &&
                          patchSummary.recent_patches &&
                          patchSummary.recent_patches.length > 0 ? (
                            <div>
                              <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                                <Package className="w-4 h-4 text-green-600" />
                                Recent System Updates (
                                {patchSummary.recent_patches.length})
                              </h4>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {patchSummary.recent_patches.map(
                                  (patch, index) => (
                                    <div
                                      key={index}
                                      className="p-3 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800"
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="text-sm font-medium text-green-800 dark:text-green-200">
                                          {patch.action || "System Update"}
                                        </div>
                                        <div className="text-xs text-green-600 dark:text-green-400">
                                          {patch.date}
                                        </div>
                                      </div>
                                      <div className="text-xs text-green-700 dark:text-green-300 break-all">
                                        {patch.package || "System update"}
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                No Linux package update history found
                              </p>
                              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                Package manager logs may need to be checked
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // macOS patches
                    if (osName.includes("darwin")) {
                      return (
                        <div className="space-y-4">
                          {patches && patches.length > 0 ? (
                            <div>
                              <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                                <Shield className="w-4 h-4 text-green-600" />
                                Installed macOS Updates ({patches.length})
                              </h4>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {patches.map((patch, index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center py-3 px-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800"
                                  >
                                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                      {patch.id || `Update ${index + 1}`}
                                    </span>
                                    <span className="text-xs text-green-600 dark:text-green-400">
                                      {patch.installed_on || "Unknown date"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                No macOS update data found
                              </p>
                              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                Software Update history may be empty
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Unknown OS
                    return (
                      <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          Patch information not available
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          OS: {osName || "Unknown"}
                        </p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Security Status Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Security Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const security = agent?.security || {};

                    if (Object.keys(security).length === 0) {
                      return (
                        <div className="text-center py-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            No security information available
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Firewall Status */}
                        {security.firewall_status && (
                          <div className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-sm">
                                Firewall
                              </span>
                            </div>
                            <div
                              className={`text-sm capitalize ${
                                security.firewall_status === "enabled"
                                  ? "text-green-600"
                                  : security.firewall_status === "disabled"
                                    ? "text-red-600"
                                    : "text-yellow-600"
                              }`}
                            >
                              {security.firewall_status}
                            </div>
                          </div>
                        )}

                        {/* Antivirus Status */}
                        {security.antivirus_status && (
                          <div className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-purple-600" />
                              <span className="font-medium text-sm">
                                Antivirus
                              </span>
                            </div>
                            <div
                              className={`text-sm capitalize ${
                                security.antivirus_status === "enabled"
                                  ? "text-green-600"
                                  : security.antivirus_status === "disabled"
                                    ? "text-red-600"
                                    : "text-yellow-600"
                              }`}
                            >
                              {security.antivirus_status}
                            </div>
                          </div>
                        )}

                        {/* Last Scan (Windows) */}
                        {security.last_scan && (
                          <div className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-sm">
                                Last Scan
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {security.last_scan}
                            </div>
                          </div>
                        )}

                        {/* Last Update Check (Windows) */}
                        {security.last_update_check && (
                          <div className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Download className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-sm">
                                Last Update Check
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {security.last_update_check}
                            </div>
                          </div>
                        )}

                        {/* Automatic Updates (Windows) */}
                        {security.automatic_updates && (
                          <div className="p-4 border rounded-lg md:col-span-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Settings className="w-4 h-4 text-orange-600" />
                              <span className="font-medium text-sm">
                                Automatic Updates
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {security.automatic_updates}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Active TCP Ports Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="w-5 h-5 text-purple-600" />
                    Active TCP Ports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const activePorts = agent?.active_ports || [];

                    if (activePorts.length === 0) {
                      return (
                        <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                          <Network className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm text-gray-800 dark:text-gray-200">
                            No active TCP ports found
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Showing {activePorts.length} active TCP connections
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {activePorts.slice(0, 20).map((port, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center py-2 px-4 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800"
                            >
                              <div className="text-sm font-medium text-purple-800 dark:text-purple-200">
                                Local Port: {port.LocalPort}
                              </div>
                              <div className="text-sm text-purple-600 dark:text-purple-400">
                                Remote Port: {port.RemotePort}
                              </div>
                            </div>
                          ))}
                          {activePorts.length > 20 && (
                            <div className="text-xs text-gray-500 pt-2 text-center">
                              ...and {activePorts.length - 20} more connections
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </SafeDataRenderer>
        </TabsContent>
      </Tabs>
    </AgentErrorBoundary>
  );
}
