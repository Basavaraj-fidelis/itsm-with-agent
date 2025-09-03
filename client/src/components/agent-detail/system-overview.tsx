
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import {
  Monitor,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Calendar,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import type { Agent } from "@/types/agent-types";

interface SystemOverviewProps {
  agent: Agent;
  processedData: any;
}

export function SystemOverview({ agent, processedData }: SystemOverviewProps) {
  const { systemInfo, hardwareInfo, networkInfo, storageInfo, operatingSystem } = processedData || {};

  return (
    <div className="space-y-6">
      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-600" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Hostname
                </label>
                <p className="text-lg font-semibold">{agent.hostname}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Operating System
                </label>
                <p className="text-lg">
                  {operatingSystem?.name || agent.os_name || "Unknown"}{" "}
                  {operatingSystem?.version || agent.os_version || ""}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Architecture
                </label>
                <p className="text-lg">{operatingSystem?.architecture || "Unknown"}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  IP Address
                </label>
                <p className="text-lg font-mono">{agent.ip_address || "Unknown"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Uptime
                </label>
                <p className="text-lg">
                  {systemInfo?.uptime ? `${Math.floor(systemInfo.uptime / 3600)} hours` : "Unknown"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Last Seen
                </label>
                <p className="text-lg">
                  {agent.last_seen
                    ? formatDistanceToNow(new Date(agent.last_seen), { addSuffix: true })
                    : "Never"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hardware Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-green-600" />
            Hardware Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Processor
                </label>
                <p className="text-lg">{hardwareInfo?.processor || "Unknown"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  CPU Cores
                </label>
                <p className="text-lg">{hardwareInfo?.cpuCores || "Unknown"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Memory
                </label>
                <p className="text-lg">
                  {hardwareInfo?.totalMemory 
                    ? `${(hardwareInfo.totalMemory / (1024 ** 3)).toFixed(1)} GB`
                    : "Unknown"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  System Type
                </label>
                <p className="text-lg">{hardwareInfo?.systemType || "Unknown"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5 text-purple-600" />
            Network Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {networkInfo?.interfaces && networkInfo.interfaces.length > 0 ? (
              <div className="space-y-3">
                {networkInfo.interfaces.slice(0, 3).map((interface_, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{interface_.name}</span>
                      <Badge variant={interface_.status === "Up" ? "default" : "secondary"}>
                        {interface_.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">IP: </span>
                        <span className="font-mono">{interface_.ip || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">MAC: </span>
                        <span className="font-mono">{interface_.mac || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No network interfaces found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Storage Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-orange-600" />
            Storage Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {storageInfo?.drives && storageInfo.drives.length > 0 ? (
              <div className="space-y-3">
                {storageInfo.drives.map((drive, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{drive.device || drive.name}</span>
                      <Badge variant="outline">
                        {drive.fstype || drive.filesystem}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Used: {drive.used_gb || drive.used}GB</span>
                        <span>Total: {drive.total_gb || drive.total}GB</span>
                      </div>
                      <Progress 
                        value={drive.usage_percentage || drive.percent || 0} 
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No storage information available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
