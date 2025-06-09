import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Cpu,
  Download,
  HardDrive,
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AgentDetail() {
  const { id } = useParams();
  const { data: agent, isLoading, error } = useAgent(id || "");
  const [showVNCModal, setShowVNCModal] = useState(false);

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
              window.location.reload();
            }}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
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
            onClick={() => setShowVNCModal(true)}
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

      {/* VNC Modal */}
      <Dialog open={showVNCModal} onOpenChange={setShowVNCModal}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-0">
          <DialogHeader className="p-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Remote Desktop - {agent.hostname}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    agent.status === "online" ? "default" : "destructive"
                  }
                >
                  {agent.status}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const iframe = document.querySelector(
                      'iframe[title*="VNC"]',
                    ) as HTMLIFrameElement;
                    if (iframe) {
                      iframe.src = iframe.src; // Reload iframe
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reconnect
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 p-4 pt-0 bg-gray-900">
            {agent.status !== "online" ? (
              <div className="flex flex-col items-center justify-center h-full text-white">
                <XCircle className="w-16 h-16 text-red-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Agent Offline</h3>
                <p className="text-gray-300 text-center mb-4">
                  The agent {agent.hostname} is currently offline. Remote
                  desktop connection is not available.
                </p>
                <div className="text-sm text-gray-400">
                  Last seen:{" "}
                  {agent.latest_report?.collected_at
                    ? formatDistanceToNow(
                        new Date(agent.latest_report.collected_at),
                        { addSuffix: true },
                      )
                    : "never"}
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full">
                <iframe
                  src={`/vnc?host=${agent.hostname}&port=6080&vncport=5900&embed=true`}
                  className="w-full h-full border-0 rounded bg-black"
                  title={`VNC connection to ${agent.hostname}`}
                  onLoad={() => {
                    console.log("VNC iframe loaded");
                  }}
                  onError={() => {
                    console.error("VNC iframe failed to load");
                  }}
                />

                {/* Connection overlay with instructions */}
                <div className="absolute top-4 left-4 bg-black/80 text-white p-3 rounded-lg max-w-md">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Connection Info
                  </h4>
                  <div className="text-sm space-y-1">
                    <div>Host: {agent.hostname}</div>
                    <div>IP: {agent.ip_address || "Unknown"}</div>
                    <div>VNC Port: 5900</div>
                    <div className="text-yellow-300 mt-2">
                      ⚠️ Ensure VNC server is running on the target machine
                    </div>
                  </div>
                </div>

                {/* Troubleshooting panel */}
                <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg max-w-sm">
                  <h4 className="font-semibold mb-2">Troubleshooting</h4>
                  <div className="text-xs space-y-1">
                    <div>• Install VNC server on target machine</div>
                    <div>• Configure VNC to accept connections</div>
                    <div>• Check firewall settings (port 5900)</div>
                    <div>• Verify network connectivity</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full text-black"
                    onClick={() => {
                      // Open agent management guide
                      window.open("/knowledge-base", "_blank");
                    }}
                  >
                    <HelpCircle className="w-3 h-3 mr-1" />
                    Setup Guide
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
