import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgents } from "@/hooks/use-agents";
import { Cpu, HardDrive, MemoryStick } from "lucide-react";

export function PerformanceChart() {
  const { data: agents, isLoading } = useAgents();

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>System Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-neutral-50 dark:bg-neutral-800 rounded-lg animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  // Calculate average metrics across all online agents
  const onlineAgents = agents?.filter(agent => agent.status === 'online') || [];

  const avgCpuUsage = onlineAgents.length > 0 
    ? onlineAgents.reduce((sum, agent) => 
        sum + (parseFloat(agent.latest_report?.cpu_usage || '0')), 0) / onlineAgents.length
    : 0;

  const avgMemoryUsage = onlineAgents.length > 0 
    ? onlineAgents.reduce((sum, agent) => 
        sum + (parseFloat(agent.latest_report?.memory_usage || '0')), 0) / onlineAgents.length
    : 0;

  const avgDiskUsage = onlineAgents.length > 0 
    ? onlineAgents.reduce((sum, agent) => 
        sum + (parseFloat(agent.latest_report?.disk_usage || '0')), 0) / onlineAgents.length
    : 0;

  const metrics = [
    {
      name: "CPU Usage",
      value: avgCpuUsage,
      icon: Cpu,
      color: avgCpuUsage >= 90 ? "bg-red-500" : avgCpuUsage >= 70 ? "bg-yellow-500" : "bg-green-500",
      textColor: avgCpuUsage >= 90 ? "text-red-600" : avgCpuUsage >= 70 ? "text-yellow-600" : "text-green-600"
    },
    {
      name: "Memory Usage",
      value: avgMemoryUsage,
      icon: MemoryStick,
      color: avgMemoryUsage >= 90 ? "bg-red-500" : avgMemoryUsage >= 70 ? "bg-yellow-500" : "bg-green-500",
      textColor: avgMemoryUsage >= 90 ? "text-red-600" : avgMemoryUsage >= 70 ? "text-yellow-600" : "text-green-600"
    },
    {
      name: "Disk Usage",
      value: avgDiskUsage,
      icon: HardDrive,
      color: avgDiskUsage >= 90 ? "bg-red-500" : avgDiskUsage >= 70 ? "bg-yellow-500" : "bg-green-500",
      textColor: avgDiskUsage >= 90 ? "text-red-600" : avgDiskUsage >= 70 ? "text-yellow-600" : "text-green-600"
    }
  ];

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>System Performance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Performance Bars */}
          <div className="space-y-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4 text-neutral-600" />
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {metric.name}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${metric.textColor}`}>
                      {Math.round(metric.value)}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${metric.color}`}
                      style={{ width: `${Math.min(metric.value, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {onlineAgents.length}
              </div>
              <div className="text-sm text-neutral-600">Online Agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {avgCpuUsage.toFixed(1)}%
              </div>
              <div className="text-sm text-neutral-600">Avg CPU</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {avgMemoryUsage.toFixed(1)}%
              </div>
              <div className="text-sm text-neutral-600">Avg Memory</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}