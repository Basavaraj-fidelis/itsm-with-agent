import { MetricCard } from "@/components/dashboard/metric-card";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDashboardSummary, useAlerts } from "@/hooks/use-dashboard";
import { useAgents } from "@/hooks/use-agents";
import { Monitor, CheckCircle, AlertTriangle, Cpu } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: agents, isLoading: agentsLoading } = useAgents();

  // Get top CPU consuming agents
  const topCpuAgents = agents
    ?.filter(agent => agent.latest_report?.cpu_usage)
    .sort((a, b) => parseFloat(b.latest_report!.cpu_usage!) - parseFloat(a.latest_report!.cpu_usage!))
    .slice(0, 5) || [];

  if (summaryLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-neutral-200 dark:bg-neutral-700 h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Dashboard</h1>
        <p className="text-neutral-600">System overview and monitoring</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Agents"
          value={summary?.total_devices || 0}
          icon={Monitor}
          change={{
            value: "12%",
            type: "increase",
            label: "from last month"
          }}
          color="blue"
        />

        <MetricCard
          title="Online Agents"
          value={summary?.online_devices || 0}
          icon={CheckCircle}
          trend={{
            label: "Availability",
            value: summary ? `${Math.round((summary.online_devices / summary.total_devices) * 100)}%` : "0%"
          }}
          color="green"
        />

        <MetricCard
          title="Critical Alerts"
          value={summary?.active_alerts || 0}
          icon={AlertTriangle}
          change={{
            value: "25%",
            type: "decrease",
            label: "from yesterday"
          }}
          color="red"
        />

        <MetricCard
          title="Avg CPU Usage"
          value="68%"
          icon={Cpu}
          trend={{
            label: "Performance",
            value: "Good"
          }}
          color="purple"
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PerformanceChart />

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse h-16 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                ))}
              </div>
            ) : alerts && alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border ${
                      alert.severity === "critical"
                        ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                        : alert.severity === "high"
                        ? "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
                        : alert.severity === "warning"
                        ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
                        : "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        alert.severity === "critical" ? "bg-red-500" 
                        : alert.severity === "high" ? "bg-orange-500"
                        : alert.severity === "warning" ? "bg-yellow-500"
                        : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {alert.message}
                      </p>
                      <p className="text-sm text-neutral-600">{alert.device_hostname}</p>
                      <p className="text-xs text-neutral-500">
                        {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertTriangle className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
                <p className="text-neutral-500">No recent alerts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top CPU Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Top CPU Usage by Agent</CardTitle>
        </CardHeader>
        <CardContent>
          {agentsLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              ))}
            </div>
          ) : topCpuAgents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Hostname
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      CPU Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Memory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                  {topCpuAgents.map((agent) => {
                    const cpuUsage = parseFloat(agent.latest_report!.cpu_usage!);
                    const memoryUsage = agent.latest_report?.memory_usage 
                      ? parseFloat(agent.latest_report.memory_usage) 
                      : 0;

                    return (
                      <tr key={agent.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Monitor className="w-5 h-5 text-neutral-400 mr-3" />
                            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {agent.hostname}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                          {agent.assigned_user?.split("@")[0] || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mr-3">
                              <div
                                className={`h-2 rounded-full ${
                                  cpuUsage >= 90 ? "bg-red-500" : 
                                  cpuUsage >= 70 ? "bg-yellow-500" : "bg-green-500"
                                }`}
                                style={{ width: `${cpuUsage}%` }}
                              />
                            </div>
                            <span className={`text-sm font-medium ${
                              cpuUsage >= 90 ? "text-red-600" : 
                              cpuUsage >= 70 ? "text-yellow-600" : "text-green-600"
                            }`}>
                              {cpuUsage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                          {memoryUsage}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={agent.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Monitor className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-500">No agent data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}