
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import {
  Monitor,
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  RefreshCw,
  Terminal,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import type { Agent } from "@/types/agent-types";

interface OverviewTabProps {
  agent: Agent;
  systemInfo: any;
  networkInfo: any;
  metrics: any;
  storage: any[];
  processes: any[];
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-neutral-600">{label}:</span>
    <span className="font-medium">{value || "N/A"}</span>
  </div>
);

const PerformanceBar = ({ label, value, icon: Icon }: { label: string; value: number; icon: any }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Icon className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={`text-sm font-medium ${value >= 85 ? "text-red-600" : value >= 75 ? "text-yellow-600" : "text-green-600"}`}>
        {Math.round(value)}%
      </span>
    </div>
    <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
      <div
        className={`h-2 rounded-full ${value >= 85 ? "bg-red-500" : value >= 75 ? "bg-yellow-500" : "bg-green-500"}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  </div>
);

export function OverviewTab({ agent, systemInfo, networkInfo, metrics, storage, processes }: OverviewTabProps) {
  return (
    <div className="space-y-6">
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
                <Badge variant={agent.status === "online" ? "default" : "destructive"}>
                  {agent.status}
                </Badge>
              </div>
              <Stat label="Operating System" value={systemInfo.osName} />
              <Stat label="OS Version" value={systemInfo.osVersion} />
              <Stat label="Architecture" value={systemInfo.architecture} />
              <Stat label="IP Address" value={networkInfo.primaryIP} />
              <Stat label="Assigned User" value={systemInfo.assignedUser} />
              <div className="flex justify-between">
                <span className="text-neutral-600">Last Report:</span>
                <span className="font-medium">
                  {agent.latest_report?.collected_at
                    ? formatDistanceToNow(new Date(agent.latest_report.collected_at), { addSuffix: true })
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
              <PerformanceBar label="CPU Usage" value={metrics.cpuUsage} icon={Cpu} />
              <PerformanceBar label="Memory Usage" value={metrics.memoryUsage} icon={MemoryStick} />
              <PerformanceBar label="Disk Usage" value={metrics.diskUsage} icon={HardDrive} />
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
                <Badge variant={systemInfo.networkStatus.overall_status === "healthy" ? "default" : "destructive"}>
                  {systemInfo.networkStatus.overall_status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Reachable Endpoints:</span>
                <span className="font-medium">
                  {systemInfo.networkStatus.reachable_endpoints}/{systemInfo.networkStatus.total_endpoints}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">24h Uptime:</span>
                <span className="font-medium">
                  {systemInfo.networkStatus.uptime_percentage_24h.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-medium mb-2 text-sm">Endpoint Status</h4>
              <div className="space-y-1">
                {Object.entries(systemInfo.networkStatus.endpoint_status).map(([endpoint, status]) => (
                  <div key={endpoint} className="flex items-center justify-between text-xs">
                    <span className="font-mono">{endpoint}</span>
                    <Badge variant={status ? "default" : "destructive"} className="text-xs">
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
                <Badge variant={systemInfo.performanceBaseline.enabled ? "default" : "secondary"}>
                  {systemInfo.performanceBaseline.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Total Samples:</span>
                <span className="font-medium">{systemInfo.performanceBaseline.total_samples}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Active Alerts:</span>
                <span className={`font-medium ${systemInfo.performanceBaseline.active_alerts > 0 ? "text-red-600" : "text-green-600"}`}>
                  {systemInfo.performanceBaseline.active_alerts}
                </span>
              </div>
            </div>

            {systemInfo.performanceBaseline.active_alerts > 0 && (
              <div className="mt-4 p-3 border rounded-lg bg-red-50 border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <h4 className="font-medium text-red-900 text-sm">Performance Degradation Detected</h4>
                </div>
                <p className="text-red-700 text-xs">
                  {systemInfo.performanceBaseline.active_alerts} metric(s) showing degradation above{" "}
                  {systemInfo.performanceBaseline.degradation_threshold_percent}% threshold
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
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="ml-auto">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
            <div className="space-y-1">
              <div className="text-green-300"># ITSM Agent - {systemInfo.hostname} - Live System Data</div>
              <div className="text-yellow-400">
                Last Updated: {agent.latest_report?.collected_at 
                  ? new Date(agent.latest_report.collected_at).toLocaleString() 
                  : "N/A"}
              </div>
              <div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>

              <div className="mt-4">
                <div className="text-blue-400">SYSTEM STATUS:</div>
                <div>Status: <span className={agent.status === "online" ? "text-green-400" : "text-red-400"}>{agent.status.toUpperCase()}</span></div>
                <div>OS: {systemInfo.osName} {systemInfo.osVersion}</div>
                <div>Architecture: {systemInfo.architecture}</div>
                <div>Assigned User: {systemInfo.assignedUser}</div>
              </div>

              <div className="mt-4">
                <div className="text-blue-400">PERFORMANCE METRICS:</div>
                <div>CPU Usage: <span className="text-yellow-400">{metrics.cpuUsage.toFixed(2)}%</span></div>
                <div>Memory Usage: <span className="text-yellow-400">{metrics.memoryUsage.toFixed(2)}%</span></div>
                <div>Disk Usage: <span className="text-yellow-400">{metrics.diskUsage.toFixed(2)}%</span></div>
                <div>Network I/O: <span className="text-yellow-400">{(metrics.networkIO / 1024 / 1024).toFixed(2)} MB</span></div>
              </div>

              <div className="mt-4">
                <div className="text-blue-400">NETWORK INFO:</div>
                {networkInfo.interfaces.slice(0, 3).map((iface, index) => {
                  const ipAddr = iface.addresses?.find((addr) => 
                    addr.family === "AF_INET" && 
                    !addr.address.startsWith("127.") && 
                    !addr.address.startsWith("169.254.")
                  );
                  return (
                    <div key={index}>
                      {iface.name}: <span className="text-green-400">Active</span> - IP: <span className="text-yellow-400">{ipAddr?.address || "N/A"}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4">
                <div className="text-blue-400">STORAGE INFO:</div>
                {storage.slice(0, 3).map((drive, index) => {
                  const usage = Math.round(drive.percent || drive.usage?.percentage || 0) || 0;
                  return (
                    <div key={index}>
                      {drive.device || drive.mountpoint || `Drive ${index + 1}`}: 
                      <span className={`${usage >= 85 ? "text-red-400" : usage >= 75 ? "text-yellow-400" : "text-green-400"}`}>
                        {usage}% used
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4">
                <div className="text-blue-400">TOP PROCESSES (by CPU):</div>
                {processes
                  .filter((process) => process.cpu_percent > 1)
                  .slice(0, 5)
                  .map((process, index) => (
                    <div key={index}>
                      PID {process.pid}: <span className="text-cyan-400">{process.name}</span> - 
                      CPU: <span className="text-yellow-400">{process.cpu_percent.toFixed(1)}%</span>
                      RAM: <span className="text-yellow-400">{process.memory_percent.toFixed(1)}%</span>
                    </div>
                  ))}
              </div>

              <div className="mt-4 text-gray-500">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
              <div className="text-green-300">$ Agent monitoring active...</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
