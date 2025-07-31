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
import { ALERT_THRESHOLDS, getAlertLevel, getAlertColor } from "@shared/alert-thresholds";
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
  XCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

// Helper function to get alert level display text
const getAlertLevelDisplay = (level) => {
  switch (level) {
    case "critical":
      return "CRITICAL";
    case "high":
      return "HIGH";
    case "warning":
      return "WARNING";
    case "info":
      return "INFO";
    default:
      return "NORMAL";
  }
};

export default function Dashboard() {
  const [location, setLocation] = useLocation();
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

  // Add AI insights and security overview data fetching
  const { data: aiInsights } = useQuery({
    queryKey: ["dashboard-ai-insights"],
    queryFn: async () => {
      try {
        const response = await api.get("/api/ai-insights");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.warn("Failed to fetch AI insights:", error);
        return {};
      }
    },
    refetchInterval: 60000,
    retry: 1,
    staleTime: 30000,
  });

  const { data: securityOverview } = useQuery({
    queryKey: ["security-overview"],
    queryFn: async () => {
      try {
        const response = await api.get("/api/security-overview");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.warn("Failed to fetch security overview:", error);
        return {
          threatLevel: 'unknown',
          activeThreats: 0,
          vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
          complianceScore: 0
        };
      }
    },
    refetchInterval: 30000,
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

  const { data: recentTickets, isLoading: recentTicketsLoading, error: recentTicketsError } = useQuery({
    queryKey: ['recent-tickets'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/tickets?limit=5&page=1');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();

        // Handle different response formats
        const ticketsData = Array.isArray(result?.data) 
          ? result.data 
          : result?.data?.tickets || 
            result?.tickets || 
            (Array.isArray(result) ? result : []);

        console.log('Recent tickets fetched:', ticketsData.length, 'tickets');
        return ticketsData.slice(0, 5);
      } catch (error) {
        console.warn('Failed to fetch recent tickets:', error);
        return [];
      }
    },
    refetchInterval: 30000,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5000
  });

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
                    <span className="block mt-1 text-blue-600 dark:text-blue-400">
                      Thresholds: CPU/Memory/Disk {ALERT_THRESHOLDS.CPU.CRITICAL}%+ Critical
                    </span>
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
            title="Active Alerts"
            value={alerts?.filter(alert => !alert.resolved).length || 0}
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

      {/* ITSM Overview Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ticket Distribution by Type */}
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-xl border border-gray-200/60 dark:border-gray-700/60 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-gray-700/50 dark:to-gray-600/50 border-b border-gray-200/50 dark:border-gray-600/50 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Active Ticket Distribution
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Breakdown by ticket type (open tickets only)
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-5">
                {ticketDistribution.map((item) => (
                  <div key={item.type} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${item.color} shadow-sm`}></div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.type}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200/70 dark:bg-gray-700/70 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${item.color} transition-all duration-500 ease-out shadow-sm`}
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.percentage}% of total active tickets
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ticket Status Overview */}
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-xl border border-gray-200/60 dark:border-gray-700/60 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-gray-700/50 dark:to-gray-600/50 border-b border-gray-200/50 dark:border-gray-600/50 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Active Ticket Status
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Status of open tickets only
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {statusDistribution.map((item) => (
                  <div key={item.status} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/30 dark:border-gray-600/30 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${item.color} shadow-sm`}></div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.status}</span>
                      {item.urgency === "attention" && (
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100 px-3 py-1 bg-white/70 dark:bg-gray-800/70 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      {/* SLA and Assignment Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SLA Violations */}
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-xl border border-red-200/60 dark:border-red-700/60 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group">
            <CardHeader className="bg-gradient-to-r from-red-50/80 to-pink-50/80 dark:from-gray-700/50 dark:to-gray-600/50 border-b border-red-200/50 dark:border-red-600/50 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    SLA Status
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Tickets approaching or exceeding SLA
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-2xl border border-red-200/50 dark:border-red-700/50 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="text-sm font-semibold text-red-800 dark:text-red-200">SLA Breached</p>
                      <p className="text-xs text-red-600 dark:text-red-300">
                        {slaStatus.responseBreaches > 0 && slaStatus.resolutionBreaches > 0 
                          ? `${slaStatus.responseBreaches} Response + ${slaStatus.resolutionBreaches} Resolution`
                          : slaStatus.responseBreaches > 0 
                          ? `${slaStatus.responseBreaches} Response Breach${slaStatus.responseBreaches > 1 ? 'es' : ''}`
                          : `${slaStatus.resolutionBreaches} Resolution Breach${slaStatus.resolutionBreaches > 1 ? 'es' : ''}`
                        }
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400 px-3 py-1 bg-white/70 dark:bg-gray-800/70 rounded-xl">
                    {slaStatus.breached}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-2xl border border-orange-200/50 dark:border-orange-700/50 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">Due in 2 Hours</p>
                      <p className="text-xs text-orange-600 dark:text-orange-300">Response time approaching</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400 px-3 py-1 bg-white/70 dark:bg-gray-800/70 rounded-xl">
                    {slaStatus.dueIn2Hours}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-2xl border border-yellow-200/50 dark:border-yellow-700/50 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Due Today</p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-300">Resolution time approaching</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 px-3 py-1 bg-white/70 dark:bg-gray-800/70 rounded-xl">
                    {slaStatus.dueToday}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Overview */}
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-xl border border-gray-200/60 dark:border-gray-700/60 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-purple-50/80 to-violet-50/80 dark:from-gray-700/50 dark:to-gray-600/50 border-b border-gray-200/50 dark:border-gray-600/50 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Assignments
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Ticket distribution by assignee
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {assignmentDistribution.map((assignee, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/40 dark:border-gray-600/40 hover:bg-gray-100/60 dark:hover:bg-gray-700/50 transition-all duration-200">
                    <div className="flex items-center space-x-4">
                      <div className={`w-4 h-4 rounded-full shadow-sm ${
                        assignee.status === "online" ? "bg-green-500 animate-pulse" :
                        assignee.status === "away" ? "bg-yellow-500" : "bg-gray-400"
                      }`}></div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{assignee.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{assignee.team}</p>
                        </div>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100 px-3 py-1 bg-white/70 dark:bg-gray-800/70 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
                      {assignee.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
            <CardContent className="p-0">
              {recentTicketsLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-neutral-600">Loading tickets...</p>
                </div>
              ) : recentTicketsError ? (
                <div className="p-6 text-center">
                  <div className="text-red-500 mb-2">⚠️</div>
                  <p className="text-sm text-neutral-600">Unable to load recent tickets</p>
                  <p className="text-xs text-neutral-400 mt-1">Check network connection</p>
                </div>
              ) : (recentTickets && recentTickets.length > 0) || (tickets && tickets.length > 0) ? (
                <div className="space-y-4">
                  {((recentTickets && recentTickets.length > 0) ? recentTickets : tickets.slice(0, 5))
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 4)
                    .map((ticket) => {
                      // Get alert levels for system metrics if available
                      const cpuLevel = ticket.cpu_usage ? getAlertLevel(ticket.cpu_usage, 'CPU') : 'info';
                      const memoryLevel = ticket.memory_usage ? getAlertLevel(ticket.memory_usage, 'MEMORY') : 'info';
                      const diskLevel = ticket.disk_usage ? getAlertLevel(ticket.disk_usage, 'DISK') : 'info';

                      return (
                      <div
                        key={ticket.id}
                        className={`flex items-start space-x-3 p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all duration-200 ${
                          ticket.priority === "critical"
                            ? "bg-gradient-to-r from-red-50 to-red-100 border-red-200 dark:from-red-900/20 dark:to-red-800/20 dark:border-red-700 hover:from-red-100 hover:to-red-150"
                            : ticket.priority === "high"
                              ? "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 dark:from-orange-900/20 dark:to-orange-800/20 dark:border-orange-700 hover:from-orange-100 hover:to-orange-150"
                              : ticket.priority === "medium"
                                ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200 dark:from-yellow-900/20 dark:to-yellow-800/20 dark:border-yellow-700 hover:from-yellow-100 hover:to-yellow-150"
                                : "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-700 hover:from-blue-100 hover:to-blue-150"
                        }`}
                        onClick={() => setLocation(`/tickets/${ticket.id}`)}
                      >
                        <div
                          className={`w-3 h-3 rounded-full mt-2 shadow-sm ${
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
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-mono text-xs text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 px-2 py-1 rounded">
                              {ticket.ticket_number || ticket.id?.split('-')[0]}
                            </span>
                            <StatusBadge status={ticket.status} />
                            {ticket.priority === "critical" && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Critical
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                            {ticket.title || "No title"}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <User className="w-3 h-3 inline mr-1" />
                            {ticket.requester_email || "Unknown requester"}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {ticket.created_at 
                                ? formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })
                                : "Unknown time"
                              }
                            </p>
                            {ticket.assigned_to && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center">
                                <User className="w-3 h-3 mr-1" />
                                {ticket.assigned_to}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    );
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
                    No Tickets Found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No tickets have been created yet
                  </p>
                  <button
                    onClick={() => setLocation("/tickets")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Create First Ticket
                  </button>
                </div>
              )}
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