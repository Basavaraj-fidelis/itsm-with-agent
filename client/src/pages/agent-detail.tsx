import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/agent-detail/metric-card";
import AgentTabs from "@/components/agent-detail/agent-tabs";
import { AgentErrorBoundary } from "@/components/ui/agent-error-boundary";
import { useProcessedAgentData } from "@/lib/agent-data-processor";
import { useAgent } from "@/hooks/use-agents";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Download,
  Monitor,
  RefreshCw,
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
} from "lucide-react";

export default function AgentDetail() {
  const { id } = useParams();

  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - NO EXCEPTIONS
  const { data: agent, isLoading, error, refetch } = useAgent(id || "");
  const processedData = useProcessedAgentData(agent);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showConnectionInfo, setShowConnectionInfo] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [showVNCModal, setShowVNCModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const { data: device } = useQuery({
    queryKey: ["device", id],
    queryFn: () => api.getDevice(id!),
    enabled: !!id,
  });

  const { data: aiInsights } = useQuery({
    queryKey: ["aiInsights", id],
    queryFn: () => api.getDeviceAIInsights(id!),
    enabled: !!id,
  });

  const { data: advancedMetrics } = useQuery({
    queryKey: ["advancedMetrics", id],
    queryFn: () => api.getAdvancedDeviceAnalytics(id!),
    enabled: !!id,
  });

  // Auto-refresh effect - must be called at top level
  useEffect(() => {
    if (!autoRefresh || !agent) return;

    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, agent, refetch]);

  // Memoize metrics calculation
  const metrics = useMemo(() => {
    if (!processedData?.metrics) {
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkIO: 0,
      };
    }
    return processedData.metrics;
  }, [processedData]);

  const { cpuUsage, memoryUsage, diskUsage, networkIO } = metrics;

  // Now we can do early returns after all hooks are called
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

  const handleExportData = async () => {
    if (!agent) return;

    try {
      setLoading(true);

      // Prepare agent data for export
      const params = new URLSearchParams();
      params.append("format", "xlsx");
      params.append("search", agent.hostname);

      const response = await fetch(`/api/analytics/agents-detailed-report?${params}`, {
        method: "GET",
      });

      if (response.ok) {
        const blob = await response.blob();

        if (blob.size === 0) {
          throw new Error("Empty file received from server");
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `agent-${agent.hostname}-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Agent data exported as Excel file successfully",
        });
      } else {
        // Fallback to PDF export
        const pdfParams = new URLSearchParams();
        pdfParams.append("format", "pdf");
        pdfParams.append("search", agent.hostname);

        const pdfResponse = await fetch(`/api/analytics/agents-detailed-report?${pdfParams}`, {
          method: "GET",
        });

        if (pdfResponse.ok) {
          const pdfBlob = await pdfResponse.blob();
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `agent-${agent.hostname}-${new Date().toISOString().split('T')[0]}.pdf`;
          a.click();
          URL.revokeObjectURL(url);

          toast({
            title: "Success",
            description: "Agent data exported as PDF successfully",
          });
        } else {
          throw new Error("Failed to export in both XLSX and PDF formats");
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export agent data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
              onClick={handleExportData}
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