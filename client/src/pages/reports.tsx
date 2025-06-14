import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgents } from "@/hooks/use-agents";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Reports() {
  const { data: agents, isLoading } = useAgents();
  const [reportType, setReportType] = useState("performance");
  const [timePeriod, setTimePeriod] = useState("7d");
  const [format, setFormat] = useState("pdf");

  const handleGenerateReport = async () => {
    try {
      const response = await fetch('/api/analytics/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: reportType,
          period: timePeriod,
          format: format
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const filename = `${reportType}-report-${timePeriod}-${new Date().toISOString().split("T")[0]}.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`Generated ${reportType} report for ${timePeriod} in ${format} format!`);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  const handleDownloadReport = async (reportName: string) => {
    try {
      const response = await fetch('/api/analytics/download-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reportName: reportName,
          format: 'pdf'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const filename = `${reportName.toLowerCase().replace(/\s+/g, "-")}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#201F1E] dark:text-[#F3F2F1] mb-2">Analytics</h1>
        <p className="text-neutral-600">
          Generate and view system performance reports
        </p>
      </div>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Report Type
              </label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">
                    Performance Summary
                  </SelectItem>
                  <SelectItem value="availability">
                    Availability Report
                  </SelectItem>
                  <SelectItem value="alerts">Alert History</SelectItem>
                  <SelectItem value="inventory">System Inventory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Time Period
              </label>
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Format
              </label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full md:w-auto" onClick={handleGenerateReport}>
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownloadReport("Performance Summary")}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Performance Summary
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              CPU, memory, and disk usage trends across all agents
            </p>
            <div className="flex items-center text-sm text-neutral-500">
              <Calendar className="w-4 h-4 mr-1" />
              Weekly report
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="w-8 h-8 text-green-600" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownloadReport("Availability Report")}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Availability Report
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              System uptime and availability metrics
            </p>
            <div className="flex items-center text-sm text-neutral-500">
              <Calendar className="w-4 h-4 mr-1" />
              Monthly report
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-8 h-8 text-purple-600" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownloadReport("System Inventory")}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              System Inventory
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Complete list of all registered agents and their specifications
            </p>
            <div className="flex items-center text-sm text-neutral-500">
              <Calendar className="w-4 h-4 mr-1" />
              On-demand
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center space-x-4">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Performance Summary - March 2024
                  </h4>
                  <p className="text-sm text-neutral-600">
                    Generated 2 hours ago
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleDownloadReport("Performance Summary - March 2024")
                }
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center space-x-4">
                <FileText className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Availability Report - Weekly
                  </h4>
                  <p className="text-sm text-neutral-600">
                    Generated yesterday
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleDownloadReport("Availability Report - Weekly")
                }
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center space-x-4">
                <FileText className="w-5 h-5 text-purple-600" />
                <div>
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    System Inventory - Full Export
                  </h4>
                  <p className="text-sm text-neutral-600">
                    Generated 3 days ago
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleDownloadReport("System Inventory - Full Export")
                }
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}