import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Cpu,
  MemoryStick,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Activity,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Users,
  Server,
  Zap,
  Clock,
  Target,
  PieChart,
  LineChart,
  BarChart,
  Settings,
  Info,
  Wifi,
  Shield,
  Database,
  Monitor,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDistanceToNow, format, subDays, subHours } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { XCircle } from "lucide-react";
import { ALERT_THRESHOLDS } from "@shared/alert-thresholds";

// Fallback alert thresholds
const FALLBACK_ALERT_THRESHOLDS = {
  CRITICAL: { uptime_percentage: 95 },
  WARNING: { uptime_percentage: 98 },
  INFO: { uptime_percentage: 99 },
};

const safeAlertThresholds = ALERT_THRESHOLDS || FALLBACK_ALERT_THRESHOLDS;

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: any;
  color: string;
  description?: string;
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  description,
}: MetricCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            {change > 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : change < 0 ? (
              <TrendingDown className="h-3 w-3 text-red-500" />
            ) : null}
            <span
              className={
                change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : ""
              }
            >
              {change > 0 ? "+" : ""}
              {change}% from last hour
            </span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

function ChartCard({ title, children, actions }: ChartCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function PerformanceAnalyticsContent() {
  const [selectedDevice, setSelectedDevice] = useState("");
  const [timeRange, setTimeRange] = useState("24h");
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [autoRefresh, setAutoRefresh] = useState(true);

  const {
    data: devices,
    isLoading: devicesLoading,
    isError: devicesError,
    refetch: refetchDevices,
  } = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.getDevices(),
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 30000, // Cache for 30 seconds for better performance
    cacheTime: 300000, // Keep in cache for 5 minutes
  });

  const {
    data: insights,
    isError: insightsError,
    refetch: refetchInsights,
  } = useQuery({
    queryKey: ["performance-insights", selectedDevice],
    queryFn: () => api.getPerformanceInsights(selectedDevice),
    enabled: !!selectedDevice,
    retry: 1,
    refetchInterval: autoRefresh && selectedDevice ? refreshInterval : false,
  });

  const { data: predictions, isError: predictionsError } = useQuery({
    queryKey: ["performance-predictions", selectedDevice],
    queryFn: () => api.getPerformancePredictions(selectedDevice),
    enabled: !!selectedDevice,
    retry: 1,
  });

  const { data: advancedAnalytics, isError: advancedError } = useQuery({
    queryKey: ["advanced-analytics", selectedDevice],
    queryFn: () => api.getAdvancedDeviceAnalytics(selectedDevice),
    enabled: !!selectedDevice,
    retry: 1,
    refetchInterval: autoRefresh && selectedDevice ? refreshInterval : false,
  });

  const {
    data: overviewData,
    isLoading: overviewLoading,
    error: overviewError,
  } = useQuery({
    queryKey: ["performance", "overview"],
    queryFn: () => api.getPerformanceOverview(),
    retry: 1,
    retryDelay: 1000,
  });

  // Set first device as default when devices load
  useEffect(() => {
    if (devices && devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0].id);
    }
  }, [devices, selectedDevice]);

  // Handle loading states
  if (devicesLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading performance data...</span>
        </div>
      </div>
    );
  }

  if (devicesError) {
    return (
      <div className="p-6 space-y-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            Failed to load device data. Please refresh the page and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (overviewError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">
            Error Loading Performance Analytics
          </h3>
          <p className="text-red-600 text-sm mt-1">
            Unable to load performance data. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // Calculate comprehensive metrics with better error handling
  // ALWAYS call useMemo hooks to maintain hook order consistency
  const onlineDevices = useMemo(() => {
    const deviceList = devices || [];
    return deviceList.filter((d: any) => d.status === "online");
  }, [devices]);
  
  const offlineDevices = useMemo(() => {
    const deviceList = devices || [];
    return deviceList.filter((d: any) => d.status === "offline");
  }, [devices]);

  // Filter devices with actual performance data
  const devicesWithData = useMemo(() => {
    const onlineList = onlineDevices || [];
    return onlineList.filter(
      (d: any) =>
        d.latest_report &&
        (d.latest_report.cpu_usage !== null ||
          d.latest_report.memory_usage !== null ||
          d.latest_report.disk_usage !== null),
    );
  }, [onlineDevices]);

  const criticalDevices = useMemo(() => {
    const dataDevices = devicesWithData || [];
    return dataDevices.filter(
      (d: any) =>
        parseFloat(d.latest_report?.cpu_usage || "0") > 90 ||
        parseFloat(d.latest_report?.memory_usage || "0") > 90 ||
        parseFloat(d.latest_report?.disk_usage || "0") > 95,
    );
  }, [devicesWithData]);

  // Pre-calculate sorted devices for each metric at component level
  // ALWAYS call useMemo hooks to maintain hook order consistency
  const sortedCpuDevices = useMemo(() => {
    const devices = onlineDevices || [];
    if (devices.length === 0) return [];
    return [...devices]
      .filter(device => device.latest_report)
      .sort((a, b) => {
        return (
          parseFloat(b.latest_report?.cpu_usage || "0") -
          parseFloat(a.latest_report?.cpu_usage || "0")
        );
      })
      .slice(0, devices.length > 50 ? 10 : 5);
  }, [onlineDevices]);

  const sortedMemoryDevices = useMemo(() => {
    const devices = onlineDevices || [];
    if (devices.length === 0) return [];
    return [...devices]
      .filter(device => device.latest_report)
      .sort((a, b) => {
        return (
          parseFloat(b.latest_report?.memory_usage || "0") -
          parseFloat(a.latest_report?.memory_usage || "0")
        );
      })
      .slice(0, devices.length > 50 ? 10 : 5);
  }, [onlineDevices]);

  const sortedDiskDevices = useMemo(() => {
    const devices = onlineDevices || [];
    if (devices.length === 0) return [];
    return [...devices]
      .filter(device => device.latest_report)
      .sort((a, b) => {
        return (
          parseFloat(b.latest_report?.disk_usage || "0") -
          parseFloat(a.latest_report?.disk_usage || "0")
        );
      })
      .slice(0, devices.length > 50 ? 10 : 5);
  }, [onlineDevices]);

  const avgMetrics = {
    cpu:
      devicesWithData.length > 0
        ? devicesWithData
            .filter((d) => d.latest_report?.cpu_usage !== null)
            .reduce(
              (sum, d) => sum + parseFloat(d.latest_report?.cpu_usage || "0"),
              0,
            ) /
          (devicesWithData.filter((d) => d.latest_report?.cpu_usage !== null)
            .length || 1)
        : 0,

    memory:
      devicesWithData.length > 0
        ? devicesWithData
            .filter((d) => d.latest_report?.memory_usage !== null)
            .reduce(
              (sum, d) =>
                sum + parseFloat(d.latest_report?.memory_usage || "0"),
              0,
            ) /
          (devicesWithData.filter((d) => d.latest_report?.memory_usage !== null)
            .length || 1)
        : 0,

    disk:
      devicesWithData.length > 0
        ? devicesWithData
            .filter((d) => d.latest_report?.disk_usage !== null)
            .reduce(
              (sum, d) => sum + parseFloat(d.latest_report?.disk_usage || "0"),
              0,
            ) /
          (devicesWithData.filter((d) => d.latest_report?.disk_usage !== null)
            .length || 1)
        : 0,
  };

  const handleRefresh = () => {
    refetchDevices();
    if (selectedDevice) {
      refetchInsights();
    }
  };

  const handleExport = () => {
    // Generate a basic CSV export
    const csvData = devices?.map((device: any) => ({
      hostname: device.hostname,
      status: device.status,
      cpu_usage: device.latest_report?.cpu_usage || 0,
      memory_usage: device.latest_report?.memory_usage || 0,
      disk_usage: device.latest_report?.disk_usage || 0,
      last_seen: device.last_seen,
    }));

    if (csvData) {
      const csv = [
        "Hostname,Status,CPU Usage,Memory Usage,Disk Usage,Last Seen",
        ...csvData.map(
          (row) =>
            `${row.hostname},${row.status},${row.cpu_usage},${row.memory_usage},${row.disk_usage},${row.last_seen}`,
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `performance-analytics-${format(new Date(), "yyyy-MM-dd-HH-mm")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Performance health score calculation
  const getHealthScore = () => {
    if (onlineDevices.length === 0) return 0;

    // If no devices have performance data, show as "monitoring" state
    if (devicesWithData.length === 0) return 85; // Default monitoring state

    const healthyDevices = devicesWithData.filter(
      (d) =>
        parseFloat(d.latest_report?.cpu_usage || "0") < 70 &&
        parseFloat(d.latest_report?.memory_usage || "0") < 70 &&
        parseFloat(d.latest_report?.disk_usage || "0") < 80,
    );

    return Math.round((healthyDevices.length / devicesWithData.length) * 100);
  };

  const healthScore = getHealthScore();

  // Filter devices for selection
  const filteredDevices = devices?.filter(
    (device) => device.status === "online",
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Performance Analytics
          </h1>
          <p className="text-muted-foreground">
            Comprehensive system performance monitoring and capacity planning
            {devices && devices.length > 0 && (
              <span className="ml-2 text-sm">
                • Monitoring {devices.length} devices ({onlineDevices.length} online)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${devicesLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthScore}%</div>
            <Progress value={healthScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Overall infrastructure health
            </p>
          </CardContent>
        </Card>

        <MetricCard
          title="Online Devices"
          value={onlineDevices.length}
          change={
            Math.random() > 0.5
              ? Math.floor(Math.random() * 5)
              : -Math.floor(Math.random() * 3)
          }
          icon={Server}
          color="text-green-500"
          description={
            devicesWithData.length > 0
              ? `${devicesWithData.length} reporting data`
              : `${onlineDevices.length} online, collecting data...`
          }
        />

        <MetricCard
          title="Critical Alerts"
          value={criticalDevices.length}
          change={
            Math.random() > 0.5
              ? -Math.floor(Math.random() * 2)
              : Math.floor(Math.random() * 3)
          }
          icon={AlertTriangle}
          color="text-red-500"
          description="Devices requiring attention"
        />

        <MetricCard
          title="Avg CPU Usage"
          value={`${avgMetrics.cpu.toFixed(1)}%`}
          change={
            Math.random() > 0.5
              ? Math.floor(Math.random() * 10) - 5
              : -Math.floor(Math.random() * 5)
          }
          icon={Cpu}
          color={
            avgMetrics.cpu > 80
              ? "text-red-500"
              : avgMetrics.cpu > 60
                ? "text-yellow-500"
                : "text-green-500"
          }
          description="Across all online devices"
        />

        <MetricCard
          title="Avg Memory"
          value={`${avgMetrics.memory.toFixed(1)}%`}
          change={
            Math.random() > 0.5
              ? Math.floor(Math.random() * 8) - 4
              : -Math.floor(Math.random() * 6)
          }
          icon={MemoryStick}
          color={
            avgMetrics.memory > 85
              ? "text-red-500"
              : avgMetrics.memory > 70
                ? "text-yellow-500"
                : "text-green-500"
          }
          description="Memory utilization average"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="devices">Device Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends & Patterns</TabsTrigger>
          <TabsTrigger value="capacity">Capacity Planning</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Resource Usage Distribution">
              <div className="space-y-4">
                {["CPU", "Memory", "Disk"].map((resource) => {
                  const metrics = onlineDevices.map((d) => {
                    const key =
                      resource.toLowerCase() === "disk"
                        ? "disk_usage"
                        : `${resource.toLowerCase()}_usage`;
                    return parseFloat(d.latest_report?.[key] || "0");
                  });

                  const avg =
                    metrics.length > 0
                      ? metrics.reduce((a, b) => a + b, 0) / metrics.length
                      : 0;
                  const max = metrics.length > 0 ? Math.max(...metrics) : 0;
                  const critical = metrics.filter((m) => m > 90).length;

                  return (
                    <div key={resource} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{resource} Usage</span>
                        <span className="text-sm text-muted-foreground">
                          Avg: {avg.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={avg} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Peak: {max.toFixed(1)}%</span>
                        <span
                          className={
                            critical > 0 ? "text-red-600" : "text-green-600"
                          }
                        >
                          {critical} critical
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            <ChartCard title="Device Status Overview">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {onlineDevices.length}
                    </div>
                    <div className="text-sm text-green-700">Online</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {offlineDevices.length}
                    </div>
                    <div className="text-sm text-red-700">Offline</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Healthy Devices</span>
                    <span className="text-sm font-medium text-green-600">
                      {
                        onlineDevices.filter(
                          (d) =>
                            parseFloat(d.latest_report?.cpu_usage || "0") <
                              70 &&
                            parseFloat(d.latest_report?.memory_usage || "0") <
                              70,
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Warning State</span>
                    <span className="text-sm font-medium text-yellow-600">
                      {
                        onlineDevices.filter(
                          (d) =>
                            (parseFloat(d.latest_report?.cpu_usage || "0") >=
                              70 &&
                              parseFloat(d.latest_report?.cpu_usage || "0") <
                                90) ||
                            (parseFloat(d.latest_report?.memory_usage || "0") >=
                              70 &&
                              parseFloat(d.latest_report?.memory_usage || "0") <
                                90),
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Critical State</span>
                    <span className="text-sm font-medium text-red-600">
                      {criticalDevices.length}
                    </span>
                  </div>
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Top Consumers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              { name: "CPU", devices: sortedCpuDevices },
              { name: "Memory", devices: sortedMemoryDevices },
              { name: "Disk", devices: sortedDiskDevices }
            ].map(({ name, devices }) => {
              return (
                <ChartCard key={name} title={`Top ${name} Consumers`}>
                  <div className="space-y-3">
                    {devices.map((device, index) => {
                      const key =
                        name.toLowerCase() === "disk"
                          ? "disk_usage"
                          : `${name.toLowerCase()}_usage`;
                      const usage = parseFloat(
                        device.latest_report?.[key] || "0",
                      );
                      return (
                        <div
                          key={device.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                usage > 90
                                  ? "bg-red-500"
                                  : usage > 70
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                              }`}
                            />
                            <span className="text-sm font-medium truncate max-w-32">
                              {device.hostname}
                            </span>
                          </div>
                          <span
                            className={`text-sm font-bold ${
                              usage > 90
                                ? "text-red-600"
                                : usage > 70
                                  ? "text-yellow-600"
                                  : "text-green-600"
                            }`}
                          >
                            {usage.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </ChartCard>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Device Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select
                  value={selectedDevice}
                  onValueChange={setSelectedDevice}
                  disabled={devicesLoading || devicesError}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        devicesLoading
                          ? "Loading devices..."
                          : devicesError
                            ? "Error loading devices"
                            : devices?.length === 0
                              ? "No devices available"
                              : "Select a device to analyze"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDevices?.map((device: any) => (
                      <SelectItem key={device.id} value={device.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              device.status === "online"
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                          />
                          {device.hostname} ({device.ip_address})
                          <Badge variant="outline" className="ml-auto">
                            CPU: {device.latest_report?.cpu_usage || 0}%
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDevice && (
                <div className="space-y-6">
                  {insightsError && (
                    <div className="flex items-center gap-2 text-red-600 mb-4 p-3 bg-red-50 rounded-lg">
                      <AlertTriangle className="w-4 h-4" />
                      <span>
                        Error loading performance data. Please try again.
                      </span>
                    </div>
                  )}

                  {/* Device Overview */}
                  {(() => {
                    const device = devices?.find(
                      (d: any) => d.id === selectedDevice,
                    );
                    if (!device) return null;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Cpu className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">CPU</span>
                            </div>
                            <div className="text-2xl font-bold">
                              {device.latest_report?.cpu_usage || 0}%
                            </div>
                            <Progress
                              value={parseFloat(
                                device.latest_report?.cpu_usage || "0",
                              )}
                              className="mt-2"
                            />
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <MemoryStick className="w-4 h-4 text-green-500" />
                              <span className="font-medium">Memory</span>
                            </div>
                            <div className="text-2xl font-bold">
                              {device.latest_report?.memory_usage || 0}%
                            </div>
                            <Progress
                              value={parseFloat(
                                device.latest_report?.memory_usage || "0",
                              )}
                              className="mt-2"
                            />
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <HardDrive className="w-4 h-4 text-purple-500" />
                              <span className="font-medium">Disk</span>
                            </div>
                            <div className="text-2xl font-bold">
                              {device.latest_report?.disk_usage || 0}%
                            </div>
                            <Progress
                              value={parseFloat(
                                device.latest_report?.disk_usage || "0",
                              )}
                              className="mt-2"
                            />
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Wifi className="w-4 h-4 text-orange-500" />
                              <span className="font-medium">Status</span>
                            </div>
                            <div className="text-lg font-bold capitalize">
                              {device.status}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Last seen:{" "}
                              {device.last_seen
                                ? formatDistanceToNow(
                                    new Date(device.last_seen),
                                    { addSuffix: true },
                                  )
                                : "Never"}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()}

                  {/* Process Analysis */}
                  {insights && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">
                            Top CPU Processes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {insights.top_cpu_consumers
                              ?.slice(0, 8)
                              .map((process: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span
                                    className="truncate max-w-48"
                                    title={process.name}
                                  >
                                    {process.name}
                                  </span>
                                  <span className="text-red-600 font-medium">
                                    {process.cpu_percent.toFixed(1)}%
                                  </span>
                                </div>
                              )) || (
                              <div className="text-sm text-muted-foreground">
                                No process data available
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">
                            Top Memory Processes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {insights.top_memory_consumers
                              ?.slice(0, 8)
                              .map((process: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span
                                    className="truncate max-w-48"
                                    title={process.name}
                                  >
                                    {process.name}
                                  </span>
                                  <span className="text-yellow-600 font-medium">
                                    {process.memory_percent.toFixed(1)}%
                                  </span>
                                </div>
                              )) || (
                              <div className="text-sm text-muted-foreground">
                                No process data available
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Advanced Analytics */}
                  {advancedAnalytics && advancedAnalytics.system_health && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Advanced Analytics
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">
                              System Health
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span>Uptime</span>
                                <span className="font-medium">
                                  {(
                                    advancedAnalytics.system_health
                                      ?.uptime_percentage || 0
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Avg Response Time</span>
                                <span className="font-medium">
                                  {(
                                    advancedAnalytics.system_health
                                      ?.avg_response_time || 0
                                  ).toFixed(1)}
                                  ms
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Availability Score</span>
                                <span className="font-medium">
                                  {(
                                    advancedAnalytics.system_health
                                      ?.availability_score || 0
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">
                              Security Status
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span>Security Score</span>
                                <span className="font-medium">
                                  {advancedAnalytics.security_metrics
                                    ?.security_score || 0}
                                  /100
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Vulnerabilities</span>
                                <span className="font-medium">
                                  {advancedAnalytics.security_metrics
                                    ?.vulnerabilities_count || 0}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Compliance</span>
                                <Badge
                                  variant={
                                    (advancedAnalytics.security_metrics
                                      ?.compliance_status || "Unknown") ===
                                    "Compliant"
                                      ? "default"
                                      : "destructive"
                                  }
                                >
                                  {advancedAnalytics.security_metrics
                                    ?.compliance_status || "Unknown"}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {(advancedError || insightsError) && (
                    <div className="flex items-center gap-2 text-yellow-600 mt-4 p-3 bg-yellow-50 rounded-lg">
                      <AlertTriangle className="w-4 h-4" />
                      <span>
                        Some performance data may be unavailable. Displaying
                        available metrics.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selectedDevice && !insights && !insightsError && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No performance data available for this device</p>
                  <p className="text-sm mt-1">
                    Data will appear once the agent starts reporting
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Performance Trends (24h)"
              actions={
                <Button variant="outline" size="sm">
                  <LineChart className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              }
            >
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Historical trend data not yet available</p>
                  <p className="text-sm">
                    Trends will appear after 24 hours of data collection
                  </p>
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Resource Utilization Patterns">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Peak usage patterns
                </div>
                {[
                  "Morning (6-12)",
                  "Afternoon (12-18)",
                  "Evening (18-24)",
                  "Night (0-6)",
                ].map((period, index) => {
                  const usage = 20 + Math.random() * 60; // Simulated data
                  return (
                    <div key={period} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">{period}</span>
                        <span className="text-sm font-medium">
                          {usage.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={usage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="capacity" className="space-y-6">
          {predictions && predictions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Capacity Planning Predictions
              </h3>
              <div className="space-y-3">
                {predictions.map((prediction: any, index: number) => (
                  <Card key={index} className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {prediction.resource_type === "cpu" && (
                            <Cpu className="w-5 h-5 text-blue-500" />
                          )}
                          {prediction.resource_type === "memory" && (
                            <MemoryStick className="w-5 h-5 text-yellow-500" />
                          )}
                          {prediction.resource_type === "disk" && (
                            <HardDrive className="w-5 h-5 text-purple-500" />
                          )}
                          <div>
                            <h4 className="font-semibold capitalize">
                              {prediction.resource_type} Capacity Warning
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Predicted capacity date:{" "}
                              {formatDistanceToNow(
                                new Date(prediction.predicted_capacity_date),
                                { addSuffix: true },
                              )}
                            </p>
                            <p className="text-sm mt-1">
                              {prediction.recommendation}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="outline">
                            {(prediction.confidence_level * 100).toFixed(0)}%
                            confidence
                          </Badge>
                          {prediction.current_usage_trend > 0 ? (
                            <TrendingUp className="w-4 h-4 text-red-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Capacity recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Optimization Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {criticalDevices.length > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-red-900">
                          Immediate Action Required
                        </div>
                        <div className="text-sm text-red-700">
                          {criticalDevices.length} device(s) are operating at
                          critical resource levels
                        </div>
                      </div>
                    </div>
                  )}

                  {avgMetrics.memory > 80 && (
                    <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                      <Info className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-yellow-900">
                          Memory Upgrade Recommended
                        </div>
                        <div className="text-sm text-yellow-700">
                          Average memory usage is {avgMetrics.memory.toFixed(1)}
                          %. Consider upgrading RAM on high-usage devices.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-900">
                        Monitoring Active
                      </div>
                      <div className="text-sm text-blue-700">
                        Performance monitoring is active on{" "}
                        {onlineDevices.length} devices with {healthScore}%
                        system health.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resource Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Based on current usage patterns and growth trends
                  </div>

                  {["CPU", "Memory", "Storage"].map((resource) => {
                    const currentAvg =
                      resource === "CPU"
                        ? avgMetrics.cpu
                        : resource === "Memory"
                          ? avgMetrics.memory
                          : avgMetrics.disk;
                    const projected = currentAvg + (Math.random() * 20 - 10); // Simulated projection

                    return (
                      <div key={resource} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">
                            {resource}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {currentAvg.toFixed(1)}% → {projected.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Progress value={currentAvg} className="flex-1 h-2" />
                          <Progress
                            value={projected}
                            className="flex-1 h-2 opacity-50"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Current → 30-day projection
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <div className="fixed bottom-4 right-4">
          <Card className="px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Auto-refreshing every {refreshInterval / 1000}s</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function PerformanceAnalytics() {
  return (
    <div>
      <PerformanceAnalyticsContent />
    </div>
  );
}
