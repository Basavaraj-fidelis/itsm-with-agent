
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Server,
  AlertCircle,
  CheckCircle,
  HardDrive,
  MemoryStick,
  Cpu,
  Calendar,
  FileText,
  PieChart,
  Activity
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";

interface Report {
  id: string;
  title: string;
  type: string;
  data: any;
  generated_at: Date;
  time_range: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: any;
  description?: string;
}

function MetricCard({ title, value, trend, icon: Icon, description }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground">
            {trend > 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : trend < 0 ? (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            ) : null}
            <span className={trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : ""}>
              {trend > 0 ? "+" : ""}{trend}% from last period
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

export default function Reports() {
  const [selectedReportType, setSelectedReportType] = useState("performance");
  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");
  const [selectedFormat, setSelectedFormat] = useState("json");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reportTypes = [
    { value: "performance", label: "Performance Summary", icon: BarChart3 },
    { value: "availability", label: "Availability Report", icon: Activity },
    { value: "inventory", label: "System Inventory", icon: Server }
  ];

  const timeRanges = [
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "90d", label: "Last 90 Days" }
  ];

  const formats = [
    { value: "json", label: "JSON" },
    { value: "csv", label: "CSV" },
    { value: "docx", label: "MS Word (DOCX)" }
  ];

  useEffect(() => {
    let mounted = true;
    
    const initializeReports = async () => {
      try {
        // Only fetch recent reports, don't auto-generate default report
        if (mounted) {
          await fetchRecentReports();
        }
      } catch (error) {
        console.error("Error initializing reports:", error);
        if (mounted) {
          setError("Failed to initialize reports");
        }
      }
    };

    initializeReports();
    
    return () => {
      mounted = false;
    };
  }, []);

  const fetchRecentReports = async () => {
    try {
      setError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await api.get("/api/analytics/recent", {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setRecentReports(data.reports || []);
      } else {
        console.error("Failed to fetch recent reports:", response.status);
        setError("Failed to fetch recent reports");
        // Don't retry automatically on failure
        return;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setError("Request timed out. Please try again.");
      } else {
        console.error("Error fetching recent reports:", error);
        setError("Network error while fetching reports");
      }
      // Don't retry automatically on error
      return;
    }
  };

  const generateDefaultReport = async () => {
    try {
      await generateReport("performance", "7d");
    } catch (error) {
      console.error("Error generating default report:", error);
      setError("Failed to load default report");
    }
  };

  const generateReport = async (reportType?: string, timeRange?: string, format?: string) => {
    const type = reportType || selectedReportType;
    const range = timeRange || selectedTimeRange;
    const fmt = format || selectedFormat;

    setIsGenerating(true);
    setError(null);

    try {
      let response;
      
      if (fmt === "csv" || fmt === "docx") {
        // Handle CSV and Word downloads
        response = await api.post("/api/analytics/generate", {
          reportType: type,
          timeRange: range,
          format: fmt
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const extension = fmt === "docx" ? "docx" : "csv";
          a.href = url;
          a.download = `${type}-report-${format(new Date(), 'yyyy-MM-dd')}.${extension}`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const errorText = await response.text();
          console.error(`${fmt.toUpperCase()} download failed:`, errorText);
          setError(`Failed to download ${fmt.toUpperCase()} report`);
        }
      } else {
        // Handle JSON report
        response = await api.get(`/api/analytics/${type}?timeRange=${range}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.report) {
            setCurrentReport(data.report);
          } else {
            setError(data.error || "Invalid report response");
          }
        } else {
          let errorMsg = "Failed to generate report";
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch (e) {
            console.error("Failed to parse error response:", e);
          }
          setError(errorMsg);
        }
      }
    } catch (error) {
      console.error("Error generating report:", error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateReport = () => {
    generateReport();
  };

  const downloadReport = () => {
    if (currentReport) {
      const dataStr = JSON.stringify(currentReport.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentReport.type}-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const renderPerformanceReport = (data: any) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Average CPU Usage"
          value={`${data.average_cpu}%`}
          trend={data.trends?.cpu_trend}
          icon={Cpu}
          description="Across all monitored devices"
        />
        <MetricCard
          title="Average Memory Usage"
          value={`${data.average_memory}%`}
          trend={data.trends?.memory_trend}
          icon={MemoryStick}
          description="Memory utilization average"
        />
        <MetricCard
          title="Average Disk Usage"
          value={`${data.average_disk}%`}
          trend={data.trends?.disk_trend}
          icon={HardDrive}
          description="Storage utilization average"
        />
        <MetricCard
          title="System Uptime"
          value={`${data.uptime_percentage}%`}
          icon={CheckCircle}
          description="Overall system availability"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Device Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Total Devices</span>
                <Badge variant="outline">{data.device_count}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Critical Alerts</span>
                <Badge variant={data.critical_alerts > 0 ? "destructive" : "secondary"}>
                  {data.critical_alerts}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>System Health</span>
                  <span>{data.uptime_percentage}%</span>
                </div>
                <Progress value={data.uptime_percentage} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resource Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["CPU", "Memory", "Disk"].map((resource) => {
                const trendKey = `${resource.toLowerCase()}_trend` as keyof typeof data.trends;
                const trend = data.trends?.[trendKey] || 0;
                return (
                  <div key={resource} className="flex items-center justify-between">
                    <span className="text-sm">{resource}</span>
                    <div className="flex items-center gap-2">
                      {trend > 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      )}
                      <span className={`text-sm ${trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {trend > 0 ? '+' : ''}{trend}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAvailabilityReport = (data: any) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Devices"
          value={data.total_devices}
          icon={Server}
        />
        <MetricCard
          title="Online Devices"
          value={data.online_devices}
          icon={CheckCircle}
        />
        <MetricCard
          title="Availability"
          value={`${data.availability_percentage}%`}
          icon={Activity}
        />
        <MetricCard
          title="Downtime Incidents"
          value={data.downtime_incidents}
          icon={AlertCircle}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Device Uptime</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.uptime_by_device?.slice(0, 10).map((device: any, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{device.hostname}</span>
                  <span className="text-sm text-muted-foreground">
                    {device.uptime_percentage}%
                  </span>
                </div>
                <Progress value={device.uptime_percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderInventoryReport = (data: any) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Agents"
          value={data.total_agents}
          icon={Server}
        />
        <MetricCard
          title="Avg Disk Usage"
          value={`${data.storage_usage?.avg_disk_usage}%`}
          icon={HardDrive}
        />
        <MetricCard
          title="Avg Memory Usage"
          value={`${data.memory_usage?.avg_memory_usage}%`}
          icon={MemoryStick}
        />
        <MetricCard
          title="Near Capacity"
          value={data.storage_usage?.devices_near_capacity}
          icon={AlertCircle}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Operating Systems</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.by_os || {}).map(([os, count]) => (
                <div key={os} className="flex justify-between items-center">
                  <span className="text-sm">{os}</span>
                  <Badge variant="outline">{count as number}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.by_status || {}).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{status}</span>
                  <Badge 
                    variant={status === "online" ? "default" : "secondary"}
                  >
                    {count as number}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderReportData = () => {
    if (!currentReport) return null;

    switch (currentReport.type) {
      case "performance":
        return renderPerformanceReport(currentReport.data);
      case "availability":
        return renderAvailabilityReport(currentReport.data);
      case "inventory":
        return renderInventoryReport(currentReport.data);
      default:
        return <div>Unknown report type</div>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-muted-foreground">
            Generate and view system performance reports
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="recent">Recent Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Report Type</label>
                  <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Time Period</label>
                  <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeRanges.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Format</label>
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formats.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <BarChart3 className="h-4 w-4 mr-2" />
                    )}
                    Generate Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {currentReport && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{currentReport.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Generated {formatDistanceToNow(new Date(currentReport.generated_at), { addSuffix: true })}
                  </p>
                </div>
                <Button variant="outline" onClick={downloadReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </CardHeader>
              <CardContent>
                {renderReportData()}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">{report.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Generated {formatDistanceToNow(new Date(report.generated_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
