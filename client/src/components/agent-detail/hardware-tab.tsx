
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, MemoryStick, Monitor, Usb, HardDrive } from "lucide-react";
import { AgentDataProcessor } from "@/lib/agent-data-processor";
import type { Agent } from "@/types/agent-types";

interface HardwareTabProps {
  agent: Agent;
  hardwareInfo: any;
  systemInfo: any;
  networkInfo: any;
  extractedUsbDevices: any[];
  storage: any[];
  metrics: any;
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-neutral-600">{label}:</span>
    <span className="font-medium">{value || "N/A"}</span>
  </div>
);

export function HardwareTab({ 
  agent, 
  hardwareInfo, 
  systemInfo, 
  networkInfo, 
  extractedUsbDevices, 
  storage, 
  metrics 
}: HardwareTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Processor Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Cpu className="w-5 h-5" />
            <span>Processor Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <Stat label="Model" value={hardwareInfo.processor} />
            <Stat label="Physical Cores" value={hardwareInfo.physicalCores} />
            <Stat label="Logical Cores" value={hardwareInfo.logicalCores} />
            <Stat label="Current Frequency" value={hardwareInfo.cpuFreq} />
            <Stat label="Max Frequency" value={hardwareInfo.maxFreq} />
            <Stat label="Architecture" value={systemInfo.architecture} />
          </div>
        </CardContent>
      </Card>

      {/* Memory Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MemoryStick className="w-5 h-5" />
            <span>Memory Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <Stat label="Total RAM" value={hardwareInfo.totalMemory} />
            <Stat label="Used" value={hardwareInfo.usedMemory} />
            <Stat label="Available" value={hardwareInfo.availableMemory} />
            <Stat label="Usage" value={`${Math.round(metrics.memoryUsage)}%`} />
          </div>
        </CardContent>
      </Card>

      {/* System Hardware */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="w-5 h-5" />
            <span>System Hardware</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <Stat label="Manufacturer" value={systemInfo.manufacturer} />
            <Stat label="Model" value={systemInfo.model} />
            <Stat label="Serial Number" value={systemInfo.serialNumber} />
            <Stat label="MAC Address" value={networkInfo.macAddresses} />
          </div>
        </CardContent>
      </Card>

      {/* USB Devices */}
      {extractedUsbDevices && extractedUsbDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Usb className="w-5 h-5" />
              <span>USB Devices ({extractedUsbDevices.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {extractedUsbDevices.map((device: any, index: number) => {
                const vendorId = device.vendor_id || 
                  AgentDataProcessor.extractVendorIdFromDeviceId(device.device_id);
                const productId = device.product_id || 
                  AgentDataProcessor.extractProductIdFromDeviceId(device.device_id);

                let manufacturer = device.manufacturer || "Unknown";
                if (manufacturer === "Unknown" || manufacturer === "(Standard system devices)") {
                  if (device.description?.includes("VendorCo ProductCode")) {
                    manufacturer = "VendorCo ProductCode";
                  } else if (device.description) {
                    const parts = device.description.split(" ");
                    if (parts.length >= 2 && parts[0] !== "USB" && parts[0] !== "Mass" && parts[0] !== "Storage") {
                      manufacturer = parts[0];
                    } else if (device.description.includes("Mass Storage")) {
                      manufacturer = "Generic Storage Manufacturer";
                    } else {
                      manufacturer = "Generic USB Manufacturer";
                    }
                  }
                }

                const connectedAt = device.first_seen || device.connection_time || new Date().toISOString();
                const disconnectedAt = device.is_connected === false ? device.last_seen : null;
                const isActive = device.is_connected !== false && device.status !== "Disconnected";

                let duration = "—";
                if (connectedAt) {
                  const connectTime = new Date(connectedAt);
                  const disconnectTime = disconnectedAt ? new Date(disconnectedAt) : new Date();
                  const diffMs = disconnectTime.getTime() - connectTime.getTime();
                  const hours = Math.floor(diffMs / (1000 * 60 * 60));
                  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
                  duration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
                }

                const connectedOn = connectedAt ? new Date(connectedAt).toLocaleDateString() : "—";
                const connectedAtTime = connectedAt ? new Date(connectedAt).toLocaleTimeString() : "—";
                const disconnectedAtTime = disconnectedAt ? new Date(disconnectedAt).toLocaleTimeString() : "—";
                const deviceState = isActive ? "Active" : "Removed";

                return (
                  <div key={`usb-${device.device_id || index}`} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        USB Device Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Manufacturer:
                            </span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {manufacturer} ✅
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Vendor ID (VID):
                            </span>
                            <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                              {vendorId && vendorId !== "unknown" && vendorId !== "N/A" ? vendorId.toUpperCase() : "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Type:
                            </span>
                            <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">
                              {device.device_type?.replace("_", " ") || device.description || "Unknown"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Product ID (PID):
                            </span>
                            <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                              {productId && productId !== "unknown" && productId !== "N/A" ? productId.toUpperCase() : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Connection History:
                      </h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-600">
                              <th className="text-left py-2 px-1 font-medium text-gray-500 dark:text-gray-400">
                                Connected On
                              </th>
                              <th className="text-left py-2 px-1 font-medium text-gray-500 dark:text-gray-400">
                                Connected At
                              </th>
                              <th className="text-left py-2 px-1 font-medium text-gray-500 dark:text-gray-400">
                                Disconnected At
                              </th>
                              <th className="text-left py-2 px-1 font-medium text-gray-500 dark:text-gray-400">
                                Duration (hh:mm:ss)
                              </th>
                              <th className="text-left py-2 px-1 font-medium text-gray-500 dark:text-gray-400">
                                Device State
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                              <td className="py-2 px-1 text-gray-900 dark:text-gray-100">
                                {connectedOn}
                              </td>
                              <td className="py-2 px-1 text-gray-900 dark:text-gray-100">
                                {connectedAtTime}
                              </td>
                              <td className="py-2 px-1 text-gray-900 dark:text-gray-100">
                                {disconnectedAtTime}
                              </td>
                              <td className="py-2 px-1 text-gray-900 dark:text-gray-100">
                                {duration}
                              </td>
                              <td className="py-2 px-1">
                                <Badge variant={deviceState === "Active" ? "default" : "secondary"} className="text-xs">
                                  {deviceState}
                                </Badge>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
