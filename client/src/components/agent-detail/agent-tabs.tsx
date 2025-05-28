import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Device } from "@/lib/api";
import { Monitor, Cpu, HardDrive, Network, Activity, BarChart3, MemoryStick, Clock, List } from "lucide-react";

interface AgentTabsProps {
  agent: Device;
}

export function AgentTabs({ agent }: AgentTabsProps) {
  return (
    <Card>
      <Tabs defaultValue="overview" className="w-full">
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <TabsList className="grid w-full grid-cols-6 bg-transparent h-auto p-0">
            <TabsTrigger 
              value="overview" 
              className="flex items-center space-x-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none py-4"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="cpu"
              className="flex items-center space-x-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none py-4"
            >
              <Cpu className="w-4 h-4" />
              <span>CPU</span>
            </TabsTrigger>
            <TabsTrigger 
              value="memory"
              className="flex items-center space-x-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none py-4"
            >
              <MemoryStick className="w-4 h-4" />
              <span>Memory</span>
            </TabsTrigger>
            <TabsTrigger 
              value="storage"
              className="flex items-center space-x-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none py-4"
            >
              <HardDrive className="w-4 h-4" />
              <span>Storage</span>
            </TabsTrigger>
            <TabsTrigger 
              value="network"
              className="flex items-center space-x-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none py-4"
            >
              <Network className="w-4 h-4" />
              <span>Network</span>
            </TabsTrigger>
            <TabsTrigger 
              value="processes"
              className="flex items-center space-x-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none py-4"
            >
              <List className="w-4 h-4" />
              <span>Processes</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="p-6">
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Information */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">System Information</h3>
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Operating System:</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {agent.os_name || "Unknown"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Version:</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {agent.os_version || "Unknown"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">IP Address:</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {agent.ip_address || "Unknown"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Assigned User:</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {agent.assigned_user || "Unassigned"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Last Seen:</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {agent.last_seen ? new Date(agent.last_seen).toLocaleString() : "Never"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Performance Metrics</h3>
                <div className="h-64 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-500">Real-time performance chart</p>
                    <p className="text-sm text-neutral-400">CPU, Memory, Disk over last 24h</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Raw Data Preview */}
            {agent.latest_report?.raw_data && (
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Latest Report Data</h3>
                <div className="bg-neutral-900 rounded-lg p-4 text-sm font-mono text-green-400 max-h-64 overflow-y-auto">
                  <pre>{JSON.stringify(agent.latest_report.raw_data, null, 2)}</pre>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cpu" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">CPU Usage</h3>
                <div className="h-48 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Cpu className="w-16 h-16 text-neutral-400 mx-auto mb-2" />
                    <p className="text-neutral-500">CPU Usage Chart</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">CPU Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Current Usage:</span>
                    <span className="text-sm text-neutral-900 dark:text-neutral-100">
                      {agent.latest_report?.cpu_usage || "0"}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">CPU Model:</span>
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">
                        {agent.latest_report?.raw_data?.hardware?.cpu?.model || "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Physical Cores:</span>
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">
                        {agent.latest_report?.raw_data?.hardware?.cpu?.physical_cores || "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Logical Cores:</span>
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">
                        {agent.latest_report?.raw_data?.hardware?.cpu?.logical_cores || "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Max Frequency:</span>
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">
                        {agent.latest_report?.raw_data?.hardware?.cpu?.max_freq 
                          ? `${(agent.latest_report.raw_data.hardware.cpu.max_freq / 1000).toFixed(2)} GHz`
                          : "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Current Frequency:</span>
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">
                        {agent.latest_report?.raw_data?.hardware?.cpu?.current_freq 
                          ? `${(agent.latest_report.raw_data.hardware.cpu.current_freq / 1000).toFixed(2)} GHz`
                          : "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="memory" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Memory Usage</h3>
                <div className="h-48 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MemoryStick className="w-16 h-16 text-neutral-400 mx-auto mb-2" />
                    <p className="text-neutral-500">Memory Usage Chart</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Memory Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Current Usage:</span>
                    <span className="text-sm text-neutral-900 dark:text-neutral-100">
                      {agent.latest_report?.memory_usage || "0"}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Total Memory:</span>
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">
                        {agent.latest_report?.raw_data?.hardware?.memory?.total 
                          ? `${(agent.latest_report.raw_data.hardware.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB`
                          : "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Available Memory:</span>
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">
                        {agent.latest_report?.raw_data?.hardware?.memory?.available 
                          ? `${(agent.latest_report.raw_data.hardware.memory.available / 1024 / 1024 / 1024).toFixed(2)} GB`
                          : "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Used Memory:</span>
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">
                        {agent.latest_report?.raw_data?.hardware?.memory?.used 
                          ? `${(agent.latest_report.raw_data.hardware.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB`
                          : "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="storage" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Storage Devices</h3>
                <div className="space-y-4">
                  {agent.latest_report?.raw_data?.storage ? (
                    (() => {
                      const storageData = agent.latest_report.raw_data.storage;
                      // Handle both array and object formats
                      const storageArray = Array.isArray(storageData) 
                        ? storageData 
                        : Object.entries(storageData).map(([key, value]) => ({
                            device: key,
                            ...(typeof value === 'object' && value !== null ? value : {})
                          }));
                      
                      return storageArray.map((disk: any, index: number) => (
                        <div key={index} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <HardDrive className="w-5 h-5 text-blue-600 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                  {disk.device || disk.name || `Drive ${index + 1}`}
                                </div>
                                <div className="text-xs text-neutral-600">
                                  {disk.mountpoint || disk.fstype || disk.mount || "Storage Device"}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                {disk.usage_percent ? `${Number(disk.usage_percent).toFixed(1)}%` : 
                                 disk.percent ? `${Number(disk.percent).toFixed(1)}%` : "Unknown"}
                              </div>
                              <div className="text-xs text-neutral-600">
                                {disk.total && disk.used ? 
                                  `${(disk.used / 1024 / 1024 / 1024).toFixed(1)}GB / ${(disk.total / 1024 / 1024 / 1024).toFixed(1)}GB` 
                                  : disk.free && disk.total ?
                                  `${((disk.total - disk.free) / 1024 / 1024 / 1024).toFixed(1)}GB / ${(disk.total / 1024 / 1024 / 1024).toFixed(1)}GB`
                                  : "Size Unknown"}
                              </div>
                            </div>
                          </div>
                          {(disk.usage_percent || disk.percent) && (
                            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  Number(disk.usage_percent || disk.percent) >= 90 ? "bg-red-500" : 
                                  Number(disk.usage_percent || disk.percent) >= 70 ? "bg-yellow-500" : "bg-green-500"
                                }`}
                                style={{ width: `${Number(disk.usage_percent || disk.percent)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ));
                    })()
                  ) : (
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <HardDrive className="w-5 h-5 text-blue-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">System Drive</div>
                            <div className="text-xs text-neutral-600">Primary Storage</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {agent.latest_report?.disk_usage || "0"}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Disk Performance</h3>
                <div className="h-48 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-neutral-400 mx-auto mb-2" />
                    <p className="text-neutral-500">Disk I/O Performance</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="network" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Network Activity</h3>
                <div className="h-48 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Network className="w-16 h-16 text-neutral-400 mx-auto mb-2" />
                    <p className="text-neutral-500">Network Traffic Chart</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Network Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Network I/O:</span>
                    <span className="text-sm text-neutral-900 dark:text-neutral-100">
                      {agent.latest_report?.network_io ? `${agent.latest_report.network_io} bytes` : "Unknown"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">IP Address:</span>
                    <span className="text-sm text-neutral-900 dark:text-neutral-100">
                      {agent.ip_address || 
                       agent.latest_report?.raw_data?.network?.ip_address ||
                       agent.latest_report?.raw_data?.network_info?.ip_address ||
                       "Unknown"}
                    </span>
                  </div>

                  {/* Network Interfaces */}
                  {agent.latest_report?.raw_data?.network && typeof agent.latest_report.raw_data.network === 'object' && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Network Interfaces</h4>
                      {Object.entries(agent.latest_report.raw_data.network).map(([key, value]: [string, any]) => {
                        if (typeof value === 'object' && value !== null && (value.bytes_sent !== undefined || value.bytes_recv !== undefined)) {
                          return (
                            <div key={key} className="bg-neutral-100 dark:bg-neutral-700 rounded p-3">
                              <div className="flex justify-between mb-2">
                                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{key}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-neutral-600">Sent:</span>
                                  <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                                    {value.bytes_sent && typeof value.bytes_sent === 'number' ? `${(value.bytes_sent / 1024 / 1024).toFixed(2)} MB` : "0 MB"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-neutral-600">Received:</span>
                                  <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                                    {value.bytes_recv && typeof value.bytes_recv === 'number' ? `${(value.bytes_recv / 1024 / 1024).toFixed(2)} MB` : "0 MB"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="processes" className="space-y-6">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Running Processes</h3>
            </div>

            {agent.latest_report?.raw_data?.processes && Array.isArray(agent.latest_report.raw_data.processes) ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-neutral-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Process
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        PID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        CPU %
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Memory
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                    {agent.latest_report.raw_data.processes.slice(0, 10).map((process: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100">
                          {process.name || process.command || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                          {process.pid || "--"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                          {process.cpu_percent !== undefined ? `${Number(process.cpu_percent).toFixed(1)}%` : "--"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                          {process.memory_info?.rss ? `${Math.round(process.memory_info.rss / 1024 / 1024)} MB` :
                           process.memory_percent ? `${Number(process.memory_percent).toFixed(1)}%` : "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <List className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-500">No process data available</p>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}