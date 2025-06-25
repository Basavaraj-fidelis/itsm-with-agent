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

  // Calculate distribution of agents by performance ranges
  const getPerformanceDistribution = (value: number) => {
    if (value >= 90) return 'critical';
    if (value >= 70) return 'warning';
    if (value >= 50) return 'moderate';
    return 'good';
  };

  const performanceDistribution = onlineAgents.reduce((acc, agent) => {
    const cpu = parseFloat(agent.latest_report?.cpu_usage || '0');
    const memory = parseFloat(agent.latest_report?.memory_usage || '0');
    const disk = parseFloat(agent.latest_report?.disk_usage || '0');
    
    const cpuLevel = getPerformanceDistribution(cpu);
    const memoryLevel = getPerformanceDistribution(memory);
    const diskLevel = getPerformanceDistribution(disk);
    
    acc.cpu[cpuLevel] = (acc.cpu[cpuLevel] || 0) + 1;
    acc.memory[memoryLevel] = (acc.memory[memoryLevel] || 0) + 1;
    acc.disk[diskLevel] = (acc.disk[diskLevel] || 0) + 1;
    
    return acc;
  }, {
    cpu: {} as Record<string, number>,
    memory: {} as Record<string, number>,
    disk: {} as Record<string, number>
  });

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>System Performance Overview</CardTitle>
        <p className="text-sm text-neutral-600">
          Aggregated metrics from {onlineAgents.length} online agents ({agents?.length || 0} total)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Average Performance Bars */}
          <div className="space-y-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4 text-neutral-600" />
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {metric.name} (Average)
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

          {/* Performance Distribution */}
          <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Agent Performance Distribution
            </h4>
            
            {['cpu', 'memory', 'disk'].map((type) => {
              const distribution = performanceDistribution[type as keyof typeof performanceDistribution];
              const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
              
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize font-medium">{type}</span>
                    <span className="text-neutral-600">{total} agents</span>
                  </div>
                  <div className="flex h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    {Object.entries(distribution).map(([level, count]) => {
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      const colorClass = 
                        level === 'critical' ? 'bg-red-500' :
                        level === 'warning' ? 'bg-yellow-500' :
                        level === 'moderate' ? 'bg-blue-500' : 'bg-green-500';
                      
                      return (
                        <div
                          key={level}
                          className={`${colorClass} transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                          title={`${level}: ${count} agents (${Math.round(percentage)}%)`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Good: {distribution.good || 0}</span>
                    <span>Moderate: {distribution.moderate || 0}</span>
                    <span>Warning: {distribution.warning || 0}</span>
                    <span>Critical: {distribution.critical || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">
                {onlineAgents.length}
              </div>
              <div className="text-xs text-neutral-600">Online</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {Math.round(avgCpuUsage)}%
              </div>
              <div className="text-xs text-neutral-600">Avg CPU</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {Math.round(avgMemoryUsage)}%
              </div>
              <div className="text-xs text-neutral-600">Avg Memory</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {Math.round(avgDiskUsage)}%
              </div>
              <div className="text-xs text-neutral-600">Avg Disk</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}