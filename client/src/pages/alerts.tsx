import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { useAlerts } from "@/hooks/use-dashboard";
import { AlertTriangle, CheckCircle, Clock, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Alerts() {
  const { data: alerts, isLoading } = useAlerts();
  const [activeFilter, setActiveFilter] = useState("all");
  const [resolvedAlerts, setResolvedAlerts] = useState<string[]>([]);

  const filteredAlerts = alerts?.filter(alert => {
    if (resolvedAlerts.includes(alert.id)) return false;
    if (activeFilter === "all") return true;
    return alert.severity === activeFilter;
  }) || [];

  const handleResolveAlert = (alertId: string) => {
    setResolvedAlerts(prev => [...prev, alertId]);
  };

  const handleMarkAllAsRead = () => {
    if (alerts) {
      setResolvedAlerts(alerts.map(alert => alert.id));
    }
  };

  const handleViewDetails = (alert: any) => {
    alert(JSON.stringify(alert, null, 2));
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
        <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
          Alert Management
        </h1>
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
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewDetails(alert)}
                      >
                        View Details
                      </Button>
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