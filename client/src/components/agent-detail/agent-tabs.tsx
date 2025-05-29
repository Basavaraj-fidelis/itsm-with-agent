
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
  Info
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

  // Parse raw data for detailed information
  const rawData = latestReport?.raw_data ? (typeof latestReport.raw_data === 'string' ? JSON.parse(latestReport.raw_data) : latestReport.raw_data) : {};
  
  // Extract system information
  const systemInfo = rawData.system_info || rawData.hardware || rawData.os_info || {};
  const networkInfo = rawData.network || rawData.network_info || {};
  const storageInfo = rawData.storage || rawData.disk_info || {};
  const processInfo = rawData.processes || rawData.running_processes || [];
  const softwareInfo = rawData.software || rawData.installed_software || [];

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
                  <span className="font-medium">{agent.hostname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Status:</span>
                  <Badge variant={agent.status === 'online' ? 'default' : 'destructive'}>
                    {agent.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Operating System:</span>
                  <span className="font-medium">{agent.os_name || systemInfo.name || systemInfo.platform || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">OS Version:</span>
                  <span className="font-medium">{agent.os_version || systemInfo.version || systemInfo.release || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Architecture:</span>
                  <span className="font-medium">{systemInfo.architecture || systemInfo.arch || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">IP Address:</span>
                  <span className="font-medium">{agent.ip_address || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Assigned User:</span>
                  <span className="font-medium">
                    {agent.assigned_user?.split("@")[0] || agent.assigned_user || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Last Report:</span>
                  <span className="font-medium">
                    {latestReport?.collected_at 
                      ? formatDistanceToNow(new Date(latestReport.collected_at), { addSuffix: true })
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
                    <span className={`text-sm font-medium ${
                      cpuUsage >= 85 ? "text-red-600" : 
                      cpuUsage >= 75 ? "text-yellow-600" : "text-green-600"
                    }`}>
                      {Math.round(cpuUsage)}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        cpuUsage >= 85 ? "bg-red-500" : 
                        cpuUsage >= 75 ? "bg-yellow-500" : "bg-green-500"
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
                      memoryUsage >= 85 ? "text-red-600" : 
                      memoryUsage >= 75 ? "text-yellow-600" : "text-green-600"
                    }`}>
                      {Math.round(memoryUsage)}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        memoryUsage >= 85 ? "bg-red-500" : 
                        memoryUsage >= 75 ? "bg-yellow-500" : "bg-green-500"
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
                      diskUsage >= 85 ? "text-red-600" : 
                      diskUsage >= 75 ? "text-yellow-600" : "text-green-600"
                    }`}>
                      {diskUsage}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        diskUsage >= 85 ? "bg-red-500" : 
                        diskUsage >= 75 ? "bg-yellow-500" : "bg-green-500"
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cpu className="w-5 h-5" />
              <span>Hardware Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Processor</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Model:</span>
                    <span className="font-medium">{systemInfo.processor || systemInfo.cpu_model || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Cores:</span>
                    <span className="font-medium">{systemInfo.cpu_cores || systemInfo.cores || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Architecture:</span>
                    <span className="font-medium">{systemInfo.architecture || systemInfo.arch || 'Unknown'}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Memory</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Total RAM:</span>
                    <span className="font-medium">{systemInfo.total_memory || systemInfo.memory_total || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Available:</span>
                    <span className="font-medium">{systemInfo.available_memory || systemInfo.memory_available || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Usage:</span>
                    <span className="font-medium">{Math.round(memoryUsage)}%</span>
                  </div>
                </div>
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
              <span>Network Interfaces</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(networkInfo).length > 0 ? (
                Object.entries(networkInfo).map(([interfaceName, details]) => (
                  <div key={interfaceName} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Wifi className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100">{interfaceName}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {typeof details === 'object' && details !== null ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">IP Address:</span>
                            <span className="font-medium">{(details as any).ip_address || (details as any).ip || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">MAC Address:</span>
                            <span className="font-medium">{(details as any).mac_address || (details as any).mac || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Status:</span>
                            <span className="font-medium">{(details as any).status || 'Unknown'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Bytes Sent:</span>
                            <span className="font-medium">{(details as any).bytes_sent || 'N/A'}</span>
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
                  <Network className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                  <p>No network interface data available</p>
                </div>
              )}
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
              {Array.isArray(storageInfo) ? (
                storageInfo.map((drive, index) => (
                  <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <HardDrive className="w-4 h-4 text-orange-600" />
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                        {drive.drive || drive.device || `Drive ${index + 1}`}
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Total Size:</span>
                        <span className="font-medium">{drive.total_size || drive.size || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Used:</span>
                        <span className="font-medium">{drive.used || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Free:</span>
                        <span className="font-medium">{drive.free || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Usage:</span>
                        <span className={`font-medium ${
                          (drive.usage_percent || 0) >= 85 ? "text-red-600" : 
                          (drive.usage_percent || 0) >= 75 ? "text-yellow-600" : "text-green-600"
                        }`}>
                          {drive.usage_percent || drive.percent || 'Unknown'}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Type:</span>
                        <span className="font-medium">{drive.filesystem || drive.type || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : Object.entries(storageInfo).length > 0 ? (
                Object.entries(storageInfo).map(([driveName, details]) => (
                  <div key={driveName} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <HardDrive className="w-4 h-4 text-orange-600" />
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100">{driveName}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {typeof details === 'object' && details !== null ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Total Size:</span>
                            <span className="font-medium">{(details as any).total || (details as any).size || 'Unknown'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Used:</span>
                            <span className="font-medium">{(details as any).used || 'Unknown'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Free:</span>
                            <span className="font-medium">{(details as any).free || 'Unknown'}</span>
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
              <span>Running Processes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.isArray(processInfo) && processInfo.length > 0 ? (
                <div className="space-y-3">
                  {processInfo.slice(0, 20).map((process, index) => (
                    <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-neutral-600">Process: </span>
                          <span className="font-medium">{process.name || process.process_name || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">PID: </span>
                          <span className="font-medium">{process.pid || process.process_id || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">CPU: </span>
                          <span className="font-medium">{process.cpu_percent || process.cpu_usage || 'N/A'}%</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Memory: </span>
                          <span className="font-medium">{process.memory_percent || process.memory_usage || 'N/A'}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {processInfo.length > 20 && (
                    <p className="text-sm text-neutral-600 text-center">
                      Showing top 20 of {processInfo.length} processes
                    </p>
                  )}
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
                    <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                      <div className="text-sm">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                          {software.name || software.software_name || 'Unknown'}
                        </div>
                        <div className="text-neutral-600">
                          Version: {software.version || 'Unknown'}
                        </div>
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
