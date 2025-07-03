import React from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDashboardSummary, useAlerts } from "@/hooks/use-dashboard";
import { useAgents } from "@/hooks/use-agents";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  Plus, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Activity,
  BarChart3,
  Settings,
  Bell,
  Search,
  Filter,
  Download,
  RefreshCw,
  User,
  Calendar,
  FileText,
  Shield,
  Database,
  Zap,
  Monitor,
  Server,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Eye,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  XCircle,
  Bug
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Define alert thresholds
const ALERT_THRESHOLDS = {
  CPU: {
    WARNING: 60,
    CRITICAL: 80,
  },
  MEMORY: {
    WARNING: 70,
    CRITICAL: 85,
  },
  DISK: {
    WARNING: 75,
    CRITICAL: 90,
  },
};

// Helper function to get alert level based on usage and type
const getAlertLevel = (usage, type) => {
  if (usage > ALERT_THRESHOLDS[type].CRITICAL) {
    return "CRITICAL";
  } else if (usage > ALERT_THRESHOLDS[type].WARNING) {
    return "WARNING";
  } else {
    return "NORMAL";
  }
};

// Helper function to get color based on alert level
const getAlertColor = (alertLevel) => {
  switch (alertLevel) {
    case "CRITICAL":
      return "red";
    case "WARNING":
      return "orange";
    default:
      return "green";
  }
};

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useDashboardSummary();
  const { data: alerts, isLoading: alertsLoading, error: alertsError } = useAlerts();
  const { data: agents, isLoading: agentsLoading, error: agentsError } = useAgents();

  // Fetch tickets data for ITSM dashboard
  const { data: ticketsResponse, isLoading: ticketsLoading, error: ticketsError } = useQuery({
    queryKey: ["/api/tickets", { limit: 1000 }],
    queryFn: async () => {
      try {
        const response = await api.get("/api/tickets?limit=1000");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.warn("Failed to fetch tickets:", error);
        return { data: [], total: 0 };
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1,
    staleTime: 15000,
  });

  // Handle different response formats from the API
  const tickets = Array.isArray(ticketsResponse?.data) 
    ? ticketsResponse.data 
    : ticketsResponse?.data?.tickets || 
      ticketsResponse?.tickets || 
      [];

  // Helper functions for ticket analytics
  const getTicketDistribution = () => {
    // Only count active tickets (not resolved, closed, or cancelled)
    const activeTickets = tickets.filter(ticket => 
      !['resolved', 'closed', 'cancelled'].includes(ticket.status)
    );

    const distribution = activeTickets.reduce((acc, ticket) => {
      acc[ticket.type] = (acc[ticket.type] || 0) + 1;
      return acc;
    }, {});

    const totalActive = activeTickets.length;

    return [
      { type: "Incidents", count: distribution.incident || 0, color: "bg-red-500", percentage: totalActive > 0 ? Math.round(((distribution.incident || 0) / totalActive) * 100) : 0 },
      { type: "Requests", count: distribution.request || 0, color: "bg-green-500", percentage: totalActive > 0 ? Math.round(((distribution.request || 0) / totalActive) * 100) : 0 },
      { type: "Problems", count: distribution.problem || 0, color: "bg-orange-500", percentage: totalActive > 0 ? Math.round(((distribution.problem || 0) / totalActive) * 100) : 0 },
      { type: "Changes", count: distribution.change || 0, color: "bg-blue-500", percentage: totalActive > 0 ? Math.round(((distribution.change || 0) / totalActive) * 100) : 0 },
    ];
  };

  const getTicketStatusDistribution = () => {
    // Only count active tickets for status distribution
    const activeTickets = tickets.filter(ticket => 
      !['resolved', 'closed', 'cancelled'].includes(ticket.status)
    );

    const statusDistribution = activeTickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});

    const totalActive = activeTickets.length;

    return [
      { status: "New", count: statusDistribution.new || 0, color: "bg-blue-500", percentage: totalActive > 0 ? Math.round(((statusDistribution.new || 0) / totalActive) * 100) : 0 },
      { status: "Assigned", count: statusDistribution.assigned || 0, color: "bg-purple-500", percentage: totalActive > 0 ? Math.round(((statusDistribution.assigned || 0) / totalActive) * 100) : 0 },
      { status: "In Progress", count: statusDistribution.in_progress || 0, color: "bg-yellow-500", percentage: totalActive > 0 ? Math.round(((statusDistribution.in_progress || 0) / totalActive) * 100) : 0 },
      { status: "Pending", count: statusDistribution.pending || 0, color: "bg-orange-500", percentage: totalActive > 0 ? Math.round(((statusDistribution.pending || 0) / totalActive) * 100) : 0 },
      { status: "On Hold", count: statusDistribution.on_hold || 0, color: "bg-indigo-500", percentage: totalActive > 0 ? Math.round(((statusDistribution.on_hold || 0) / totalActive) * 100) : 0 },
    ];
  };

  const getSLAStatus = () => {
    const now = new Date();
    let breached = 0;
    let dueIn2Hours = 0;
    let dueToday = 0;

    tickets.forEach(ticket => {
      // Skip resolved/closed tickets for SLA calculation
      if (['resolved', 'closed', 'cancelled'].includes(ticket.status)) {
        return;
      }

      // Check both sla_resolution_due and due_date fields
      const dueDate = ticket.sla_resolution_due || ticket.due_date;
      if (dueDate) {
        const dueDateObj = new Date(dueDate);
        const timeDiff = dueDateObj.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);

        if (hoursDiff < 0) {
          breached++;
        } else if (hoursDiff <= 2) {
          dueIn2Hours++;
        } else if (hoursDiff <= 24) {
          dueToday++;
        }
      }
    });

    return { breached, dueIn2Hours, dueToday };
  };

  const getAssignmentDistribution = () => {
    const activeTickets = tickets.filter(t => !['resolved', 'closed', 'cancelled'].includes(t.status));
    const unassigned = activeTickets.filter(t => !t.assigned_to).length;
    const assignedTickets = activeTickets.filter(t => t.assigned_to);

    const assignmentCounts = assignedTickets.reduce((acc, ticket) => {
      const assignee = ticket.assigned_to;
      acc[assignee] = (acc[assignee] || 0) + 1;
      return acc;
    }, {});

    const topAssignees = Object.entries(assignmentCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4)
      .map(([name, count]) => ({
        name: name || "Unknown",
        team: name && name.includes("@") ? "Support Team" : "L1 Support",
        count,
        status: "online"
      }));

    if (unassigned > 0) {
      topAssignees.unshift({
        name: "Unassigned",
        team: "Queue",
        count: unassigned,
        status: "pending"
      });
    }

    return topAssignees.slice(0, 4);
  };

  const ticketDistribution = getTicketDistribution();
  const statusDistribution = getTicketStatusDistribution();
  const slaStatus = getSLAStatus();
  const assignmentDistribution = getAssignmentDistribution();

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

  if (summaryLoading || agentsLoading || alertsLoading || ticketsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 p-6 space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-3">
          <div className="h-8 bg-gradient-to-r from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-600 rounded-lg w-64 animate-pulse"></div>
          <div className="h-4 bg-gradient-to-r from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-600 rounded w-96 animate-pulse"></div>
        </div>

        {/* Metrics Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gradient-to-r from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-600 rounded w-20"></div>
                  <div className="h-8 bg-gradient-to-r from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-600 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-200 to-blue-300 dark:from-blue-700 dark:to-blue-600 rounded-lg"></div>
              </div>
              <div className="h-3 bg-gradient-to-r from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-600 rounded w-32"></div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4 animate-pulse">
            <div className="h-6 bg-gradient-to-r from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-600 rounded w-48"></div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gradient-to-r from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-600 rounded-lg"></div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4 animate-pulse">
            <div className="h-6 bg-gradient-to-r from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-600 rounded w-32"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gradient-to-r from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-600 rounded-lg"></div>
              ))}
            </div>
          </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Enhanced Header with Better Layout */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 rounded-3xl border border-blue-200/20 dark:border-blue-700/20"></div>
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Title Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      IT Service Management Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                      Real-time system overview and monitoring
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live Data</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                  <span>Updated {new Date().toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Quick Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Active Tickets
                  </div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {tickets.filter(t => !['resolved', 'closed', 'cancelled'].includes(t.status)).length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {tickets.filter(t => ['resolved', 'closed', 'cancelled'].includes(t.status)).length} resolved
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    System Health
                  </div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {summary ? `${Math.round((summary.online_devices / summary.total_devices) * 100)}%` : "0%"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {summary?.online_devices || 0} of {summary?.total_devices || 0} online
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Enhanced Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
            value={alerts?.length || 0}
            icon={AlertTriangle}
            change={{
              value: alerts?.filter(alert => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return new Date(alert.triggered_at) >= yesterday;
              }).length?.toString() || "0",
              type: "increase",
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

      {/* Additional ITSM Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <MetricCard
            title="Open Tickets"
            value={tickets.filter(t => !['resolved', 'closed', 'cancelled'].includes(t.status)).length}
            icon={FileText}
            trend={{
              label: "Active",
              value: `${tickets.filter(t => !['resolved', 'closed', 'cancelled'].includes(t.status)).length} open`,
            }}
            color="blue"
          />

          <MetricCard
            title="SLA Violations"
            value={slaStatus.breached}
            icon={Clock}
            change={{
              value: slaStatus.breached.toString(),
              type: "increase",
              label: "critical",
            }}
            color="red"
          />

          <MetricCard
            title="SLA Compliance"
            value={`${Math.round(((tickets.length - slaStatus.breached) / Math.max(tickets.length, 1)) * 100)}%`}
            icon={Shield}
            trend={{
              label: "Overall",
              value: "Good",
            }}
            color="green"
          />

          <MetricCard
            title="Resolved Today"
            value={tickets.filter(t => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return ['resolved', 'closed'].includes(t.status) && new Date(t.updated_at) >= today;
            }).length}
            icon={CheckCircle}
            change={{
              value: "8",
              type: "increase",
              label: "completed",
            }}
            color="purple"
          />
        </div>

      {/* ITSM Overview Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ticket Distribution by Type */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Ticket Distribution by Type</h3>
            <div className="grid grid-cols-2 gap-4">
              {ticketDistribution.map((item) => (
                <MetricCard
                  key={item.type}
                  title={item.type}
                  value={item.count}
                  icon={item.type === "Incidents" ? AlertTriangle : 
                        item.type === "Requests" ? FileText :
                        item.type === "Problems" ? Bug :
                        Settings}
                  trend={{
                    label: "of total",
                    value: `${item.percentage}%`,
                  }}
                  color={item.type === "Incidents" ? "red" : 
                         item.type === "Requests" ? "green" :
                         item.type === "Problems" ? "orange" :
                         "blue"}
                />
              ))}
            </div>
          </div>

          {/* Ticket Status Overview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Active Ticket Status</h3>
            <div className="grid grid-cols-2 gap-4">
              {statusDistribution.slice(0, 4).map((item) => (
                <MetricCard
                  key={item.status}
                  title={item.status}
                  value={item.count}
                  icon={item.status === "New" ? Plus :
                        item.status === "Assigned" ? User :
                        item.status === "In Progress" ? Activity :
                        Clock}
                  trend={{
                    label: "of active",
                    value: `${item.percentage}%`,
                  }}
                  color={item.status === "New" ? "blue" :
                         item.status === "Assigned" ? "purple" :
                         item.status === "In Progress" ? "orange" :
                         "red"}
                />
              ))}
            </div>
          </div>
        </div>

      {/* SLA and Assignment Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SLA Status Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">SLA Status</h3>
            <div className="grid grid-cols-1 gap-4">
              <MetricCard
                title="SLA Breached"
                value={slaStatus.breached}
                icon={XCircle}
                change={{
                  value: slaStatus.breached.toString(),
                  type: "increase",
                  label: "critical violations",
                }}
                color="red"
              />
              <MetricCard
                title="Due in 2 Hours"
                value={slaStatus.dueIn2Hours}
                icon={Clock}
                trend={{
                  label: "approaching",
                  value: "urgent",
                }}
                color="orange"
              />
              <MetricCard
                title="Due Today"
                value={slaStatus.dueToday}
                icon={Calendar}
                trend={{
                  label: "resolution",
                  value: "deadline",
                }}
                color="purple"
              />
            </div>
          </div>

          {/* Assignment Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Assignees</h3>
            <div className="grid grid-cols-1 gap-4">
              {assignmentDistribution.slice(0, 3).map((assignee, index) => (
                <MetricCard
                  key={index}
                  title={assignee.name}
                  value={assignee.count}
                  icon={assignee.name === "Unassigned" ? AlertTriangle : User}
                  trend={{
                    label: assignee.team,
                    value: assignee.status === "online" ? "online" : "offline",
                  }}
                  color={assignee.name === "Unassigned" ? "red" :
                         assignee.status === "online" ? "green" : 
                         "blue"}
                />
              ))}
            </div>
          </div>
        </div>

      {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tickets */}
          <Card className="col-span-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-xl border border-gray-200/60 dark:border-gray-700/60 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-gray-700/50 dark:to-gray-600/50 border-b border-gray-200/50 dark:border-gray-600/50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Tickets</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Latest service desk requests and incidents
                    </p>
                  </div>
                </div>
                <div className="bg-blue-100/70 dark:bg-blue-900/70 rounded-2xl p-3 border border-blue-200/50 dark:border-blue-700/50">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Recent tickets data */}
              {tickets.slice(0, 4).map((ticket) => (
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
                        {ticket.ticket_number || ticket.id}
                      </span>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {ticket.title}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {ticket.requester_email}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-xl border border-gray-200/60 dark:border-gray-700/60 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-red-50/80 to-orange-50/80 dark:from-gray-700/50 dark:to-gray-600/50 border-b border-gray-200/50 dark:border-gray-600/50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Alerts</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      System notifications and warnings
                    </p>
                  </div>
                </div>
                <div className="bg-red-100/70 dark:bg-red-900/70 rounded-2xl p-3 border border-red-200/50 dark:border-red-700/50">
                  <Bell className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
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
    </div>
  );
}