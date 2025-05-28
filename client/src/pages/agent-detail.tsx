import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/agent-detail/metric-card";
import { AgentTabs } from "@/components/agent-detail/agent-tabs";
import { useAgent } from "@/hooks/use-agents";
import { ArrowLeft, RefreshCw, Download, Monitor, Cpu, HardDrive, Network } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AgentDetailProps {
  params: {
    id: string;
  };
}

export default function AgentDetail({ params }: AgentDetailProps) {
  const { data: agent, isLoading, refetch } = useAgent(params.id);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Monitor className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Agent Not Found
          </h2>
          <p className="text-neutral-600 mb-4">
            The agent you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/agents">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Agents
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const cpuUsage = agent.latest_report?.cpu_usage ? parseFloat(agent.latest_report.cpu_usage) : 0;
  const memoryUsage = agent.latest_report?.memory_usage ? parseFloat(agent.latest_report.memory_usage) : 0;
  const diskUsage = agent.latest_report?.disk_usage ? parseFloat(agent.latest_report.disk_usage) : 0;
  const networkIO = agent.latest_report?.network_io ? parseInt(agent.latest_report.network_io) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-neutral-600 mb-4">
        <Link href="/agents" className="hover:text-neutral-900 dark:hover:text-neutral-100">Agents</Link>
        <span className="mx-2">/</span>
        <span>{agent.hostname}</span>
      </nav>

      {/* Agent Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/agents">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Monitor className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {agent.hostname}
                  </h1>
                  <div className="flex items-center space-x-4 mt-1">
                    <StatusBadge status={agent.status} />
                    <span className="text-sm text-neutral-600">
                      {agent.assigned_user?.split("@")[0] || "Unassigned"}
                    </span>
                    <span className="text-sm text-neutral-600">{agent.ip_address}</span>
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">
                    Last seen: {agent.last_seen 
                      ? formatDistanceToNow(new Date(agent.last_seen), { addSuffix: true })
                      : "Never"
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="CPU Usage"
          value={`${cpuUsage}%`}
          icon={Cpu}
          progress={cpuUsage}
          color={cpuUsage >= 90 ? "red" : cpuUsage >= 70 ? "yellow" : "green"}
        />
        
        <MetricCard
          title="Memory"
          value={`${memoryUsage}%`}
          icon={HardDrive}
          progress={memoryUsage}
          color={memoryUsage >= 90 ? "red" : memoryUsage >= 70 ? "yellow" : "green"}
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
          value={networkIO > 0 ? `${Math.round(networkIO / 1024 / 1024)} MB/s` : "0 MB/s"}
          icon={Network}
          color="blue"
        />
      </div>

      {/* Tabbed Content */}
      <AgentTabs agent={agent} />
    </div>
  );
}
