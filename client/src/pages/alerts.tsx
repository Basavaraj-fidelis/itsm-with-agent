import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Eye, Monitor, Cpu, MemoryStick, HardDrive, Usb, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAlerts } from "@/hooks/use-dashboard";
import { useQueryClient } from "@tanstack/react-query";
import { Filter } from "lucide-react";

interface Alert {
  id: string;
  device_id: string;
  device_hostname: string;
  category: string;
  severity: "critical" | "high" | "warning" | "info";
  message: string;
  metadata: any;
  triggered_at: string;
  resolved_at?: string;
  is_active: boolean;
}

export default function Alerts() {
  const { data: alerts, isLoading, refetch } = useAlerts();
  const [activeFilter, setActiveFilter] = useState("all");
  const [resolvedAlerts, setResolvedAlerts] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const filteredAlerts = alerts?.filter(alert => {
    if (resolvedAlerts.includes(alert.id)) return false;
    if (activeFilter === "all") return true;
    return alert.severity === activeFilter;
  }) || [];

  const handleResolveAlert = async (alertId: string) => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');

      // Call API to resolve the alert on the server
      const response = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Only update local state if API call succeeds
        setResolvedAlerts(prev => [...prev, alertId]);
        console.log(`Alert ${alertId} resolved successfully`);

        // Refresh the alerts data
        setTimeout(() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
        }, 1000);
      } else {
        const errorData = await response.json();
        console.error('Failed to resolve alert:', errorData.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!alerts) return;

    try {
      const token = localStorage.getItem('token');

      // Resolve all active alerts
      const promises = alerts
        .filter(alert => alert.is_active && !resolvedAlerts.includes(alert.id))
        .map(alert => 
          fetch(`/api/alerts/${alert.id}/resolve`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          })
        );

      await Promise.all(promises);

      // Update local state
      setResolvedAlerts(alerts.map(alert => alert.id));

      // Refresh data
      setTimeout(() => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      }, 1000);

      console.log('All alerts resolved successfully');
    } catch (error) {
      console.error('Error resolving all alerts:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#201F1E] dark:text-[#F3F2F1] mb-2">System Alerts</h1>
        <p className="text-neutral-600">Monitor and manage system alerts</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant={activeFilter === "all" ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveFilter("all")}
            >
              <Filter className="w-4 h-4 mr-2" />
              All Alerts
            </Button>
            <Button 
              variant={activeFilter === "critical" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setActiveFilter("critical")}
            >
              Critical
            </Button>
            <Button 
              variant={activeFilter === "high" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setActiveFilter("high")}
            >
              High
            </Button>
            <Button 
              variant={activeFilter === "warning" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setActiveFilter("warning")}
            >
              Warning
            </Button>
            <Button 
              variant={activeFilter === "info" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setActiveFilter("info")}
            >
              Info
            </Button>
          </div>
          <Button onClick={handleMarkAllAsRead}>Mark All as Read</Button>
        </div>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Active Alerts</span>
            <span className="text-sm font-normal text-neutral-600">
              {alerts?.length || 0} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAlerts && filteredAlerts.length > 0 ? (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.severity === "critical"
                      ? "border-l-red-500 bg-red-50 dark:bg-red-900/20"
                      : alert.severity === "high"
                      ? "border-l-orange-500 bg-orange-50 dark:bg-orange-900/20"
                      : alert.severity === "warning"
                      ? "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                      : "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <AlertTriangle className={`w-5 h-5 ${
                          alert.severity === "critical" ? "text-red-500" 
                          : alert.severity === "high" ? "text-orange-500"
                          : alert.severity === "warning" ? "text-yellow-500"
                          : "text-blue-500"
                        }`} />
                        <StatusBadge status={alert.severity} />
                        <span className="text-sm text-neutral-600">{alert.category}</span>
                      </div>
                      <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                        {alert.message}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-neutral-600">
                        <span>Device: {alert.device_hostname}</span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Resolve
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              {alert.category === "performance" && <Cpu className="w-5 h-5 text-orange-500" />}
                              {alert.category === "security" && <Shield className="w-5 h-5 text-blue-500" />}
                              {alert.category === "storage" && <HardDrive className="w-5 h-5 text-purple-500" />}
                              {alert.category === "system" && <Monitor className="w-5 h-5 text-green-500" />}
                              <span>Alert Details</span>
                            </DialogTitle>
                          </DialogHeader>

                          <div className="space-y-6">
                            {/* Basic Alert Information */}
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-neutral-600">Device</label>
                                  <p className="text-sm font-mono bg-neutral-100 dark:bg-neutral-800 p-2 rounded">
                                    {alert.device_hostname}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-neutral-600">Severity</label>
                                  <div className="mt-1">
                                    <Badge
                                      variant={
                                        alert.severity === "critical"
                                          ? "destructive"
                                          : alert.severity === "high"
                                          ? "destructive"
                                          : alert.severity === "warning"
                                          ? "default"
                                          : "secondary"
                                      }
                                      className={
                                        alert.severity === "high"
                                          ? "bg-orange-500 hover:bg-orange-600"
                                          : alert.severity === "warning"
                                          ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                                          : ""
                                      }
                                    >
                                      {alert.severity.toUpperCase()}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-neutral-600">Message</label>
                                <p className="text-sm bg-neutral-100 dark:bg-neutral-800 p-3 rounded mt-1">
                                  {alert.message}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-neutral-600">Category</label>
                                  <p className="text-sm capitalize bg-neutral-100 dark:bg-neutral-800 p-2 rounded mt-1">
                                    {alert.category}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-neutral-600">Triggered</label>
                                  <p className="text-sm bg-neutral-100 dark:bg-neutral-800 p-2 rounded mt-1">
                                    {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Alert-specific Details */}
                            <div className="space-y-4">
                              <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Alert Details</h4>

                              {/* Performance Alerts */}
                              {alert.category === "performance" && alert.metadata && (
                                <div className="space-y-3">
                                  {alert.metadata.metric === "cpu" && (
                                    <div className="flex items-center space-x-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                      <Cpu className="w-6 h-6 text-red-600" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-red-900 dark:text-red-100">CPU Usage Alert</p>
                                        <p className="text-sm text-red-700 dark:text-red-300">
                                          Current usage: <span className="font-mono">{alert.metadata.current_value}%</span>
                                          {alert.metadata.threshold && (
                                            <span> (Threshold: {alert.metadata.threshold}%)</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {alert.metadata.metric === "memory" && (
                                    <div className="flex items-center space-x-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                      <MemoryStick className="w-6 h-6 text-orange-600" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Memory Usage Alert</p>
                                        <p className="text-sm text-orange-700 dark:text-orange-300">
                                          Current usage: <span className="font-mono">{alert.metadata.current_value}%</span>
                                          {alert.metadata.threshold && (
                                            <span> (Threshold: {alert.metadata.threshold}%)</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {alert.metadata.metric === "disk" && (
                                    <div className="flex items-center space-x-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                      <HardDrive className="w-6 h-6 text-purple-600" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Disk Usage Alert</p>
                                        <p className="text-sm text-purple-700 dark:text-purple-300">
                                          Current usage: <span className="font-mono">{alert.metadata.current_value}%</span>
                                          {alert.metadata.threshold && (
                                            <span> (Threshold: {alert.metadata.threshold}%)</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Security Alerts */}
                              {alert.category === "security" && alert.metadata && (
                                <div className="space-y-3">
                                  {alert.metadata.metric === "usb" && (
                                    <div className="flex items-center space-x-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                      <Usb className="w-6 h-6 text-blue-600" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">USB Device Detection</p>
                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                          {alert.metadata.usb_count} USB device(s) connected
                                        </p>
                                        {alert.metadata.devices && alert.metadata.devices.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            {alert.metadata.devices.map((device: any, index: number) => (
                                              <div key={index} className="text-xs bg-blue-100 dark:bg-blue-800 p-2 rounded">
                                                <span className="font-medium">
                                                  {device.description || device.name || `USB Device ${index + 1}`}
                                                </span>
                                                {device.vendor_id && device.product_id && (
                                                  <span className="text-blue-600 dark:text-blue-300 ml-2">
                                                    (VID: {device.vendor_id}, PID: {device.product_id})
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Additional Metadata */}
                              {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                                <div>
                                  <label className="text-sm font-medium text-neutral-600 mb-2 block">
                                    Technical Details
                                  </label>
                                  <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded text-xs font-mono">
                                    <pre className="whitespace-pre-wrap">
                                      {JSON.stringify(alert.metadata, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>

                            <Separator />

                            {/* Timestamps */}
                            <div className="space-y-2">
                              <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Timeline</h4>
                              <div className="grid grid-cols-1 gap-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-neutral-600">Triggered:</span>
                                  <span className="font-mono">
                                    {new Date(alert.triggered_at).toLocaleString()}
                                  </span>
                                </div>
                                {alert.resolved_at && (
                                  <div className="flex justify-between">
                                    <span className="text-neutral-600">Resolved:</span>
                                    <span className="font-mono">
                                      {new Date(alert.resolved_at).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-neutral-600">Status:</span>
                                  <Badge variant={alert.is_active ? "destructive" : "default"}>
                                    {alert.is_active ? "Active" : "Resolved"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                No Alerts
              </h3>
              <p className="text-neutral-600">
                All systems are running smoothly. No active alerts to display.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}