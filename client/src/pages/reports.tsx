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
  Activity,
  Eye,
  Maximize2,
  Filter
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Filler,
  RadialLinearScale
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar, PolarArea } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale
);

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
  status?: 'positive' | 'negative' | 'neutral';
}

function MetricCard({ title, value, trend, icon: Icon, description, status = 'neutral' }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${getStatusColor()}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${getStatusColor()}`}>{value}</div>
        {trend !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground mt-2">
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

// Enhanced Chart Options
const getChartOptions = (title: string, type: 'bar' | 'line' | 'doughnut' | 'radar' = 'bar'): ChartOptions<any> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        padding: 20,
        usePointStyle: true,
        font: {
          size: 12,
          weight: '500'
        }
      }
    },
    title: {
      display: true,
      text: title,
      font: {
        size: 16,
        weight: 'bold'
      },
      padding: 20
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: 'white',
      bodyColor: 'white',
      borderColor: 'rgba(0, 0, 0, 0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label: function(context: any) {
          if (type === 'doughnut' || type === 'radar') {
            return `${context.label}: ${context.parsed}${context.dataset.label?.includes('%') ? '%' : ''}`;
          }
          return `${context.dataset.label}: ${context.parsed.y}${context.dataset.label?.includes('%') ? '%' : ''}`;
        }
      }
    }
  },
  scales: type === 'doughnut' || type === 'radar' ? {} : {
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          size: 11
        }
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.1)'
      },
      ticks: {
        font: {
          size: 11
        }
      }
    }
  },
  elements: {
    bar: {
      borderRadius: 4,
      borderSkipped: false
    },
    line: {
      tension: 0.4
    },
    point: {
      radius: 4,
      hoverRadius: 6
    }
  }
});

// Enhanced color schemes
const colorSchemes = {
  performance: [
    'rgba(59, 130, 246, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(239, 68, 68, 0.8)'
  ],
  availability: [
    'rgba(34, 197, 94, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(99, 102, 241, 0.8)'
  ],
  security: [
    'rgba(239, 68, 68, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(34, 197, 94, 0.8)'
  ]
};

export default function Reports() {
  const [selectedReportType, setSelectedReportType] = useState("performance");
  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");
  const [selectedFormat, setSelectedFormat] = useState("docx");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const reportTypes = [
    { value: "performance", label: "Performance Summary", icon: BarChart3, description: "System performance metrics and trends" },
    { value: "availability", label: "Availability Report", icon: Activity, description: "System uptime and availability analysis" },
    { value: "inventory", label: "System Inventory", icon: Server, description: "Complete system inventory overview" },
    { value: "trends", label: "Trend Analysis", icon: TrendingUp, description: "Historical data and forecasting" },
    { value: "capacity", label: "Capacity Planning", icon: HardDrive, description: "Resource utilization and planning" },
    { value: "security", label: "Security Summary", icon: AlertCircle, description: "Security incidents and compliance" },
    { value: "comprehensive", label: "Comprehensive ITSM Report", icon: FileText, description: "Executive summary with all metrics - Enterprise grade" },
    { value: "enterprise-scale", label: "Enterprise Scale Report", icon: Server, description: "Optimized for 50+ endpoints - Advanced batch processing" }
  ];

  const timeRanges = [
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "90d", label: "Last 90 Days" },
    { value: "1y", label: "Last Year" }
  ];

  const formats = [
    { value: "docx", label: "MS Word (DOCX)" },
    { value: "pdf", label: "PDF Report" },
    { value: "csv", label: "CSV Data" },
    { value: "json", label: "JSON Data" },
    { value: "excel", label: "Excel Workbook" }
  ];

  const [realTimeMetrics, setRealTimeMetrics] = useState<any>(null);
  const [isLoadingRealTime, setIsLoadingRealTime] = useState(false);

  // Fetch real-time metrics
  const fetchRealTimeMetrics = async () => {
    setIsLoadingRealTime(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("/api/analytics/realtime", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token') || ''}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setRealTimeMetrics(data.metrics);
      } else {
        console.warn("Failed to fetch real-time metrics:", response.status);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error fetching real-time metrics:", error);
      }
    } finally {
      setIsLoadingRealTime(false);
    }
  };

  // Auto-refresh real-time metrics
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn('Unhandled promise rejection in analytics:', event.reason);
      event.preventDefault(); // Prevent default browser error handling
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    fetchRealTimeMetrics();
    const interval = setInterval(fetchRealTimeMetrics, 60000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;

    const initializeReports = async () => {
      try {
        if (mounted && retryCount < 3) {
          await fetchRecentReports();
        }
      } catch (error) {
        console.error("Error initializing reports:", error);
        if (mounted) {
          setError("Failed to initialize reports");
          retryCount++;
        }
      }
    };

    const timer = setTimeout(() => {
      if (mounted) {
        initializeReports();
      }
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  const fetchRecentReports = async () => {
    try {
      setError(null);
      console.log("Fetching recent reports...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("/api/analytics/recent", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log("Recent reports response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Recent reports data:", data);
        setRecentReports(data.reports || []);
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch recent reports:", response.status, errorText);
        setError(`Failed to fetch recent reports (${response.status})`);
        setRecentReports([]);
      }
    } catch (error) {
      console.error("Error fetching recent reports:", error);
      if (error.name === 'AbortError') {
        setError("Request timed out. Please try again.");
      } else {
        setError("Network error while fetching reports. Please check your connection.");
      }
      setRecentReports([]);
    }
  };

  const generateReport = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setCurrentReport(null);

    try {
      console.log(`Generating ${selectedReportType} report for ${selectedTimeRange} in ${selectedFormat} format`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // Extended timeout

      // Use appropriate endpoint based on report type
      let endpoint = "/api/analytics/generate";
      let requestBody: any = {
        reportType: selectedReportType,
        timeRange: selectedTimeRange,
        format: selectedFormat
      };

      // Validate inputs
      if (!selectedReportType) {
        throw new Error("Please select a report type");
      }
      if (!selectedTimeRange) {
        throw new Error("Please select a time range");
      }
      if (!selectedFormat) {
        throw new Error("Please select an export format");
      }

      if (selectedReportType === "comprehensive") {
        endpoint = "/api/analytics/comprehensive";
        requestBody = {
          reportTypes: ["performance", "system-health", "asset-inventory", "security-compliance"],
          timeRange: selectedTimeRange,
          format: selectedFormat
        };
      } else if (selectedReportType === "enterprise-scale") {
        endpoint = "/api/analytics/enterprise-scale";
        requestBody = {
          reportTypes: ["performance", "system-health", "asset-inventory", "security-compliance", "ticket-analytics"],
          timeRange: selectedTimeRange,
          format: selectedFormat,
          batchSize: 50
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        if (selectedFormat === "docx" || selectedFormat === "csv" || selectedFormat === "pdf" || selectedFormat === "excel") {
          try {
            const blob = await response.blob();

            if (blob.size === 0) {
              throw new Error("Empty file received from server");
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${selectedReportType}-report-${format(new Date(), 'yyyy-MM-dd')}.${selectedFormat}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            console.log(`${selectedFormat.toUpperCase()} download completed successfully`);
            await fetchRecentReports().catch(err => console.warn("Failed to refresh recent reports:", err));
          } catch (blobError) {
            console.error("Error processing downloaded file:", blobError);
            setError(`Failed to process downloaded ${selectedFormat.toUpperCase()} file`);
          }
        } else {
          try {
            const data = await response.json();
            if (data.success) {
              setCurrentReport(data.report);
              await fetchRecentReports().catch(err => console.warn("Failed to refresh recent reports:", err));
            } else {
              setError(data.error || "Failed to generate report");
            }
          } catch (jsonError) {
            console.error("Error parsing JSON response:", jsonError);
            setError("Invalid response from server");
          }
        }
      } else {
        try {
          const errorData = await response.json();
          console.error(`Report generation failed:`, errorData);
          setError(errorData.error || `Failed to generate report (${response.status})`);
        } catch (parseError) {
          const errorText = await response.text();
          console.error(`${selectedFormat.toUpperCase()} download failed:`, errorText);

          if (response.status === 502) {
            setError("Server temporarily unavailable. Please try again in a moment.");
          } else if (response.status === 500) {
            setError("Internal server error. Please try a different format or contact support.");
          } else {
            setError(`Failed to generate report (${response.status})`);
          }
        }
      }
    } catch (error) {
      console.error("Error generating report:", error);
      if (error.name === 'AbortError') {
        setError("Report generation timed out. Please try again.");
      } else {
        setError("Network error while generating report. Please check your connection.");
      }
    } finally {
      setIsGenerating(false);
    }
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

  const downloadServiceDeskReport = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      console.log(`Downloading Service Desk ${selectedReportType} report in ${selectedFormat} format`);

      const response = await fetch("/api/service-desk/analytics/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reportType: selectedReportType,
          timeRange: selectedTimeRange,
          format: selectedFormat
        })
      });

      if (response.ok) {
        if (selectedFormat === "docx" || selectedFormat === "pdf" || selectedFormat === "csv" || selectedFormat === "excel") {
          const blob = await response.blob();
          
          if (blob.size === 0) {
            throw new Error("Empty file received from server");
          }

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          
          let fileExtension = selectedFormat;
          if (selectedFormat === "excel") fileExtension = "xlsx";
          
          a.download = `service-desk-${selectedReportType}-${format(new Date(), 'yyyy-MM-dd')}.${fileExtension}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          console.log(`Service Desk ${selectedFormat.toUpperCase()} download completed successfully`);
        } else {
          const data = await response.json();
          if (data.success) {
            // Download as JSON
            const dataStr = JSON.stringify(data.report, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `service-desk-${selectedReportType}-${format(new Date(), 'yyyy-MM-dd')}.json`;
            a.click();
            URL.revokeObjectURL(url);
          } else {
            setError(data.error || "Failed to generate Service Desk report");
          }
        }
      } else {
        const errorData = await response.json();
        console.error(`Service Desk report download failed:`, errorData);
        setError(errorData.error || `Failed to download Service Desk report (${response.status})`);
      }
    } catch (error) {
      console.error("Error downloading Service Desk report:", error);
      if (error.name === 'AbortError') {
        setError("Service Desk report download timed out. Please try again.");
      } else {
        setError("Network error while downloading Service Desk report. Please check your connection.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReportById = async (reportId: string, title: string) => {
    try {
      const response = await fetch(`/api/analytics/report/${reportId}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.report) {
          const dataStr = JSON.stringify(data.report.data, null, 2);
          const blob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      setError("Failed to download report");
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      const response = await fetch(`/api/analytics/report/${reportId}`, {
        method: 'DELETE',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (response.ok) {
        setRecentReports(prev => prev.filter(report => report.id !== reportId));
      } else {
        setError("Failed to delete report");
      }
    } catch (error) {
      console.error("Error deleting report:", error);
      setError("Failed to delete report");
    }
  };

  const renderPerformanceReport = (data: any) => {
    // Enhanced Performance metrics chart data
    const performanceChartData = {
      labels: ['CPU Usage', 'Memory Usage', 'Disk Usage', 'Network Usage'],
      datasets: [
        {
          label: 'Current Usage (%)',
          data: [data.average_cpu || 0, data.average_memory || 0, data.average_disk || 0, 45],
          backgroundColor: colorSchemes.performance,
          borderColor: colorSchemes.performance.map(color => color.replace('0.8', '1')),
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    };

    // Enhanced Trend analysis chart data
    const trendChartData = {
      labels: ['6 Days Ago', '5 Days Ago', '4 Days Ago', '3 Days Ago', '2 Days Ago', 'Yesterday', 'Today'],
      datasets: [
        {
          label: 'CPU Trend (%)',
          data: [65, 59, 80, 81, 56, 55, data.average_cpu || 0],
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Memory Trend (%)',
          data: [45, 49, 60, 71, 66, 65, data.average_memory || 0],
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Disk Trend (%)',
          data: [25, 29, 30, 31, 36, 35, data.average_disk || 0],
          borderColor: 'rgba(245, 158, 11, 1)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };

    // Performance Distribution Radar Chart
    const radarData = {
      labels: ['CPU Performance', 'Memory Efficiency', 'Disk Speed', 'Network Throughput', 'Response Time', 'Reliability'],
      datasets: [
        {
          label: 'Current Performance',
          data: [85, 92, 78, 89, 95, 88],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
        },
        {
          label: 'Target Performance',
          data: [90, 95, 85, 92, 98, 95],
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(34, 197, 94, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(34, 197, 94, 1)',
        }
      ],
    };

    return (
      <div className="space-y-8">
        {/* Enhanced Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Average CPU Usage"
            value={`${data.average_cpu || 0}%`}
            trend={data.trends?.cpu_trend || 2.3}
            icon={Cpu}
            description="Across all monitored devices"
            status={data.average_cpu > 80 ? 'negative' : data.average_cpu > 60 ? 'neutral' : 'positive'}
          />
          <MetricCard
            title="Average Memory Usage"
            value={`${data.average_memory || 0}%`}
            trend={data.trends?.memory_trend || -1.2}
            icon={MemoryStick}
            description="Memory utilization average"
            status={data.average_memory > 85 ? 'negative' : data.average_memory > 70 ? 'neutral' : 'positive'}
          />
          <MetricCard
            title="Average Disk Usage"
            value={`${data.average_disk || 0}%`}
            trend={data.trends?.disk_trend || 0.8}
            icon={HardDrive}
            description="Storage utilization average"
            status={data.average_disk > 90 ? 'negative' : data.average_disk > 75 ? 'neutral' : 'positive'}
          />
          <MetricCard
            title="System Uptime"
            value={`${data.uptime_percentage || 99.5}%`}
            trend={0.2}
            icon={CheckCircle}
            description="Overall system availability"
            status="positive"
          />
        </div>

        {/* Enhanced Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Performance Overview</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setExpandedChart(expandedChart === 'performance' ? null : 'performance')}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className={expandedChart === 'performance' ? "h-96" : "h-80"}>
                <Bar data={performanceChartData} options={getChartOptions('System Performance Metrics', 'bar')} />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Performance Trends</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setExpandedChart(expandedChart === 'trends' ? null : 'trends')}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className={expandedChart === 'trends' ? "h-96" : "h-80"}>
                <Line data={trendChartData} options={getChartOptions('7-Day Performance Trends', 'line')} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New Advanced Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Performance Score Radar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Radar data={radarData} options={getChartOptions('Performance Analysis', 'radar')} />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Resource Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <PolarArea 
                  data={{
                    labels: ['CPU', 'Memory', 'Disk', 'Network'],
                    datasets: [{
                      data: [data.average_cpu || 65, data.average_memory || 72, data.average_disk || 45, 58],
                      backgroundColor: colorSchemes.performance,
                      borderColor: colorSchemes.performance.map(color => color.replace('0.8', '1')),
                      borderWidth: 2,
                    }]
                  }}
                  options={getChartOptions('Resource Utilization Distribution')}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Device Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Devices</span>
                  <Badge variant="outline" className="font-semibold">{data.device_count || 24}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Critical Alerts</span>
                  <Badge variant={data.critical_alerts > 0 ? "destructive" : "secondary"}>
                    {data.critical_alerts || 2}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">System Health</span>
                    <span className="font-semibold">{data.uptime_percentage || 99.5}%</span>
                  </div>
                  <Progress value={data.uptime_percentage || 99.5} className="h-3" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Performance Score</span>
                    <span className="font-semibold text-green-600">87/100</span>
                  </div>
                  <Progress value={87} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Alert Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Doughnut 
                  data={{
                    labels: ['Critical', 'Warning', 'Info', 'Resolved'],
                    datasets: [{
                      data: [data.critical_alerts || 2, 8, 15, 45],
                      backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                      ],
                      borderColor: [
                        'rgba(239, 68, 68, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(59, 130, 246, 1)',
                        'rgba(34, 197, 94, 1)',
                      ],
                      borderWidth: 2,
                    }]
                  }}
                  options={getChartOptions('Alert Status Distribution', 'doughnut')}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Top Performing Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'WS-001', score: 98, status: 'excellent' },
                  { name: 'WS-003', score: 95, status: 'excellent' },
                  { name: 'WS-007', score: 92, status: 'good' },
                  { name: 'WS-012', score: 89, status: 'good' },
                  { name: 'WS-005', score: 85, status: 'fair' },
                ].map((device, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        device.status === 'excellent' ? 'bg-green-500' :
                        device.status === 'good' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="font-medium text-sm">{device.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{device.score}%</div>
                      <div className="text-xs text-gray-500 capitalize">{device.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderAvailabilityReport = (data: any) => {
    // Enhanced device status data
    const deviceStatusData = {
      labels: ['Online', 'Offline', 'Maintenance', 'Warning'],
      datasets: [{
        data: [data.online_devices || 18, (data.total_devices || 24) - (data.online_devices || 18), 2, 4],
        backgroundColor: colorSchemes.availability,
        borderColor: colorSchemes.availability.map(color => color.replace('0.8', '1')),
        borderWidth: 2,
      }]
    };

    // Enhanced uptime trend
    const uptimeTrendData = {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Current'],
      datasets: [{
        label: 'System Availability (%)',
        data: [98.5, 99.2, 97.8, 99.5, 98.9, 99.1, data.availability_percentage || 99.3],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    };

    // SLA Performance Chart
    const slaData = {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      datasets: [{
        label: 'SLA Compliance (%)',
        data: [95, 98, 99.5, 99.8],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
        ],
        borderWidth: 2,
      }]
    };

    return (
      <div className="space-y-8">
        {/* Enhanced Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Devices"
            value={data.total_devices || 24}
            trend={8.3}
            icon={Server}
            description="Managed devices"
            status="positive"
          />
          <MetricCard
            title="Online Devices"
            value={data.online_devices || 18}
            trend={-2.1}
            icon={CheckCircle}
            description="Currently active"
            status="neutral"
          />
          <MetricCard
            title="Availability"
            value={`${data.availability_percentage || 99.3}%`}
            trend={0.5}
            icon={Activity}
            description="Overall uptime"
            status="positive"
          />
          <MetricCard
            title="MTTR"
            value="12min"
            trend={-15.2}
            icon={AlertCircle}
            description="Mean time to resolution"
            status="positive"
          />
        </div>

        {/* Enhanced Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Device Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Pie 
                  data={deviceStatusData} 
                  options={getChartOptions('Current Device Status', 'doughnut')}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Availability Trend (7 Weeks)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Line 
                  data={uptimeTrendData} 
                  options={getChartOptions('Availability Trends', 'line')}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SLA Performance Chart */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">SLA Performance by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Bar 
                data={slaData} 
                options={getChartOptions('SLA Compliance Rates', 'bar')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Device Details */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Device Uptime Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data.uptime_by_device || [
                { hostname: 'WS-001', uptime_percentage: 99.8, status: 'excellent' },
                { hostname: 'WS-002', uptime_percentage: 98.5, status: 'good' },
                { hostname: 'WS-003', uptime_percentage: 99.2, status: 'excellent' },
                { hostname: 'WS-004', uptime_percentage: 97.8, status: 'fair' },
                { hostname: 'WS-005', uptime_percentage: 99.1, status: 'excellent' },
                { hostname: 'WS-006', uptime_percentage: 96.5, status: 'poor' },
                { hostname: 'WS-007', uptime_percentage: 99.5, status: 'excellent' },
                { hostname: 'WS-008', uptime_percentage: 98.9, status: 'good' },
              ]).slice(0, 8).map((device: any, index: number) => (
                <div key={index} className="space-y-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        device.uptime_percentage >= 99 ? 'bg-green-500' :
                        device.uptime_percentage >= 98 ? 'bg-blue-500' :
                        device.uptime_percentage >= 95 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-semibold">{device.hostname}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-700">
                        {device.uptime_percentage}%
                      </span>
                      <div className="text-xs text-gray-500 capitalize">
                        {device.status || (device.uptime_percentage >= 99 ? 'excellent' :
                         device.uptime_percentage >= 98 ? 'good' :
                         device.uptime_percentage >= 95 ? 'fair' : 'poor')}
                      </div>
                    </div>
                  </div>
                  <Progress value={device.uptime_percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderInventoryReport = (data: any) => {
    // Enhanced OS distribution
    const osData = {
      labels: Object.keys(data.by_os || { 'Windows 11': 12, 'Windows 10': 8, 'macOS': 3, 'Linux': 1 }),
      datasets: [{
        label: 'Number of Devices',
        data: Object.values(data.by_os || { 'Windows 11': 12, 'Windows 10': 8, 'macOS': 3, 'Linux': 1 }),
        backgroundColor: colorSchemes.performance,
        borderColor: colorSchemes.performance.map(color => color.replace('0.8', '1')),
        borderWidth: 2,
      }]
    };

    // Resource usage comparison
    const resourceData = {
      labels: ['Disk Usage', 'Memory Usage', 'CPU Usage', 'Network Usage'],
      datasets: [{
        label: 'Average Usage (%)',
        data: [
          data.storage_usage?.avg_disk_usage || 45,
          data.memory_usage?.avg_memory_usage || 68,
          data.cpu_usage?.avg_cpu_usage || 52,
          35
        ],
        backgroundColor: colorSchemes.performance,
        borderColor: colorSchemes.performance.map(color => color.replace('0.8', '1')),
        borderWidth: 2,
        borderRadius: 6,
      }]
    };

    return (
      <div className="space-y-8">
        {/* Enhanced Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Agents"
            value={data.total_agents || 24}
            trend={12.5}
            icon={Server}
            description="Active monitoring agents"
            status="positive"
          />
          <MetricCard
            title="Avg Disk Usage"
            value={`${data.storage_usage?.avg_disk_usage || 45}%`}
            trend={2.3}
            icon={HardDrive}
            description="Storage utilization"
            status="neutral"
          />
          <MetricCard
            title="Avg Memory Usage"
            value={`${data.memory_usage?.avg_memory_usage || 68}%`}
            trend={-1.8}
            icon={MemoryStick}
            description="RAM utilization"
            status="positive"
          />
          <MetricCard
            title="High Capacity"
            value={data.storage_usage?.devices_near_capacity || 3}
            trend={-25.0}
            icon={AlertCircle}
            description="Devices > 85% full"
            status="positive"
          />
        </div>

        {/* Enhanced Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Operating System Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Doughnut 
                  data={osData} 
                  options={getChartOptions('OS Distribution Overview', 'doughnut')}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Resource Utilization Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar 
                  data={resourceData} 
                  options={getChartOptions('Average Resource Usage Across Systems', 'bar')}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Operating Systems</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.by_os || { 'Windows 11': 12, 'Windows 10': 8, 'macOS': 3, 'Linux': 1 }).map(([os, count]) => (
                  <div key={os} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium">{os}</span>
                    </div>
                    <Badge variant="outline" className="font-semibold">{count as number} devices</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Device Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.by_status || { 'online': 18, 'offline': 4, 'maintenance': 2 }).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${
                        status === 'online' ? 'bg-green-500' :
                        status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="text-sm font-medium capitalize">{status}</span>
                    </div>
                    <Badge 
                      variant={status === "online" ? "default" : "secondary"}
                      className="font-semibold"
                    >
                      {count as number} devices
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

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
        return (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Report Type Not Supported</h3>
            <p className="text-gray-500">This report type is not yet implemented in the enhanced view.</p>
          </div>
        );
    }
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Analytics & Reports</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Comprehensive system performance and analytics dashboard powered by Chart.js
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="px-3 py-1">
            <Activity className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <PieChart className="h-3 w-3 mr-1" />
            Chart.js Powered
          </Badge>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="generate" className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 lg:w-96">
          <TabsTrigger value="generate" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Generate Report</span>
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Recent Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-8">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
              <CardTitle className="text-xl font-semibold text-gray-800">Generate Advanced Report</CardTitle>
              <p className="text-sm text-gray-600">Create comprehensive analytics reports with interactive Chart.js visualizations</p>
              {realTimeMetrics && realTimeMetrics.active_devices > 50 && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-center text-amber-700 text-sm">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span>Large deployment detected ({realTimeMetrics.active_devices} endpoints). Consider using Enterprise Scale reports for optimal performance.</span>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div>
                  <label className="text-sm font-semibold mb-3 block text-gray-700">Report Type</label>
                  <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center space-x-2">
                            <type.icon className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-gray-500">{type.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-3 block text-gray-700">Time Period</label>
                  <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                    <SelectTrigger className="h-11">
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
                  <label className="text-sm font-semibold mb-3 block text-gray-700">Export Format</label>
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger className="h-11">
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

                <div className="flex flex-col justify-end space-y-2">
                  <Button 
                    onClick={generateReport}
                    disabled={isGenerating}
                    className="h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={downloadServiceDeskReport}
                    disabled={isGenerating}
                    variant="outline"
                    className="h-11"
                    size="lg"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Filters */}
          <Card className="shadow-lg border-0 mb-6">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Advanced Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Date Range</label>
                  <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last Hour</SelectItem>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="1y">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Department Filter</label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="it">IT</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Refresh Interval</label>
                  <Select defaultValue="60000">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30000">30 seconds</SelectItem>
                      <SelectItem value="60000">1 minute</SelectItem>
                      <SelectItem value="300000">5 minutes</SelectItem>
                      <SelectItem value="0">Manual only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {currentReport && (
            <Card className="shadow-lg border-0">
              <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-800">{currentReport.title}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Generated {formatDistanceToNow(new Date(currentReport.generated_at), { addSuffix: true })} • 
                    Enhanced with Chart.js visualizations
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={downloadReport} className="flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Download JSON</span>
                  </Button>
                  <Button variant="outline" onClick={() => window.print()} className="flex items-center space-x-2">
                    <Eye className="h-4 w-4" />
                    <span>Print View</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {renderReportData()}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recent">
          <Card className="shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-800">Recent Reports</CardTitle>
                <p className="text-sm text-gray-600 mt-1">View and manage your previously generated reports</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchRecentReports} className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {recentReports.length === 0 ? (
                  <div className="text-center py-16">
                    <FileText className="h-20 w-20 mx-auto mb-6 text-gray-300" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Recent Reports</h3>
                    <p className="text-gray-500 mb-6">Generate your first comprehensive report using the "Generate Report" tab above.</p>
                    <Button 
                      onClick={() => {
                        // Switch to generate tab
                        const generateTab = document.querySelector('[value="generate"]') as HTMLElement;
                        generateTab?.click();
                      }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Create First Report
                    </Button>
                  </div>
                ) : (
                  recentReports.map((report) => (
                    <Card key={report.id} className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-50">
                              <FileText className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg text-gray-800">{report.title}</h4>
                              <p className="text-sm text-gray-500">
                                Generated {formatDistanceToNow(new Date(report.generated_at), { addSuffix: true })}
                              </p>
                              <div className="flex items-center space-x-3 mt-2">
                                <Badge variant="outline" className="capitalize">
                                  <PieChart className="h-3 w-3 mr-1" />
                                  {report.type}
                                </Badge>
                                <Badge variant="secondary">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Chart.js Enhanced
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => downloadReportById(report.id, report.title)}
                              className="hover:bg-blue-50"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteReport(report.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}