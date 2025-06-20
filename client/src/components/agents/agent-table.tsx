import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import { Monitor, Server, Laptop, Eye, MoreHorizontal } from "lucide-react";
import type { Device } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

interface AgentTableProps {
  agents: Device[];
  isLoading: boolean;
}

const getDeviceIcon = (hostname: string) => {
  const lowerHostname = hostname.toLowerCase();
  if (lowerHostname.includes("server") || lowerHostname.includes("srv")) {
    return Server;
  } else if (
    lowerHostname.includes("laptop") ||
    lowerHostname.includes("note")
  ) {
    return Laptop;
  } else if (
    lowerHostname.includes("desktop") ||
    lowerHostname.includes("pc")
  ) {
    return Monitor;
  }
  return Monitor; // Default
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
              <div
                key={i}
                className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded"
              ></div>
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
        <p className="text-sm text-neutral-600">
          Manage and monitor all connected agents
        </p>
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
                  IP Address
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
                const cpuUsage = agent.latest_report?.cpu_usage
                  ? parseFloat(agent.latest_report.cpu_usage)
                  : 0;
                const memoryUsage = agent.latest_report?.memory_usage
                  ? parseFloat(agent.latest_report.memory_usage)
                  : 0;

                return (
                  <tr
                    key={agent.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  >
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
                          <div className="text-sm text-neutral-500">
                            {agent.ip_address}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 dark:text-blue-300 text-sm font-medium">
                            {(() => {
                              // Get assigned user from latest report or agent data - prioritize extracted data
                              const latestReport = agent.latest_report;
                              const rawData = latestReport?.raw_data
                                ? typeof latestReport.raw_data === "string"
                                  ? JSON.parse(latestReport.raw_data)
                                  : latestReport.raw_data
                                : {};

                              const assignedUser =
                                rawData.extracted_current_user ||
                                agent.assigned_user ||
                                rawData.assigned_user ||
                                rawData.current_user ||
                                rawData.user ||
                                rawData.username;

                              // Filter out system accounts and invalid values
                              if (
                                !assignedUser ||
                                assignedUser.endsWith("$") ||
                                assignedUser === "Unknown" ||
                                assignedUser === "N/A" ||
                                assignedUser.includes("SYSTEM") ||
                                assignedUser.includes("NETWORK SERVICE") ||
                                assignedUser.includes("LOCAL SERVICE")
                              ) {
                                return "?";
                              }

                              return assignedUser.charAt(0).toUpperCase();
                            })()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {(() => {
                              // Get assigned user from latest report or agent data - prioritize extracted data
                              const latestReport = agent.latest_report;
                              const rawData = latestReport?.raw_data
                                ? typeof latestReport.raw_data === "string"
                                  ? JSON.parse(latestReport.raw_data)
                                  : latestReport.raw_data
                                : {};

                              const assignedUser =
                                rawData.extracted_current_user ||
                                agent.assigned_user ||
                                rawData.assigned_user ||
                                rawData.current_user ||
                                rawData.user ||
                                rawData.username;

                              // Filter out system accounts and invalid values
                              if (
                                !assignedUser ||
                                assignedUser.endsWith("$") ||
                                assignedUser === "Unknown" ||
                                assignedUser === "N/A" ||
                                assignedUser.includes("SYSTEM") ||
                                assignedUser.includes("NETWORK SERVICE") ||
                                assignedUser.includes("LOCAL SERVICE")
                              ) {
                                return "Unassigned";
                              }

                              // Handle domain users like "DOMAIN\user"
                              if (assignedUser.includes("\\")) {
                                return assignedUser.split("\\").pop() || assignedUser;
                              }

                              // Return username part if it's an email
                              return assignedUser.includes("@")
                                ? assignedUser.split("@")[0]
                                : assignedUser;
                            })()}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {(() => {
                              // Get assigned user from latest report or agent data - prioritize extracted data
                              const latestReport = agent.latest_report;
                              const rawData = latestReport?.raw_data
                                ? typeof latestReport.raw_data === "string"
                                  ? JSON.parse(latestReport.raw_data)
                                  : latestReport.raw_data
                                : {};

                              const assignedUser =
                                rawData.extracted_current_user ||
                                agent.assigned_user ||
                                rawData.assigned_user ||
                                rawData.current_user ||
                                rawData.user ||
                                rawData.username;

                              // Filter out system accounts and invalid values
                              if (
                                !assignedUser ||
                                assignedUser.endsWith("$") ||
                                assignedUser === "Unknown" ||
                                assignedUser === "N/A" ||
                                assignedUser.includes("SYSTEM") ||
                                assignedUser.includes("NETWORK SERVICE") ||
                                assignedUser.includes("LOCAL SERVICE")
                              ) {
                                return "No user assigned";
                              }

                              return assignedUser;
                            })()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {(() => {
                          // Try to get IP from latest report raw data first - prioritize extracted IP
                          const latestReport = agent.latest_report;
                          const rawData = latestReport?.raw_data
                            ? typeof latestReport.raw_data === "string"
                              ? JSON.parse(latestReport.raw_data)
                              : latestReport.raw_data
                            : {};

                          // First check if we have extracted IP address from server processing
                          if (rawData.extracted_ip_address) {
                            return rawData.extracted_ip_address;
                          }

                          // Check agent database field
                          if (agent.ip_address && agent.ip_address !== "N/A") {
                            return agent.ip_address;
                          }

                          // Function to get Ethernet IP
                          const getEthernetIP = () => {
                            const interfaces =
                              rawData.network?.interfaces ||
                              agent.network?.interfaces ||
                              [];
                            for (const iface of interfaces) {
                              const name = iface.name?.toLowerCase() || "";
                              if (
                                (name.includes("eth") ||
                                  name.includes("ethernet") ||
                                  name.includes("enet") ||
                                  name.includes("local area connection")) &&
                                !name.includes("veth") &&
                                !name.includes("virtual") &&
                                iface.stats?.is_up !== false
                              ) {
                                for (const addr of iface.addresses || []) {
                                  if (
                                    addr.family === "AF_INET" &&
                                    !addr.address.startsWith("127.") &&
                                    !addr.address.startsWith("169.254.") &&
                                    addr.address !== "0.0.0.0"
                                  ) {
                                    return addr.address;
                                  }
                                }
                              }
                            }
                            return null;
                          };

                          // Function to get WiFi IP
                          const getWiFiIP = () => {
                            const interfaces =
                              rawData.network?.interfaces ||
                              agent.network?.interfaces ||
                              [];
                            for (const iface of interfaces) {
                              const name = iface.name?.toLowerCase() || "";
                              if (
                                (name.includes("wifi") ||
                                  name.includes("wlan") ||
                                  name.includes("wireless") ||
                                  name.includes("wi-fi") ||
                                  name.includes("802.11")) &&
                                iface.stats?.is_up !== false
                              ) {
                                for (const addr of iface.addresses || []) {
                                  if (
                                    addr.family === "AF_INET" &&
                                    !addr.address.startsWith("127.") &&
                                    !addr.address.startsWith("169.254.") &&
                                    addr.address !== "0.0.0.0"
                                  ) {
                                    return addr.address;
                                  }
                                }
                              }
                            }
                            return null;
                          };

                          // Function to get any active IP
                          const getAnyActiveIP = () => {
                            const interfaces =
                              rawData.network?.interfaces ||
                              agent.network?.interfaces ||
                              [];
                            for (const iface of interfaces) {
                              const name = iface.name?.toLowerCase() || "";
                              const isVirtual =
                                name.includes("virtual") ||
                                name.includes("veth") ||
                                name.includes("docker") ||
                                name.includes("vmware");

                              if (!isVirtual && iface.stats?.is_up !== false) {
                                for (const addr of iface.addresses || []) {
                                  if (
                                    addr.family === "AF_INET" &&
                                    addr.address &&
                                    !addr.address.startsWith("127.") &&
                                    !addr.address.startsWith("169.254.") &&
                                    addr.address !== "0.0.0.0"
                                  ) {
                                    return addr.address;
                                  }
                                }
                              }
                            }
                            return null;
                          };

                          // Try to get IP in order of preference: Ethernet -> WiFi -> Any Active -> Fallback
                          const ethernetIP = getEthernetIP();
                          if (ethernetIP) return ethernetIP;

                          const wifiIP = getWiFiIP();
                          if (wifiIP) return wifiIP;

                          const anyIP = getAnyActiveIP();
                          if (anyIP) return anyIP;

                          // Final fallback
                          return rawData.ip_address || "N/A";
                        })()}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {(() => {
                          const latestReport = agent.latest_report;
                          const rawData = latestReport?.raw_data
                            ? typeof latestReport.raw_data === "string"
                              ? JSON.parse(latestReport.raw_data)
                              : latestReport.raw_data
                            : {};

                          // Show location if available
                          if (rawData.extracted_location_data && rawData.extracted_location_data.city) {
                            const location = rawData.extracted_location_data;
                            return `📍 ${location.city}, ${location.country || location.region}`;
                          }

                          // Show public IP if available
                          if (rawData.extracted_public_ip) {
                            return `Public IP: ${rawData.extracted_public_ip}`;
                          }

                          // Show MAC address or network info
                          if (rawData.extracted_primary_mac) {
                            return `MAC: ${rawData.extracted_primary_mac}`;
                          }

                          if (rawData.extracted_mac_addresses?.length > 0) {
                            const firstMac = rawData.extracted_mac_addresses[0];
                            return `MAC: ${typeof firstMac === 'object' ? firstMac.mac : firstMac}`;
                          }

                          return "Network info unavailable";
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={agent.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {agent.last_seen
                        ? formatDistanceToNow(new Date(agent.last_seen), {
                            addSuffix: true,
                          })
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-neutral-900 dark:text-neutral-100">
                          {agent.os_name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {agent.latest_report ? (
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <div className="w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mr-3">
                              <div
                                className={`h-2 rounded-full ${getProgressBarColor(cpuUsage)}`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, cpuUsage))}%`,
                                }}
                              ></div>
                            </div>
                            <span
                              className={`text-xs font-medium ${
                                cpuUsage >= 90
                                  ? "text-red-600"
                                  : cpuUsage >= 70
                                    ? "text-yellow-600"
                                    : "text-green-600"
                              }`}
                            >
                              {cpuUsage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mr-3">
                              <div
                                className={`h-2 rounded-full ${
                                  memoryUsage >= 90
                                    ? "bg-red-500"
                                    : memoryUsage >= 70
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, memoryUsage))}%`,
                                }}
                              ></div>
                            </div>
                            <span
                              className={`text-xs font-medium ${
                                memoryUsage >= 90
                                  ? "text-red-600"
                                  : memoryUsage >= 70
                                    ? "text-yellow-600"
                                    : "text-green-600"
                              }`}
                            >
                              {memoryUsage.toFixed(1)}%
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
            Showing <span className="font-medium">1</span> to{" "}
            <span className="font-medium">{agents.length}</span> of{" "}
            <span className="font-medium">{agents.length}</span> results
          </div>
        </div>
      </CardContent>
    </Card>
  );
}