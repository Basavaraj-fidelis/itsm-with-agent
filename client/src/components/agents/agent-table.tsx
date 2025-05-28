import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import { Monitor, Server, Laptop, Eye, MoreHorizontal } from "lucide-react";
import type { Device } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

interface AgentTableProps {
  agents: Device[];
  isLoading: boolean;
}

const getDeviceIcon = (hostname: string) => {
  if (hostname.includes("SRV")) return Server;
  if (hostname.includes("LAP")) return Laptop;
  return Monitor;
};

const getProgressBarColor = (value: number) => {
  if (value >= 90) return "bg-red-500";
  if (value >= 70) return "bg-yellow-500"; 
  return "bg-green-500";
};

export function AgentTable({ agents, isLoading }: AgentTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Agents</CardTitle>
        <p className="text-sm text-neutral-600">Manage and monitor all connected agents</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  <Checkbox />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Hostname
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Assigned User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Last Seen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  OS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
              {agents.map((agent) => {
                const DeviceIcon = getDeviceIcon(agent.hostname);
                const cpuUsage = agent.latest_report?.cpu_usage ? parseFloat(agent.latest_report.cpu_usage) : 0;
                const memoryUsage = agent.latest_report?.memory_usage ? parseFloat(agent.latest_report.memory_usage) : 0;
                
                return (
                  <tr key={agent.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Checkbox />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DeviceIcon className="w-5 h-5 text-neutral-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {agent.hostname}
                          </div>
                          <div className="text-sm text-neutral-500">{agent.ip_address}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 dark:text-blue-300 text-sm font-medium">
                            {agent.assigned_user?.charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {agent.assigned_user?.split("@")[0] || "Unassigned"}
                          </div>
                          <div className="text-sm text-neutral-500">{agent.assigned_user}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={agent.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {agent.last_seen 
                        ? formatDistanceToNow(new Date(agent.last_seen), { addSuffix: true })
                        : "Never"
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-neutral-900 dark:text-neutral-100">
                          {agent.os_name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {agent.status === "online" && agent.latest_report ? (
                        <div className="flex space-x-2">
                          <div className="flex items-center">
                            <span className="text-xs text-neutral-500 mr-1">CPU:</span>
                            <span className={`text-xs font-medium ${
                              cpuUsage >= 90 ? "text-red-600" : 
                              cpuUsage >= 70 ? "text-yellow-600" : "text-green-600"
                            }`}>
                              {cpuUsage}%
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs text-neutral-500 mr-1">RAM:</span>
                            <span className={`text-xs font-medium ${
                              memoryUsage >= 90 ? "text-red-600" : 
                              memoryUsage >= 70 ? "text-yellow-600" : "text-green-600"
                            }`}>
                              {memoryUsage}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link href={`/agents/${agent.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-white dark:bg-neutral-800 px-4 py-3 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 mt-4">
          <div className="text-sm text-neutral-700 dark:text-neutral-300">
            Showing <span className="font-medium">1</span> to <span className="font-medium">{agents.length}</span> of{" "}
            <span className="font-medium">{agents.length}</span> results
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
