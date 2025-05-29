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
  BarChart3,
  Download,
  RefreshCw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Device } from "@shared/schema";

interface AgentTabsProps {
  agent: Device;
}

export function AgentTabs({ agent }: AgentTabsProps) {
  const latestReport = agent.latest_report;

  // Parse metrics
  const cpuUsage = latestReport?.cpu_usage ? parseFloat(latestReport.cpu_usage) : 0;
  const memoryUsage = latestReport?.memory_usage ? parseFloat(latestReport.memory_usage) : 0;
  const diskUsage = latestReport?.disk_usage ? Math.round(parseFloat(latestReport.disk_usage) * 100) / 100 : 0;

  // Generate historical data for charts (simulated for demo)
  const generateChartData = (currentValue: number) => {
    const data = [];
    const now = Date.now();
    for (let i = 23; i >= 0; i--) {
      const variation = (Math.random() - 0.5) * 20; // ±10% variation
      const value = Math.max(0, Math.min(100, currentValue + variation));
      data.push({
        time: new Date(now - i * 60 * 60 * 1000).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        value: Math.round(value)
      });
    }
    return data;
  };

  const cpuChartData = generateChartData(cpuUsage);
  const memoryChartData = generateChartData(memoryUsage);

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
        <TabsTrigger value="network">Network</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-600">Hostname:</span>
                  <span className="ml-2 font-medium">{agent.hostname}</span>
                </div>
                <div>
                  <span className="text-neutral-600">Status:</span>
                  <Badge 
                    variant={agent.status === 'online' ? 'default' : 'destructive'}
                    className="ml-2"
                  >
                    {agent.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-neutral-600">OS:</span>
                  <span className="ml-2 font-medium">
                    {latestReport?.raw_data?.system?.os || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-600">Architecture:</span>
                  <span className="ml-2 font-medium">
                    {latestReport?.raw_data?.system?.architecture || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-600">User:</span>
                  <span className="ml-2 font-medium">
                    {agent.assigned_user?.split("@")[0] || agent.assigned_user || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-600">Last Report:</span>
                  <span className="ml-2 font-medium">
                    {latestReport?.reported_at 
                      ? formatDistanceToNow(new Date(latestReport.reported_at), { addSuffix: true })
                      : 'Never'
                    }
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
                <span>Current Metrics</span>
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
                    <span className={`text-sm font-medium ${
                      cpuUsage >= 90 ? "text-red-600" : 
                      cpuUsage >= 70 ? "text-yellow-600" : "text-green-600"
                    }`}>
                      {Math.round(cpuUsage)}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        cpuUsage >= 90 ? "bg-red-500" : 
                        cpuUsage >= 70 ? "bg-yellow-500" : "bg-green-500"
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
                    <span className={`text-sm font-medium ${
                      memoryUsage >= 90 ? "text-red-600" : 
                      memoryUsage >= 70 ? "text-yellow-600" : "text-green-600"
                    }`}>
                      {Math.round(memoryUsage)}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        memoryUsage >= 90 ? "bg-red-500" : 
                        memoryUsage >= 70 ? "bg-yellow-500" : "bg-green-500"
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
                    <span className={`text-sm font-medium ${
                      diskUsage >= 90 ? "text-red-600" : 
                      diskUsage >= 70 ? "text-yellow-600" : "text-green-600"
                    }`}>
                      {diskUsage}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        diskUsage >= 90 ? "bg-red-500" : 
                        diskUsage >= 70 ? "bg-yellow-500" : "bg-green-500"
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

      <TabsContent value="performance" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-blue-600" />
                <span>CPU Usage (24h)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex flex-col">
                <div className="flex-1 relative">
                  <svg className="w-full h-full" viewBox="0 0 400 200">
                    <defs>
                      <linearGradient id="cpuGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1"/>
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={200 - (y * 2)}
                        x2="400"
                        y2={200 - (y * 2)}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                        opacity="0.5"
                      />
                    ))}

                    {/* Chart line */}
                    <polyline
                      fill="url(#cpuGradient)"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      points={cpuChartData.map((point, index) => 
                        `${(index / (cpuChartData.length - 1)) * 400},${200 - (point.value * 2)}`
                      ).join(' ')}
                    />
                  </svg>
                </div>

                {/* Current value */}
                <div className="mt-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(cpuUsage)}%
                  </div>
                  <div className="text-sm text-neutral-600">Current CPU Usage</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Memory Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MemoryStick className="w-5 h-5 text-purple-600" />
                <span>Memory Usage (24h)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex flex-col">
                <div className="flex-1 relative">
                  <svg className="w-full h-full" viewBox="0 0 400 200">
                    <defs>
                      <linearGradient id="memoryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1"/>
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={200 - (y * 2)}
                        x2="400"
                        y2={200 - (y * 2)}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                        opacity="0.5"
                      />
                    ))}

                    {/* Chart line */}
                    <polyline
                      fill="url(#memoryGradient)"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                      points={memoryChartData.map((point, index) => 
                        `${(index / (memoryChartData.length - 1)) * 400},${200 - (point.value * 2)}`
                      ).join(' ')}
                    />
                  </svg>
                </div>

                {/* Current value */}
                <div className="mt-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(memoryUsage)}%
                  </div>
                  <div className="text-sm text-neutral-600">Current Memory Usage</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {Math.round(cpuUsage)}%
                </div>
                <div className="text-sm text-neutral-600">Avg CPU (24h)</div>
              </div>
              <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {Math.round(memoryUsage)}%
                </div>
                <div className="text-sm text-neutral-600">Avg Memory (24h)</div>
              </div>
              <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {agent.status === 'online' ? '99.9%' : '95.2%'}
                </div>
                <div className="text-sm text-neutral-600">Uptime (24h)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="network" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Network className="w-5 h-5" />
              <span>Network Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-neutral-600">
              Network monitoring and statistics
            </div>
            <div className="h-48 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Network className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
                <p className="text-neutral-500">Network Chart</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reports" className="space-y-6">
        <div className="space-y-6">
          {/* Actions */}
          <div className="flex items-center space-x-4">
            <Button className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Data</span>
            </Button>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-500">Real-time performance chart</p>
                  <p className="text-sm text-neutral-400">CPU, Memory, Disk over last 24h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Raw Data Preview */}
          {latestReport?.raw_data && (
            <Card>
              <CardHeader>
                <CardTitle>Latest Report Data</CardTitle>
            </CardHeader>
              <CardContent>
                <div className="bg-neutral-900 rounded-lg p-4 text-sm font-mono text-green-400 max-h-64 overflow-y-auto">
                  <pre>{JSON.stringify(latestReport.raw_data, null, 2)}</pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}