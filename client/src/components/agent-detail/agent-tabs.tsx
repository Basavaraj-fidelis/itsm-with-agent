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
    if (isWindows) return "bg-blue-5 dark:bg-blue-900/20";
    if (isMacOS) return "bg-purple-5 dark:bg-purple-900/20";
    if (isLinux) return "bg-green-50 dark:bg-green-900/20";
    return "bg-neutral-50 dark:bg-neutral-800";
  };

   // Windows Updates data
   const windowsUpdates = processedData?.windows_updates || null;

  return (
    <AgentErrorBoundary>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-8 text-xs gap-1">
          <TabsTrigger
            value="overview"
            className="flex items-center space-x-1 text-xs px-2 py-1"
          >
            <Activity className="w-3 h-3" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="ai-insights"
            className="flex items-center space-x-1 text-xs px-2 py-1"
          >
            <Brain className="w-3 h-3" />
            <span className="hidden sm:inline">AI</span>
          </TabsTrigger>
          <TabsTrigger
            value="hardware"
            className="flex items-center space-x-1 text-xs px-2 py-1"
          >
            <Cpu className="w-3 h-3" />
            <span className="hidden sm:inline">Hardware</span>
          </TabsTrigger>
          <TabsTrigger
            value="network"
            className="flex items-center space-x-1 text-xs px-2 py-1"
          >
            <Network className="w-3 h-3" />
            <span className="hidden sm:inline">Network</span>
          </TabsTrigger>
          <TabsTrigger
            value="storage"
            className="flex items-center space-x-1 text-xs px-2 py-1"
          >
            <HardDrive className="w-3 h-3" />
            <span className="hidden sm:inline">Storage</span>
          </TabsTrigger>
          <TabsTrigger
            value="processes"
            className="flex items-center space-x-1 text-xs px-2 py-1"
          >
            <Activity className="w-3 h-3" />
            <span className="hidden sm:inline">Processes</span>
          </TabsTrigger>
          <TabsTrigger
            value="software"
            className="flex items-center space-x-1 text-xs px-2 py-1"
          >
            <Package className="w-3 h-3" />
            <span className="hidden sm:inline">Software</span>
          </TabsTrigger>
          <TabsTrigger
            value="updates"
            className="flex items-center space-x-1 text-xs px-2 py-1"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Updates</span>
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
                                    ```text
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
              {/* Network Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="w-5 h-5 text-blue-600" />
                    Network Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    try {
                      const rawData = agent?.latest_report?.raw_data;
                      if (!rawData) {
                        return (
                          <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                            <Network className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              No network data available
                            </p>
                          </div>
                        );
                      }

                      const parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;

                      // Enhanced network data extraction
                      const networkInfo = parsedData?.network_info || parsedData?.network || {};
                      const systemInfo = parsedData?.system_info || {};
                      const networkInterfaces = parsedData?.network_interfaces || networkInfo?.interfaces || [];
                      const networkStats = parsedData?.network_stats || {};
                      const routingTable = parsedData?.routing_table || [];
                      const dnsServers = parsedData?.dns_servers || networkInfo?.dns || [];

                      // Extract comprehensive network data
                      const publicIP = networkInfo.public_ip || systemInfo.public_ip || "Unknown";
                      const hostname = systemInfo.hostname || agent?.hostname || "Unknown";
                      const domain = networkInfo.domain || systemInfo.domain || "Not Set";
                      const gateway = networkInfo.gateway || networkInfo.default_gateway || "Unknown";

                      // Extract all network interfaces with details
                      const allInterfaces = [];

                      // Process network interfaces from various data sources
                      if (Array.isArray(networkInterfaces)) {
                        networkInterfaces.forEach(networkInterface => {
                          allInterfaces.push({
                            name: networkInterface.name || networkInterface.interface,
                            type: networkInterface.type || 'Unknown',
                            ip: networkInterface.ip || networkInterface.ip_address,
                            mac: networkInterface.mac || networkInterface.mac_address,
                            status: networkInterface.status || networkInterface.state || 'Unknown',
                            speed: networkInterface.speed,
                            bytes_sent: networkInterface.bytes_sent,
                            bytes_recv: networkInterface.bytes_recv
                          });
                        });
                      }

                      // Extract from Windows-style network data
                      if (parsedData?.network_adapters) {
                        Object.entries(parsedData.network_adapters).forEach(([name, adapter]) => {
                          if (adapter && typeof adapter === 'object') {
                            allInterfaces.push({
                              name: name,
                              type: adapter.type || 'Adapter',
                              ip: adapter.ip_address || adapter.ip,
                              mac: adapter.mac_address || adapter.mac,
                              status: adapter.status || adapter.operational_status || 'Unknown',
                              speed: adapter.speed || adapter.link_speed,
                              description: adapter.description
                            });
                          }
                        });
                      }

                      // Extract Wi-Fi specific information
                      const wifiInfo = networkInfo.wifi || parsedData?.wifi_info || {};
                      const isWifiConnected = wifiInfo.connected || wifiInfo.status === 'connected';

                      // Get all IP addresses
                      const allIPs = [
                        ...new Set([
                          ...(networkInfo.all_ips || []),
                          ...(parsedData?.ip_addresses || []),
                          ...allInterfaces.map(iface => iface.ip).filter(Boolean),
                          agent?.ip_address
                        ].filter(Boolean))
                      ];

                      return (
                        <div className="space-y-6">
                          {/* Main Network Information Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Public IP Address
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <p className="text-blue-900 dark:text-blue-100 font-mono text-lg">{publicIP}</p>
                                  {publicIP !== "Unknown" && publicIP !== "Unable to determine" && (
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  )}
                                </div>
                                {publicIP === "Unknown" || publicIP === "Unable to determine" ? (
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    ⚠️ Unable to detect public IP - check internet connectivity
                                  </p>
                                ) : (
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    ✅ Public IP successfully detected
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                                <Network className="w-4 h-4" />
                                Primary IP
                              </h4>
                              <p className="text-green-900 dark:text-green-100 font-mono">
                                {agent?.ip_address || allIPs[0] || 'Unknown'}
                              </p>
                            </div>

                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                              <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                                <Wifi className="w-4 h-4" />
                                Wi-Fi Status
                              </h4>
                              <p className="text-purple-900 dark:text-purple-100">
                                {isWifiConnected ? `Connected - ${wifiInfo.ssid || 'Active'}` : 'Not Connected'}
                              </p>
                            </div>
                          </div>

                          

                          {/* Hidden: Active Network Interfaces, System Details, and DNS Servers sections */}

                          {/* All IP Addresses */}
                          {allIPs.length > 0 && (
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-3">
                                All Detected IP Addresses ({allIPs.length})
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {allIPs.map((ip, index) => (
                                  <span key={index} className="text-sm font-mono text-yellow-900 dark:text-yellow-100 bg-yellow-100 dark:bg-yellow-800/30 px-3 py-1 rounded">
                                    {ip}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Enhanced Geographic Location */}
                          <div className="space-y-4">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                              <h4 className="font-medium text-indigo-800 dark:text-indigo-200 mb-3 flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Geographic Location
                              </h4>

                              {(() => {
                                const location = networkInfo.location || networkInfo.geo_location;
                                const geoDetails = networkInfo.geo_details;

                                if (!location && !geoDetails) {
                                  return (
                                    <div className="text-center py-3">
                                      <p className="text-indigo-700 dark:text-indigo-300">Location not available</p>
                                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                        Enable internet access for geolocation
                                      </p>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-3">
                                    {location && (
                                      <div className="text-indigo-900 dark:text-indigo-100 font-medium">
                                        📍 {location}
                                      </div>
                                    )}

                                    {geoDetails && (
                                      <div className="grid grid-cols-2 gap-3 text-sm">
                                        {geoDetails.city && (
                                          <div>
                                            <span className="text-indigo-600 dark:text-indigo-400">City:</span>
                                            <span className="ml-2 text-indigo-800 dark:text-indigo-200">{geoDetails.city}</span>
                                          </div>
                                        )}
                                        {geoDetails.region && (
                                          <div>
                                            <span className="text-indigo-600 dark:text-indigo-400">Region:</span>
                                            <span className="ml-2 text-indigo-800 dark:text-indigo-200">{geoDetails.region}</span>
                                          </div>
                                        )}
                                        {geoDetails.country && (
                                          <div>
                                            <span className="text-indigo-600 dark:text-indigo-400">Country:</span>
                                            <span className="ml-2 text-indigo-800 dark:text-indigo-200">
                                              {geoDetails.country}
                                              {geoDetails.country_code && ` (${geoDetails.country_code})`}
                                            </span>
                                          </div>
                                        )}
                                        {geoDetails.postal_code && (
                                          <div>
                                            <span className="text-indigo-600 dark:text-indigo-400">Postal:</span>
                                            <span className="ml-2 text-indigo-800 dark:text-indigo-200">{geoDetails.postal_code}</span>
                                          </div>
                                        )}
                                        {(geoDetails.latitude && geoDetails.longitude) && (
                                          <div className="col-span-2">
                                            <span className="text-indigo-600 dark:text-indigo-400">Coordinates:</span>
                                            <span className="ml-2 text-indigo-800 dark:text-indigo-200 font-mono text-xs">
                                              {parseFloat(geoDetails.latitude).toFixed(4)}, {parseFloat(geoDetails.longitude).toFixed(4)}
                                            </span>
                                          </div>
                                        )}
                                        {geoDetails.timezone && (
                                          <div className="col-span-2">
                                            <span className="text-indigo-600 dark:text-indigo-400">Timezone:</span>
                                            <span className="ml-2 text-indigo-800 dark:text-indigo-200">{geoDetails.timezone}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {networkInfo.isp && (
                                      <div className="pt-2 border-t border-indigo-200 dark:border-indigo-700">
                                        <span className="text-indigo-600 dark:text-indigo-400 text-sm">ISP/Organization:</span>
                                        <p className="text-indigo-800 dark:text-indigo-200 font-medium">{networkInfo.isp}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    } catch (error) {
                      console.error("Error parsing network data:", error);
                      return (
                        <div className="text-center py-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                          <p className="text-sm text-red-800 dark:text-red-200">
                            Error parsing network data: {error.message}
                          </p>
                        </div>
                      );
                    }
                  })()}
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
                    try {
                      // Get raw data from the agent
                      const rawData = agent?.latest_report?.raw_data;
                      if (!rawData) {
                        return (
                          <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              No agent data available
                            </p>
                          </div>
                        );
                      }

                      const parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;

                      // Get OS name from multiple possible locations
                      const osName = (
                        agent?.latest_report?.os_info?.name ||
                        parsedData?.os_info?.name ||
                        parsedData?.system_info?.os ||
                        ""
                      ).toLowerCase();

                      // Get patch data from correct locations
                      const patches = parsedData?.patches || [];
                      const legacyPatches = parsedData?.os_info?.patches || [];
                      const patchSummary = parsedData?.os_info?.patch_summary || null;
                      const lastUpdate = parsedData?.os_info?.last_update;

                      console.log("Updates Tab Debug:", {
                        osName,
                        hasPatches: patches.length > 0,
                        hasLegacyPatches: legacyPatches.length > 0,
                        hasPatchSummary: !!patchSummary,
                        patchCount: patches.length,
                        legacyPatchCount: legacyPatches.length,
                        parsedDataKeys: Object.keys(parsedData || {}),
                        osInfoKeys: Object.keys(parsedData?.os_info || {}),
                      });

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
                                  {typeof lastUpdate === "object" && lastUpdate.DateTime
                                    ? lastUpdate.DateTime
                                    : typeof lastUpdate === "string"
                                      ? lastUpdate
                                      : lastUpdate?.value
                                        ? new Date(parseInt(lastUpdate.value.replace(/\/Date\((\d+)\)\//, "$1"))).toLocaleDateString()
                                        : "Unknown"}
                                </div>
                              </div>
                            )}

                            {/* Windows Updates */}
                            {windowsUpdates ? (
                              <div className="space-y-4">
                                {/* Available Updates */}
                                {windowsUpdates.available_updates && windowsUpdates.available_updates.length > 0 ? (
                                  <div>
                                    <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                                      <Download className="w-4 h-4 text-orange-600" />
                                      Available Windows Updates ({windowsUpdates.available_updates.length})
                                    </h4>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                      {windowsUpdates.available_updates.slice(0, 10).map((update, index) => (
                                        <div
                                          key={index}
                                          className="p-3 border rounded-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800"
                                        >
                                          <div className="flex justify-between items-start mb-2">
                                            <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                                              {update.Title || update.title}
                                            </div>
                                            {update.Severity && (
                                              <Badge variant={update.Severity === 'Critical' ? 'destructive' : 'secondary'}>
                                                {update.Severity}
                                              </Badge>
                                            )}
                                          </div>
                                          {update.KBArticleIDs && (
                                            <div className="text-xs text-orange-600 dark:text-orange-400">
                                              KB: {update.KBArticleIDs}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                {/* Installed Updates */}
                                {windowsUpdates.installed_updates && windowsUpdates.installed_updates.length > 0 ? (
                                  <div>
                                    <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                                      <Shield className="w-4 h-4 text-green-600" />
                                      Recently Installed Windows Updates ({windowsUpdates.installed_updates.length})
                                    </h4>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                      {windowsUpdates.installed_updates.slice(0, 15).map((update, index) => (
                                        <div
                                          key={index}
                                          className="flex justify-between items-center py-3 px-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800"
                                        >
                                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                            {update.Title || update.title}
                                          </span>
                                          <span className="text-xs text-green-600 dark:text-green-400">
                                            {update.Date || update.install_date || "Unknown date"}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                {/* Last Search Date */}
                                {windowsUpdates.last_search_date && (
                                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Clock className="w-4 h-4 text-blue-600" />
                                      <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
                                        Last Update Check
                                      </span>
                                    </div>
                                    <div className="text-sm text-blue-700 dark:text-blue-300">
                                      {windowsUpdates.last_search_date}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (patches && patches.length > 0) || (legacyPatches && legacyPatches.length > 0) ? (
                              <div>
                                <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-green-600" />
                                  Installed Windows Patches ({(patches.length || 0) + (legacyPatches.length || 0)})
                                </h4>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {/* Display patches from patches array */}
                                  {patches.slice(0, 15).map((patch, index) => (
                                    <div
                                      key={`patch-${index}`}
                                      className="flex justify-between items-center py-3 px-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800"
                                    >
                                      <span className="text-sm font-medium font-mono text-green-800 dark:text-green-200">
                                        {patch.id || patch.HotFixID || `KB${patch.id}`}
                                      </span>
                                      <span className="text-xs text-green-600 dark:text-green-400">
                                        {patch.installed_on?.DateTime || 
                                         patch.installed_on || 
                                         patch.InstalledOn || 
                                         (patch.installed_on?.value && new Date(parseInt(patch.installed_on.value.replace(/\/Date\((\d+)\)\//, "$1"))).toLocaleDateString()) ||
                                         "Unknown date"}
                                      </span>
                                    </div>
                                  ))}

                                  {/* Display legacy patches from os_info.patches */}
                                  {legacyPatches.slice(0, Math.max(0, 15 - patches.length)).map((patch, index) => (
                                    <div
                                      key={`legacy-${index}`}
                                      className="flex justify-between items-center py-3 px-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800"
                                    >
                                      <span className="text-sm font-medium font-mono text-green-800 dark:text-green-200">
                                        {patch.id || `KB${patch.id}`}
                                      </span>
                                      <span className="text-xs text-green-600 dark:text-green-400">
                                        {patch.installed_on?.DateTime || 
                                         (patch.installed_on?.value && new Date(parseInt(patch.installed_on.value.replace(/\/Date\((\d+)\)\//, "$1"))).toLocaleDateString()) ||
                                         "Unknown date"}
                                      </span>
                                    </div>
                                  ))}

                                  {((patches.length || 0) + (legacyPatches.length || 0)) > 15 && (
                                    <div className="text-xs text-neutral-500 pt-2 text-center">
                                      ...and {((patches.length || 0) + (legacyPatches.length || 0)) - 15} more patches
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
                      if (osName.includes("linux") || osName.includes("ubuntu") || osName.includes("debian") || osName.includes("centos") || osName.includes("rhel")) {
                        return (
                          <div className="space-y-4">
                            {/* Package Summary */}
                            {patchSummary && (
                              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2 mb-2">
                                  <Package className="w-4 h-4 text-blue-600" />
                                  <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
                                    Package Summary ({patchSummary.system_type || "Linux"})
                                  </span>
                                </div>
                                <div className="text-sm text-blue-700 dark:text-blue-300">
                                  Total Installed: {patchSummary.total_installed || 0} packages
                                </div>
                                {patchSummary.last_update_date && (
                                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    Last Update: {patchSummary.last_update_date}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Linux Recent Updates */}
                            {patchSummary && patchSummary.recent_patches && patchSummary.recent_patches.length > 0 ? (
                              <div>
                                <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                                  <Package className="w-4 h-4 text-green-600" />
                                  Recent System Updates ({patchSummary.recent_patches.length})
                                </h4>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {patchSummary.recent_patches.map((patch, index) => (
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
                                  ))}
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
                      if (osName.includes("darwin") || osName.includes("macos")) {
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

                      // Unknown OS or no OS detected
                      return (
                        <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm text-gray-800 dark:text-gray-200">
                            Patch information not available
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            OS: {osName || "Unknown"} | Patches: {patches.length} | Summary: {patchSummary ? "Yes" : "No"}
                          </p>
                        </div>
                      );
                    } catch (error) {
                      console.error("Error parsing patch data:", error);
                      return (
                        <div className="text-center py-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                          <p className="text-sm text-red-800 dark:text-red-200">
                            Error parsing patch data
                          </p>
                        </div>
                      );
                    }
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
                    try {
                      // Get security data from raw_data
                      const rawData = agent?.latest_report?.raw_data;
                      if (!rawData) {
                        return (
                          <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              No agent data available
                            </p>
                          </div>
                        );
                      }

                      const parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
                      const security = parsedData?.security || {};

                      console.log("Security Debug:", {
                        hasSecurity: !!security,
                        securityKeys: Object.keys(security),
                        firewallStatus: security.firewall_status,
                        antivirusStatus: security.antivirus_status,
                      });

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
                                <span className="font-medium text-sm">Firewall</span>
                              </div>
                              <div className={`text-sm capitalize ${
                                security.firewall_status === "enabled"
                                  ? "text-green-600"
                                  : security.firewall_status === "disabled"
                                    ? "text-red-600"
                                    : "text-yellow-600"
                              }`}>
                                {security.firewall_status}
                              </div>
                            </div>
                          )}

                          {/* Antivirus Status */}
                          {security.antivirus_status && (
                            <div className="p-4 border rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Shield className="w-4 h-4 text-purple-600" />
                                <span className="font-medium text-sm">Antivirus</span>
                              </div>
                              <div className={`text-sm capitalize ${
                                security.antivirus_status === "enabled"
                                  ? "text-green-600"
                                  : security.antivirus_status === "disabled"
                                    ? "text-red-600"
                                    : "text-yellow-600"
                              }`}>
                                {security.antivirus_status}
                              </div>
                            </div>
                          )}

                          {/* Last Scan (Windows) */}
                          {security.last_scan && (
                            <div className="p-4 border rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-sm">Last Scan</span>
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
                                <span className="font-medium text-sm">Last Update Check</span>
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
                                <span className="font-medium text-sm">Automatic Updates</span>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {security.automatic_updates}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    } catch (error) {
                      console.error("Error parsing security data:", error);
                      return (
                        <div className="text-center py-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                          <p className="text-sm text-red-800 dark:text-red-200">
                            Error parsing security data
                          </p>
                        </div>
                      );
                    }
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
                    try {
                      // Get active ports from raw_data
                      const rawData = agent?.latest_report?.raw_data;
                      if (!rawData) {
                        return (
                          <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                            <Network className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              No agent data available
                            </p>
                          </div>
                        );
                      }

                      const parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
                      const activePorts = parsedData?.active_ports || [];

                      console.log("Active Ports Debug:", {
                        hasActivePorts: !!activePorts,
                        portsCount: activePorts.length,
                        firstPort: activePorts[0],
                      });

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
                    } catch (error) {
                      console.error("Error parsing active ports data:", error);
                      return (
                        <div className="text-center py-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                          <p className="text-sm text-red-800 dark:text-red-200">
                            Error parsing active ports data
                          </p>
                        </div>
                      );
                    }
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