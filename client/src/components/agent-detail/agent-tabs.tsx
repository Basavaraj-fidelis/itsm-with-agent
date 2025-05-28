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
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Storage Devices</h3>
                <div className="space-y-4">
                  {agent.latest_report?.raw_data?.storage ? (
                    // Check if storage has disks array (new format)
                    agent.latest_report.raw_data.storage.disks && Array.isArray(agent.latest_report.raw_data.storage.disks) ? (
                      agent.latest_report.raw_data.storage.disks.map((disk: any, index: number) => {
                        const totalGB = disk.total ? (disk.total / 1024 / 1024 / 1024) : (disk.usage?.total ? (disk.usage.total / 1024 / 1024 / 1024) : 0);
                        const usedGB = disk.used ? (disk.used / 1024 / 1024 / 1024) : (disk.usage?.used ? (disk.usage.used / 1024 / 1024 / 1024) : 0);
                        const freeGB = disk.free ? (disk.free / 1024 / 1024 / 1024) : (disk.usage?.free ? (disk.usage.free / 1024 / 1024 / 1024) : 0);
                        const usagePercent = disk.percent || disk.usage?.percentage || 0;
                        
                        return (
                          <div key={index} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center">
                                <HardDrive className="w-6 h-6 text-blue-600 mr-3" />
                                <div>
                                  <h4 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                                    {disk.device || disk.mountpoint || `Disk ${index + 1}`}
                                  </h4>
                                  <p className="text-sm text-neutral-600">
                                    {disk.filesystem || "Unknown"} • {disk.mountpoint || disk.device}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={
                                usagePercent > 90 ? "destructive" : 
                                usagePercent > 75 ? "secondary" : "default"
                              } className="text-sm px-3 py-1">
                                {Math.round(usagePercent)}% Used
                              </Badge>
                            </div>
                            
                            {/* Storage Summary Cards */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-blue-600">{totalGB.toFixed(1)}</div>
                                <div className="text-xs text-neutral-600 uppercase tracking-wide">Total GB</div>
                              </div>
                              <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-orange-600">{usedGB.toFixed(1)}</div>
                                <div className="text-xs text-neutral-600 uppercase tracking-wide">Used GB</div>
                              </div>
                              <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-green-600">{freeGB.toFixed(1)}</div>
                                <div className="text-xs text-neutral-600 uppercase tracking-wide">Free GB</div>
                              </div>
                            </div>
                            
                            {/* Usage Progress Bar */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-neutral-600">Storage Usage</span>
                                <span className="font-medium">{usagePercent.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-neutral-200 dark:bg-neutral-600 rounded-full h-3">
                                <div 
                                  className={`h-3 rounded-full transition-all duration-300 ${
                                    usagePercent > 90 ? 'bg-red-500' : 
                                    usagePercent > 75 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            {/* I/O Stats if available */}
                            {disk.io_counters && (
                              <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-600">
                                <h5 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">I/O Statistics</h5>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <span className="text-neutral-600">Read:</span>
                                    <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                                      {disk.io_counters.read_bytes ? `${(disk.io_counters.read_bytes / 1024 / 1024 / 1024).toFixed(2)} GB` : "0 GB"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-neutral-600">Write:</span>
                                    <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                                      {disk.io_counters.write_bytes ? `${(disk.io_counters.write_bytes / 1024 / 1024 / 1024).toFixed(2)} GB` : "0 GB"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : Array.isArray(agent.latest_report.raw_data.storage) ? (
                      // Handle legacy array format
                      agent.latest_report.raw_data.storage.map((disk: any, index: number) => {
                        const totalGB = disk.total ? (disk.total / 1024 / 1024 / 1024) : 0;
                        const usedGB = disk.used ? (disk.used / 1024 / 1024 / 1024) : 0;
                        const freeGB = disk.free ? (disk.free / 1024 / 1024 / 1024) : 0;
                        const usagePercent = disk.percent || disk.usage_percent || 0;
                        
                        return (
                          <div key={index} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center">
                                <HardDrive className="w-6 h-6 text-blue-600 mr-3" />
                                <div>
                                  <h4 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                                    {disk.device || disk.mountpoint || `Disk ${index + 1}`}
                                  </h4>
                                  <p className="text-sm text-neutral-600">
                                    {disk.filesystem || "Unknown"} • {disk.mountpoint || disk.device}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={
                                usagePercent > 90 ? "destructive" : 
                                usagePercent > 75 ? "secondary" : "default"
                              } className="text-sm px-3 py-1">
                                {Math.round(usagePercent)}% Used
                              </Badge>
                            </div>
                            
                            {/* Storage Summary Cards */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-blue-600">{totalGB.toFixed(1)}</div>
                                <div className="text-xs text-neutral-600 uppercase tracking-wide">Total GB</div>
                              </div>
                              <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-orange-600">{usedGB.toFixed(1)}</div>
                                <div className="text-xs text-neutral-600 uppercase tracking-wide">Used GB</div>
                              </div>
                              <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-green-600">{freeGB.toFixed(1)}</div>
                                <div className="text-xs text-neutral-600 uppercase tracking-wide">Free GB</div>
                              </div>
                            </div>
                            
                            {/* Usage Progress Bar */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-neutral-600">Storage Usage</span>
                                <span className="font-medium">{usagePercent.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-neutral-200 dark:bg-neutral-600 rounded-full h-3">
                                <div 
                                  className={`h-3 rounded-full transition-all duration-300 ${
                                    usagePercent > 90 ? 'bg-red-500' : 
                                    usagePercent > 75 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : typeof agent.latest_report.raw_data.storage === 'object' ? (
                      // Handle object format like { "C:": {...}, "D:": {...} }
                      Object.entries(agent.latest_report.raw_data.storage).map(([diskName, disk]: [string, any]) => {
                        const totalGB = disk.total ? (disk.total / 1024 / 1024 / 1024) : 0;
                        const usedGB = disk.used ? (disk.used / 1024 / 1024 / 1024) : 0;
                        const freeGB = disk.free ? (disk.free / 1024 / 1024 / 1024) : 0;
                        const usagePercent = disk.percent || disk.usage_percent || 0;
                        
                        return (
                          <div key={diskName} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center">
                                <HardDrive className="w-6 h-6 text-blue-600 mr-3" />
                                <div>
                                  <h4 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                                    {disk.device || disk.mountpoint || diskName}
                                  </h4>
                                  <p className="text-sm text-neutral-600">
                                    {disk.filesystem || "Unknown"} • {disk.mountpoint || diskName}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={
                                usagePercent > 90 ? "destructive" : 
                                usagePercent > 75 ? "secondary" : "default"
                              } className="text-sm px-3 py-1">
                                {Math.round(usagePercent)}% Used
                              </Badge>
                            </div>
                            
                            {/* Storage Summary Cards */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-blue-600">{totalGB.toFixed(1)}</div>
                                <div className="text-xs text-neutral-600 uppercase tracking-wide">Total GB</div>
                              </div>
                              <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-orange-600">{usedGB.toFixed(1)}</div>
                                <div className="text-xs text-neutral-600 uppercase tracking-wide">Used GB</div>
                              </div>
                              <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-green-600">{freeGB.toFixed(1)}</div>
                                <div className="text-xs text-neutral-600 uppercase tracking-wide">Free GB</div>
                              </div>
                            </div>
                            
                            {/* Usage Progress Bar */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-neutral-600">Storage Usage</span>
                                <span className="font-medium">{usagePercent.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-neutral-200 dark:bg-neutral-600 rounded-full h-3">
                                <div 
                                  className={`h-3 rounded-full transition-all duration-300 ${
                                    usagePercent > 90 ? 'bg-red-500' : 
                                    usagePercent > 75 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : null
                  ) : (
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6">
                      <div className="flex items-center justify-center">
                        <div className="text-center">
                          <HardDrive className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">No Storage Data</h4>
                          <p className="text-sm text-neutral-500">Storage information is not available for this agent</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="network" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Network Interfaces</h3>
                <div className="space-y-4">
                  {agent.latest_report?.raw_data?.network?.interfaces && Array.isArray(agent.latest_report.raw_data.network.interfaces) ? (
                    agent.latest_report.raw_data.network.interfaces.map((interface: any, index: number) => (
                      <div key={index} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {interface.name || `Interface ${index + 1}`}
                          </h4>
                          <Badge variant={
                            interface.stats?.is_up ? "default" : "secondary"
                          }>
                            {interface.stats?.is_up ? "Up" : "Down"}
                          </Badge>
                        </div>
                        
                        {/* Show all IP addresses, highlighting AF_INET */}
                        <div className="space-y-2">
                          <h5 className="text-xs font-medium text-neutral-700 dark:text-neutral-300">IP Addresses:</h5>
                          {interface.addresses && Array.isArray(interface.addresses) ? (
                            interface.addresses.map((addr: any, addrIndex: number) => (
                              <div key={addrIndex} className={`text-xs p-2 rounded ${
                                addr.family === 'AF_INET' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'bg-neutral-100 dark:bg-neutral-700'
                              }`}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                    {addr.address}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    addr.family === 'AF_INET' ? 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200' : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300'
                                  }`}>
                                    {addr.family === 'AF_INET' ? 'IPv4' : addr.family === 'AF_INET6' ? 'IPv6' : addr.family}
                                  </span>
                                </div>
                                {addr.netmask && (
                                  <div className="text-neutral-600">Netmask: {addr.netmask}</div>
                                )}
                                {addr.broadcast && (
                                  <div className="text-neutral-600">Broadcast: {addr.broadcast}</div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-neutral-500">No addresses available</div>
                          )}
                        </div>
                        
                        {/* Interface Stats */}
                        {interface.stats && (
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-neutral-600">Connection:</span>
                              <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                                {interface.name?.toLowerCase().includes('wifi') || interface.name?.toLowerCase().includes('wlan') ? 'WiFi' : 
                                 interface.name?.toLowerCase().includes('ethernet') || interface.name?.toLowerCase().includes('eth') ? 'Ethernet' : 
                                 interface.name?.toLowerCase().includes('lo') ? 'Loopback' : 'Unknown'}
                              </span>
                            </div>
                            <div>
                              <span className="text-neutral-600">Speed:</span>
                              <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                                {interface.stats.speed ? `${interface.stats.speed} Mbps` : "Unknown"}
                              </span>
                            </div>
                            <div>
                              <span className="text-neutral-600">MTU:</span>
                              <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                                {interface.stats.mtu || "Unknown"}
                              </span>
                            </div>
                            <div>
                              <span className="text-neutral-600">Duplex:</span>
                              <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                                {interface.stats.duplex || "Unknown"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                      <div className="text-center">
                        <Network className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
                        <p className="text-sm text-neutral-500">No network interface data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Network Activity</h3>
                <div className="space-y-4">
                  {/* Network I/O Stats */}
                  {agent.latest_report?.raw_data?.network?.io_counters && (
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-3">Total I/O Statistics</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-neutral-600">Bytes Sent:</span>
                          <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                            {agent.latest_report.raw_data.network.io_counters.bytes_sent ? 
                              `${(agent.latest_report.raw_data.network.io_counters.bytes_sent / 1024 / 1024 / 1024).toFixed(2)} GB` : "0 GB"}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Bytes Received:</span>
                          <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                            {agent.latest_report.raw_data.network.io_counters.bytes_recv ? 
                              `${(agent.latest_report.raw_data.network.io_counters.bytes_recv / 1024 / 1024 / 1024).toFixed(2)} GB` : "0 GB"}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Packets Sent:</span>
                          <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                            {agent.latest_report.raw_data.network.io_counters.packets_sent?.toLocaleString() || "0"}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Packets Received:</span>
                          <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                            {agent.latest_report.raw_data.network.io_counters.packets_recv?.toLocaleString() || "0"}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Errors In:</span>
                          <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                            {agent.latest_report.raw_data.network.io_counters.errin || "0"}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Errors Out:</span>
                          <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                            {agent.latest_report.raw_data.network.io_counters.errout || "0"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Public IP */}
                  {agent.latest_report?.raw_data?.network?.public_ip && (
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">Public Information</h4>
                      <div className="text-xs">
                        <span className="text-neutral-600">Public IP:</span>
                        <span className="ml-1 text-neutral-900 dark:text-neutral-100">
                          {agent.latest_report.raw_data.network.public_ip}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Network Chart Placeholder */}
                  <div className="h-32 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
                      <p className="text-xs text-neutral-500">Network Traffic Chart</p>
                    </div>
                  </div>
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