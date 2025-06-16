import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/agent-detail/metric-card";
import AgentTabs from "@/components/agent-detail/agent-tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAgent } from "@/hooks/use-agents";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Cpu,
  Download,
  HardDrive,
  HelpCircle,
  Info,
  Memory,
  MemoryStick,
  Monitor,
  Network,
  RefreshCw,
  Settings,
  Shield,
  Usb,
  Wifi,
  XCircle,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";

export default function AgentDetail() {
  const { id } = useParams();
  const { data: agent, isLoading, error, refetch } = useAgent(id || "");
  const [showVNCModal, setShowVNCModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showConnectionInfo, setShowConnectionInfo] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh || !agent) return;

    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, agent, refetch]);

  const handleRemoteConnect = async (connectionType: string) => {
    if (!agent || agent.status !== 'online') {
      return;
    }

    try {
      const portMap: { [key: string]: number } = {
        vnc: 5900,
        rdp: 3389,
        ssh: 22,
        teamviewer: 5938
      };

      const response = await fetch(`/api/agents/${agent.id}/remote-connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
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
        switch (connectionType) {
          case "vnc":
            const vncUrl = `/vnc?host=${encodeURIComponent(agent.hostname)}&port=6080&vncport=5900&deviceName=${encodeURIComponent(agent.hostname)}`;
            window.open(vncUrl, "_blank");
            break;

          case "rdp":
            const rdpUrl = `/rdp?host=${encodeURIComponent(agent.hostname)}&port=${result.connection_info.port}&deviceName=${encodeURIComponent(agent.hostname)}`;
            window.open(rdpUrl, "_blank");
            break;

          case "ssh":
            const sshUrl = `/ssh?host=${encodeURIComponent(agent.hostname)}&port=${result.connection_info.port}&deviceName=${encodeURIComponent(agent.hostname)}`;
            window.open(sshUrl, "_blank");
            break;

          case "teamviewer":
            // Show TeamViewer connection info
            alert(`TeamViewer Connection:\nHost: ${result.connection_info.hostname}\nID: ${result.connection_info.teamviewer_id || 'Contact user for ID'}`);
            break;
        }
      } else {
        alert('Failed to initiate remote connection: ' + result.message);
      }
    } catch (error) {
      console.error("Error connecting remotely:", error);
      alert('Failed to initiate remote connection: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const testConnectivity = async () => {
    if (!agent) return;

    setTestingConnection(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}/test-connectivity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ port: 5900 })
      });

      const result = await response.json();
      setConnectionStatus(result);

      if (result.reachable && result.port_open) {
        alert(`Connection test successful! Response time: ${result.response_time.toFixed(0)}ms`);
      } else {
        alert('Connection test failed. Agent may not be ready for remote access.');
      }
    } catch (error) {
      console.error('Connectivity test error:', error);
      alert('Failed to test connectivity');
    } finally {
      setTestingConnection(false);
    }
  };

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

  const cpuUsage = agent.latest_report?.cpu_usage
    ? parseFloat(parseFloat(agent.latest_report.cpu_usage).toFixed(2))
    : 0;

  const memoryUsage = agent.latest_report?.memory_usage
    ? parseFloat(parseFloat(agent.latest_report.memory_usage).toFixed(2))
    : 0;

  const diskUsage = agent.latest_report?.disk_usage
    ? parseFloat(parseFloat(agent.latest_report.disk_usage).toFixed(2))
    : 0;

  const networkIO = agent.latest_report?.network_io
    ? parseInt(agent.latest_report.network_io)
    : 0;

  return (
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Button
          variant="outline"
          className="flex items-center space-x-2 h-auto p-4"
          onClick={() => handleRemoteConnect("vnc")}
        >
          <Monitor className="w-5 h-5" />
          <div className="text-left">
            <div className="font-medium">Remote Desktop</div>
            <div className="text-xs text-muted-foreground">Connect via VNC</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="flex items-center space-x-2 h-auto p-4"
          onClick={testConnectivity}
          disabled={testingConnection}
        >
          <Network className="w-5 h-5" />
          <div className="text-left">
            <div className="font-medium">Test Connection</div>
            <div className="text-xs text-muted-foreground">
              {testingConnection ? "Testing..." : "Ping & Port Check"}
            </div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="flex items-center space-x-2 h-auto p-4"
          onClick={() => {
            // Create ticket for this agent
            window.open(`/tickets/new?agent=${agent.id}&hostname=${agent.hostname}`, '_blank');
          }}
        >
          <AlertTriangle className="w-5 h-5" />
          <div className="text-left">
            <div className="font-medium">Create Ticket</div>
            <div className="text-xs text-muted-foreground">Report Issue</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="flex items-center space-x-2 h-auto p-4"
          onClick={() => setShowConnectionInfo(true)}
        >
          <Info className="w-5 h-5" />
          <div className="text-left">
            <div className="font-medium">Agent Info</div>
            <div className="text-xs text-muted-foreground">View Details</div>
          </div>
        </Button>
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
          color={diskUsage >= 90 ? "red" : diskUsage >= 70 ? "yellow" : "green"}
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
      <AgentTabs agent={agent} />
    </div>
  );
}