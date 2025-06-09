
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Cpu, 
  MemoryStick, 
  HardDrive,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Activity
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

export default function PerformanceAnalytics() {
  const [selectedDevice, setSelectedDevice] = useState("");

  const { data: devices, isLoading: devicesLoading, isError: devicesError } = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.get("/api/devices").then(res => res.data),
    retry: 1,
    refetchOnWindowFocus: false
  });

  const { data: insights, isError: insightsError } = useQuery({
    queryKey: ["performance-insights", selectedDevice],
    queryFn: () => api.get(`/api/performance/insights/${selectedDevice}`).then(res => res.data),
    enabled: !!selectedDevice,
    retry: 1
  });

  const { data: predictions, isError: predictionsError } = useQuery({
    queryKey: ["performance-predictions", selectedDevice],
    queryFn: () => api.get(`/api/performance/predictions/${selectedDevice}`).then(res => res.data),
    enabled: !!selectedDevice,
    retry: 1
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
          <p className="text-muted-foreground">Monitor system performance, predict capacity needs, and optimize resources</p>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {devices?.filter((d: any) => d.latest_report?.cpu_usage > 80).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Devices &gt; 80% CPU</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Pressure</CardTitle>
            <MemoryStick className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {devices?.filter((d: any) => d.latest_report?.memory_usage > 85).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Devices &gt; 85% RAM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk Space Low</CardTitle>
            <HardDrive className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {devices?.filter((d: any) => d.latest_report?.disk_usage > 90).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Devices &gt; 90% disk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Systems</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {devices?.filter((d: any) => 
                (d.latest_report?.cpu_usage || 0) < 70 && 
                (d.latest_report?.memory_usage || 0) < 70 &&
                (d.latest_report?.disk_usage || 0) < 80
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Optimal performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Device Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Device Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={selectedDevice} onValueChange={setSelectedDevice} disabled={devicesLoading || devicesError}>
              <SelectTrigger>
                <SelectValue placeholder={
                  devicesLoading ? "Loading devices..." : 
                  devicesError ? "Error loading devices" :
                  devices?.length === 0 ? "No devices available" :
                  "Select a device to analyze"
                } />
              </SelectTrigger>
              <SelectContent>
                {devices?.map((device: any) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.hostname} ({device.ip_address})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDevice && (
            <div className="space-y-6">
              {insightsError && (
                <div className="flex items-center gap-2 text-red-600 mb-4">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Error loading performance data. Please try again.</span>
                </div>
              )}
              {/* Application Performance Insights */}
              {insights && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Top Resource Consumers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Top CPU Processes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {insights.top_cpu_consumers?.slice(0, 5).map((process: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="truncate">{process.name}</span>
                              <span className="text-red-600 font-medium">{process.cpu_percent.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Top Memory Processes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {insights.top_memory_consumers?.slice(0, 5).map((process: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="truncate">{process.name}</span>
                              <span className="text-yellow-600 font-medium">{process.memory_percent.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Resource Predictions */}
              {predictions && predictions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Capacity Planning Predictions</h3>
                  <div className="space-y-3">
                    {predictions.map((prediction: any, index: number) => (
                      <Card key={index} className="border-l-4 border-l-orange-500">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              {prediction.resource_type === "cpu" && <Cpu className="w-5 h-5 text-blue-500" />}
                              {prediction.resource_type === "memory" && <MemoryStick className="w-5 h-5 text-yellow-500" />}
                              {prediction.resource_type === "disk" && <HardDrive className="w-5 h-5 text-purple-500" />}
                              <div>
                                <h4 className="font-semibold capitalize">{prediction.resource_type} Capacity Warning</h4>
                                <p className="text-sm text-muted-foreground">
                                  Predicted capacity date: {formatDistanceToNow(new Date(prediction.predicted_capacity_date), { addSuffix: true })}
                                </p>
                                <p className="text-sm mt-1">{prediction.recommendation}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant="outline">
                                {(prediction.confidence_level * 100).toFixed(0)}% confidence
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

              {/* System Load Analysis */}
              {insights && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">System Load Analysis</h3>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{insights.total_processes}</div>
                          <p className="text-sm text-muted-foreground">Total Processes</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {insights.system_load_analysis?.high_cpu_processes || 0}
                          </div>
                          <p className="text-sm text-muted-foreground">High CPU Processes</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {insights.system_load_analysis?.high_memory_processes || 0}
                          </div>
                          <p className="text-sm text-muted-foreground">High Memory Processes</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {insights.total_processes - (insights.system_load_analysis?.high_cpu_processes || 0) - (insights.system_load_analysis?.high_memory_processes || 0)}
                          </div>
                          <p className="text-sm text-muted-foreground">Normal Processes</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {selectedDevice && !insights && !insightsError && (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4" />
              <p>No performance data available for this device</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
