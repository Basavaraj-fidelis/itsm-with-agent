import React from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDashboardSummary, useAlerts } from "@/hooks/use-dashboard";
import { useAgents } from "@/hooks/use-agents";
import { Monitor, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useDashboardSummary();
  const { data: alerts, isLoading: alertsLoading, error: alertsError } = useAlerts();
  const { data: agents, isLoading: agentsLoading, error: agentsError } = useAgents();

  // Debug authentication state
  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    console.log('Dashboard - Auth token present:', !!token);
    if (summaryError) {
      console.error('Dashboard summary error:', summaryError);
    }
    if (alertsError) {
      console.error('Dashboard alerts error:', alertsError);
    }
    if (agentsError) {
      console.error('Dashboard agents error:', agentsError);
    }
  }, [summaryError, alertsError, agentsError]);

  if (summaryLoading || agentsLoading || alertsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-neutral-200 dark:bg-neutral-700 h-32 rounded-lg"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (summaryError || alertsError || agentsError) {
    return (
      <div className="flex items-center justify-center h-96 p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-neutral-600">
            Please refresh the page or try again later.
          </p>
          {summaryError && (
            <p className="text-xs text-red-500 mt-2">
              Summary Error: {summaryError.message}
            </p>
          )}
          {alertsError && (
            <p className="text-xs text-red-500 mt-2">
              Alerts Error: {alertsError.message}
            </p>
          )}
          {agentsError && (
            <p className="text-xs text-red-500 mt-2">
              Agents Error: {agentsError.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
          Dashboard
        </h1>
        <p className="text-neutral-600">System overview and monitoring</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Agents"
          value={summary?.total_devices || 0}
          icon={Monitor}
          change={{
            value: "2",
            type: "increase",
            label: "new this month",
          }}
          color="blue"
        />

        <MetricCard
          title="Online Agents"
          value={summary?.online_devices || 0}
          icon={CheckCircle}
          trend={{
            label: "Availability",
            value: summary
              ? `${Math.round((summary.online_devices / summary.total_devices) * 100)}%`
              : "0%",
          }}
          color="green"
        />

        <MetricCard
          title="Alerts"
          value={summary?.active_alerts || 0}
          icon={AlertTriangle}
          change={{
            value: "3",
            type: "decrease",
            label: "since yesterday",
          }}
          color="red"
        />

        <MetricCard
          title="Offline Agents"
          value={summary?.offline_devices || 0}
          icon={XCircle}
          change={{
            value: summary?.offline_devices ? "1" : "0",
            type: "decrease",
            label: "disconnected",
          }}
          color="orange"
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
            <p className="text-sm text-neutral-600">
              Latest service desk requests and incidents
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Mock ticket data */}
              {[
                {
                  id: "REQ-2024-001",
                  type: "request",
                  title: "New Software Installation Request",
                  priority: "medium",
                  status: "new",
                  requester: "john.doe@company.com",
                  time: "2 hours ago",
                },
                {
                  id: "INC-2024-001",
                  type: "incident",
                  title: "Email Server Down",
                  priority: "critical",
                  status: "in_progress",
                  requester: "jane.smith@company.com",
                  time: "4 hours ago",
                },
                {
                  id: "PRB-2024-001",
                  type: "problem",
                  title: "Recurring Network Timeouts",
                  priority: "high",
                  status: "assigned",
                  requester: "system@company.com",
                  time: "1 day ago",
                },
                {
                  id: "CHG-2024-001",
                  type: "change",
                  title: "Server OS Update",
                  priority: "medium",
                  status: "pending",
                  requester: "system-admin@company.com",
                  time: "2 days ago",
                },
              ].map((ticket) => (
                <div
                  key={ticket.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                    ticket.priority === "critical"
                      ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                      : ticket.priority === "high"
                        ? "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
                        : ticket.priority === "medium"
                          ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
                          : "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      ticket.type === "incident"
                        ? "bg-red-500"
                        : ticket.type === "problem"
                          ? "bg-orange-500"
                          : ticket.type === "change"
                            ? "bg-blue-500"
                            : "bg-green-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-mono text-xs text-neutral-600">
                        {ticket.id}
                      </span>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {ticket.title}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {ticket.requester}
                    </p>
                    <p className="text-xs text-neutral-500">{ticket.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse h-16 bg-neutral-200 dark:bg-neutral-700 rounded"
                  ></div>
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
                        alert.severity === "critical"
                          ? "bg-red-500"
                          : alert.severity === "high"
                            ? "bg-orange-500"
                            : alert.severity === "warning"
                              ? "bg-yellow-500"
                              : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {alert.message}
                      </p>
                      <p className="text-sm text-neutral-600">
                        {alert.device_hostname}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatDistanceToNow(new Date(alert.triggered_at), {
                          addSuffix: true,
                        })}
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
    </div>
  );
}
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardMetrics {
  totalDevices: number
  activeAlerts: number
  ticketsOpen: number
  systemHealth: number
}

export default function Dashboard() {
  const { data: metrics, isLoading, error } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/metrics')
      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }
      return response.json()
    }
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error loading dashboard data</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">System Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalDevices}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeAlerts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.ticketsOpen}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.systemHealth}%</div>
          </CardContent>
        </Card>
      </div>

      <button 
        onClick={() => window.location.reload()} 
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Refresh
      </button>
    </div>
  )
}
