
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Globe, Wifi, AlertTriangle } from "lucide-react";
import type { Agent } from "@/types/agent-types";

interface NetworkTabProps {
  agent: Agent;
}

export function NetworkTab({ agent }: NetworkTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-600" />
          Network Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(() => {
          try {
            const rawData = agent?.latest_report?.raw_data;
            if (!rawData) {
              return (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                  <Network className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    No network data available
                  </p>
                </div>
              );
            }

            const parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            const networkInfo = parsedData?.network_info || parsedData?.network || {};
            const systemInfo = parsedData?.system_info || {};
            const networkInterfaces = parsedData?.network_interfaces || networkInfo?.interfaces || [];

            const publicIP = networkInfo.public_ip || systemInfo.public_ip || "Unknown";
            const hostname = systemInfo.hostname || agent?.hostname || "Unknown";
            const domain = networkInfo.domain || systemInfo.domain || "Not Set";

            const allInterfaces = [];
            if (Array.isArray(networkInterfaces)) {
              networkInterfaces.forEach((networkInterface) => {
                allInterfaces.push({
                  name: networkInterface.name || networkInterface.interface,
                  type: networkInterface.type || "Unknown",
                  ip: networkInterface.ip || networkInterface.ip_address,
                  mac: networkInterface.mac || networkInterface.mac_address,
                  status: networkInterface.status || networkInterface.state || "Unknown",
                  speed: networkInterface.speed,
                  bytes_sent: networkInterface.bytes_sent,
                  bytes_recv: networkInterface.bytes_recv,
                });
              });
            }

            if (parsedData?.network_adapters) {
              Object.entries(parsedData.network_adapters).forEach(([name, adapter]) => {
                if (adapter && typeof adapter === "object") {
                  allInterfaces.push({
                    name: name,
                    type: adapter.type || "Adapter",
                    ip: adapter.ip_address || adapter.ip,
                    mac: adapter.mac_address || adapter.mac,
                    status: adapter.status || adapter.operational_status || "Unknown",
                    speed: adapter.speed || adapter.link_speed,
                    description: adapter.description,
                  });
                }
              });
            }

            const wifiInfo = networkInfo.wifi || parsedData?.wifi_info || {};
            const isWifiConnected = wifiInfo.connected || wifiInfo.status === "connected";

            const allIPs = [
              ...new Set([
                ...(networkInfo.all_ips || []),
                ...(parsedData?.ip_addresses || []),
                ...allInterfaces.map((iface) => iface.ip).filter(Boolean),
                agent?.ip_address,
              ].filter(Boolean)),
            ];

            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Public IP Address
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-blue-900 dark:text-blue-100 font-mono text-lg">
                          {publicIP}
                        </p>
                        {publicIP !== "Unknown" && publicIP !== "Unable to determine" && (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      {publicIP === "Unknown" || publicIP === "Unable to determine" ? (
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          ⚠️ Unable to detect public IP - check internet connectivity
                        </p>
                      ) : (
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          ✅ Public IP successfully detected
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                      <Network className="w-4 h-4" />
                      Active IP Address
                    </h4>
                    <p className="text-green-900 dark:text-green-100 font-mono">
                      {agent?.ip_address || "Unknown"}
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                      <Wifi className="w-4 h-4" />
                      Wi-Fi Status
                    </h4>
                    <p className="text-purple-900 dark:text-purple-100">
                      {isWifiConnected ? `Connected - ${wifiInfo.ssid || "Active"}` : "Not Connected"}
                    </p>
                  </div>
                </div>

                {allIPs.length > 0 && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-3">
                      All Detected IP Addresses ({allIPs.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {allIPs.map((ip, index) => (
                        <span key={index} className="text-sm font-mono text-yellow-900 dark:text-yellow-100 bg-yellow-100 dark:bg-yellow-800/30 px-3 py-1 rounded">
                          {ip}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <h4 className="font-medium text-indigo-800 dark:text-indigo-200 mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Geographic Location
                    </h4>

                    {(() => {
                      const location = networkInfo.location || networkInfo.geo_location;
                      const geoDetails = networkInfo.geo_details;

                      if (!location && !geoDetails) {
                        return (
                          <div className="text-center py-3">
                            <p className="text-indigo-700 dark:text-indigo-300">
                              Location not available
                            </p>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                              Enable internet access for geolocation
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {location && (
                            <div className="text-indigo-900 dark:text-indigo-100 font-medium">
                              📍 {location}
                            </div>
                          )}

                          {geoDetails && (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {geoDetails.city && (
                                <div>
                                  <span className="text-indigo-600 dark:text-indigo-400">City:</span>
                                  <span className="ml-2 text-indigo-800 dark:text-indigo-200">{geoDetails.city}</span>
                                </div>
                              )}
                              {geoDetails.region && (
                                <div>
                                  <span className="text-indigo-600 dark:text-indigo-400">Region:</span>
                                  <span className="ml-2 text-indigo-800 dark:text-indigo-200">{geoDetails.region}</span>
                                </div>
                              )}
                              {geoDetails.country && (
                                <div>
                                  <span className="text-indigo-600 dark:text-indigo-400">Country:</span>
                                  <span className="ml-2 text-indigo-800 dark:text-indigo-200">
                                    {geoDetails.country}{geoDetails.country_code && ` (${geoDetails.country_code})`}
                                  </span>
                                </div>
                              )}
                              {geoDetails.postal_code && (
                                <div>
                                  <span className="text-indigo-600 dark:text-indigo-400">Postal:</span>
                                  <span className="ml-2 text-indigo-800 dark:text-indigo-200">{geoDetails.postal_code}</span>
                                </div>
                              )}
                              {geoDetails.latitude && geoDetails.longitude && (
                                <div className="col-span-2">
                                  <span className="text-indigo-600 dark:text-indigo-400">Coordinates:</span>
                                  <span className="ml-2 text-indigo-800 dark:text-indigo-200 font-mono text-xs">
                                    {parseFloat(geoDetails.latitude).toFixed(4)}, {parseFloat(geoDetails.longitude).toFixed(4)}
                                  </span>
                                </div>
                              )}
                              {geoDetails.timezone && (
                                <div className="col-span-2">
                                  <span className="text-indigo-600 dark:text-indigo-400">Timezone:</span>
                                  <span className="ml-2 text-indigo-800 dark:text-indigo-200">{geoDetails.timezone}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {networkInfo.isp && (
                            <div className="pt-2 border-t border-indigo-200 dark:border-indigo-700">
                              <span className="text-indigo-600 dark:text-indigo-400 text-sm">ISP/Organization:</span>
                              <p className="text-indigo-800 dark:text-indigo-200 font-medium">{networkInfo.isp}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          } catch (error) {
            console.error("Error parsing network data:", error);
            return (
              <div className="text-center py-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  Error parsing network data: {error.message}
                </p>
              </div>
            );
          }
        })()}
      </CardContent>
    </Card>
  );
}
