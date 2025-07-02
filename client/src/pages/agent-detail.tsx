import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/agent-detail/metric-card";
import AgentTabs from "@/components/agent-detail/agent-tabs";
import { AgentErrorBoundary } from "@/components/ui/agent-error-boundary";
import { useProcessedAgentData } from "@/lib/agent-data-processor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAgent } from "@/hooks/use-agents";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Download,
  Monitor,
  RefreshCw,
  Wifi,
  AlertTriangle,
  Users,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Shield,
  Clock,
  Info,
  ExternalLink,
  Eye,
  EyeOff,
  Activity,
  Package,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Globe,
  Calendar,
  MapPin,
  Building,
  User,
  Database,
  Server,
  Zap,
  Gauge,
  FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";

export default function AgentDetail() {
  const { id } = useParams();
  const { data: agent, isLoading, error, refetch } = useAgent(id || "");

  // Always call this hook at the top, regardless of loading/error state
  const processedData = useProcessedAgentData(agent);

  // Early return for loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded mb-4"></div>
          <div className="grid grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded"
              ></div>
            ))}
          </div>
          <div className="h-96 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Early return for error state
  if (error || !agent) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Agent Not Found
              </h3>
              <p className="text-neutral-600 mb-4">
                The requested agent could not be found or may have been removed.
              </p>
              <Link href="/agents">
                <Button>Back to Agents</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  const [autoRefresh, setAutoRefresh] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showConnectionInfo, setShowConnectionInfo] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [showVNCModal, setShowVNCModal] = useState(false);

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh || !agent) return;

    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, agent, refetch]);

  const handleRemoteConnect = async (connectionType: string) => {
    if (!agent) {
      alert("Agent data not available. Please refresh the page.");
      return;
    }

    if (agent.status !== "online") {
      alert(
        `Cannot connect: Agent is ${agent?.status || "offline"}. Only online agents support remote connections.`,
      );
      return;
    }

    // Check if we have recent data
    const lastReportTime = agent.latest_report?.collected_at;
    if (lastReportTime) {
      const reportAge = Math.floor(
        (Date.now() - new Date(lastReportTime).getTime()) / (1000 * 60),
      );
      if (reportAge > 15) {
        const proceed = confirm(
          `Warning: Agent last reported ${reportAge} minutes ago. Connection may not work properly. Continue anyway?`,
        );
        if (!proceed) return;
      }
    }

    // Log connection attempt for audit trail
    const logConnectionAttempt = async (
      type: string,
      success: boolean,
      details?: string,
    ) => {
      try {
        await fetch("/api/audit/connection-log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
          body: JSON.stringify({
            agent_id: agent.id,
            connection_type: type,
            success,
            details,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.warn("Failed to log connection attempt:", error);
      }
    };

    try {
      const portMap: { [key: string]: number } = {
        vnc: 5900,
        rdp: 3389,
        ssh: 22,
        teamviewer: 5938,
      };

      // Show connecting status
      const connectingMessage = `Initiating ${connectionType.toUpperCase()} connection to ${agent.hostname}...`;
      console.log(connectingMessage);

      const response = await fetch(`/api/agents/${agent.id}/remote-connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          connection_type: connectionType,
          port: portMap[connectionType],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        const { connection_info } = result;

        // Enhanced private IP handling
        if (connection_info.is_private_ip && connection_info.tunnel_required) {
          const tunnelMethods = connection_info.tunnel_suggestions
            ?.map(
              (s) =>
                `• ${s.method.toUpperCase()}: ${s.description}${s.command ? `\n  Command: ${s.command}` : ""}`,
            )
            .join("\n");

          const proceed = confirm(
            `🔒 NETWORK SECURITY NOTICE\n\n` +
              `Target: ${connection_info.ip_address} (Private Network)\n` +
              `Agent: ${agent.hostname}\n\n` +
              `This agent is on a private network. You'll need secure tunnel access:\n\n${tunnelMethods}\n\n` +
              `⚠️  Ensure you have proper authorization before proceeding.\n\n` +
              `Continue with connection attempt?`,
          );

          if (!proceed) {
            await logConnectionAttempt(
              connectionType,
              false,
              "User cancelled due to private IP",
            );
            return;
          }
        }

        // Enhanced connection handling with better UX
        switch (connectionType) {
          case "vnc":
            const vncUrl = `/vnc?host=${encodeURIComponent(connection_info.ip_address || agent.hostname)}&port=6080&vncport=5900&deviceName=${encodeURIComponent(agent.hostname)}&timestamp=${Date.now()}`;
            window.open(
              vncUrl,
              "_blank",
              "width=1200,height=800,scrollbars=yes,resizable=yes",
            );
            await logConnectionAttempt(
              connectionType,
              true,
              `VNC connection to ${connection_info.ip_address}`,
            );
            break;

          case "rdp":
            const rdpUrl = `/rdp?host=${encodeURIComponent(connection_info.ip_address || agent.hostname)}&port=${connection_info.port}&deviceName=${encodeURIComponent(agent.hostname)}&timestamp=${Date.now()}`;
            window.open(
              rdpUrl,
              "_blank",
              "width=1200,height=800,scrollbars=yes,resizable=yes",
            );
            await logConnectionAttempt(
              connectionType,
              true,
              `RDP connection to ${connection_info.ip_address}:${connection_info.port}`,
            );
            break;

          case "ssh":
            const sshUrl = `/ssh?host=${encodeURIComponent(connection_info.ip_address || agent.hostname)}&port=${connection_info.port}&deviceName=${encodeURIComponent(agent.hostname)}&timestamp=${Date.now()}`;
            window.open(
              sshUrl,
              "_blank",
              "width=1000,height=600,scrollbars=yes,resizable=yes",
            );
            await logConnectionAttempt(
              connectionType,
              true,
              `SSH connection to ${connection_info.ip_address}:${connection_info.port}`,
            );
            break;

          case "teamviewer":
            const tvInfo = `TeamViewer Connection Details:\n\nHost: ${connection_info.hostname}\nTeamViewer ID: ${connection_info.teamviewer_id || "Contact end user for ID"}\nIP Address: ${connection_info.ip_address}`;
            alert(tvInfo);
            await logConnectionAttempt(
              connectionType,
              true,
              "TeamViewer info displayed",
            );
            break;
        }

        // Show success notification
        console.log(
          `✅ ${connectionType.toUpperCase()} connection initiated successfully`,
        );
      } else {
        await logConnectionAttempt(connectionType, false, result.message);
        alert(
          `Connection Failed\n\n${result.message}\n\nPlease check agent connectivity and try again.`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Remote connection error:", error);
      await logConnectionAttempt(connectionType, false, errorMessage);
      alert(
        `Connection Error\n\n${errorMessage}\n\nPlease check your network connection and agent status.`,
      );
    }
  };

  const testConnectivity = async () => {
    if (!agent) return;

    setTestingConnection(true);
    try {
      const response = await fetch(
        `/api/agents/${agent.id}/test-connectivity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
          body: JSON.stringify({ port: 5900 }),
        },
      );

      const result = await response.json();
      setConnectionStatus(result);

      if (result.reachable && result.port_open) {
        alert(
          `Connection test successful! Response time: ${result.response_time.toFixed(0)}ms`,
        );
      } else {
        alert(
          "Connection test failed. Agent may not be ready for remote access.",
        );
      }
    } catch (error) {
      console.error("Connectivity test error:", error);
      alert("Failed to test connectivity");
    } finally {
      setTestingConnection(false);
    }
  };



  // Extract metrics from processed data
  const metrics = processedData?.metrics || {
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkIO: 0,
  };

  const { cpuUsage, memoryUsage, diskUsage, networkIO } = metrics;

  return (
    <AgentErrorBoundary
      fallbackTitle="Agent Detail Error"
      fallbackMessage="There was an error loading the agent details. This might be due to data processing issues or network problems."
    >
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-neutral-600 mb-4">
          <Link
            href="/agents"
            className="hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Agents
          </Link>
          <span className="mx-2">/</span>
          <span>{agent.hostname}</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/agents">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Agents</span>
              </Button>
            </Link>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Monitor className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {agent.hostname}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-neutral-600">
                  <StatusBadge status={agent.status} />

                  {/* Data freshness indicator */}
                  {processedData?.hasRecentData ? (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-600">Live data</span>
                    </div>
                  ) : processedData?.dataAge !== null ? (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-orange-600">
                        Data {processedData.dataAge} min old
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-600">No recent data</span>
                    </div>
                  )}

                  <span>
                    Last seen{" "}
                    {agent.latest_report?.collected_at
                      ? formatDistanceToNow(
                          new Date(agent.latest_report.collected_at),
                          { addSuffix: true },
                        )
                      : agent.last_seen
                        ? formatDistanceToNow(new Date(agent.last_seen), {
                            addSuffix: true,
                          })
                        : "never"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
              onClick={() => {
                refetch();
              }}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              className="flex items-center space-x-2"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Activity className="w-4 h-4" />
              <span>Auto: {autoRefresh ? "ON" : "OFF"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
              onClick={() => {
                const data = {
                  agent: agent,
                  exportedAt: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `agent-${agent.hostname}-${new Date().toISOString().split("T")[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="w-4 h-4" />
              <span>Export Data</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              onClick={() => handleRemoteConnect("vnc")}
            >
              <Monitor className="w-4 h-4" />
              <span>Connect Remotely</span>
            </Button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="CPU Usage"
            value={`${Math.round(cpuUsage)}%`}
            icon={Cpu}
            progress={cpuUsage}
            color={cpuUsage >= 90 ? "red" : cpuUsage >= 70 ? "yellow" : "green"}
          />

          <MetricCard
            title="Memory"
            value={`${Math.round(memoryUsage)}%`}
            icon={MemoryStick}
            progress={memoryUsage}
            color={
              memoryUsage >= 90 ? "red" : memoryUsage >= 70 ? "yellow" : "green"
            }
          />

          <MetricCard
            title="Disk Usage"
            value={`${diskUsage}%`}
            icon={HardDrive}
            progress={diskUsage}
            color={
              diskUsage >= 90 ? "red" : diskUsage >= 70 ? "yellow" : "green"
            }
          />

          <MetricCard
            title="Network I/O"
            value={
              networkIO > 0
                ? `${Math.round(networkIO / 1024 / 1024)} MB/s`
                : "0 MB/s"
            }
            icon={Network}
            color="blue"
          />
        </div>

        {/* Tabbed Content */}
        <AgentTabs agent={agent} processedData={processedData} />
      </div>
    </AgentErrorBoundary>
  );
}