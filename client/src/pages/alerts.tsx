
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Eye, Monitor, Cpu, MemoryStick, HardDrive, Usb, Shield, Ticket, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAlerts } from "@/hooks/use-dashboard";
import { useQueryClient } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [readAlerts, setReadAlerts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriority, setTicketPriority] = useState("high");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load read alerts from localStorage
  useEffect(() => {
    const storedReadAlerts = localStorage.getItem('readAlerts');
    if (storedReadAlerts) {
      setReadAlerts(JSON.parse(storedReadAlerts));
    }
  }, []);

  // Save read alerts to localStorage
  useEffect(() => {
    localStorage.setItem('readAlerts', JSON.stringify(readAlerts));
  }, [readAlerts]);

  const filteredAlerts = alerts?.filter(alert => {
    if (readAlerts.includes(alert.id)) return false;
    
    // Severity filter
    if (activeFilter !== "all" && alert.severity !== activeFilter) return false;
    
    // Device filter
    if (deviceFilter !== "all" && alert.device_hostname !== deviceFilter) return false;
    
    // Search filter
    if (searchTerm && !alert.message.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !alert.device_hostname.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !alert.category.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    return true;
  }) || [];

  const uniqueDevices = [...new Set(alerts?.map(alert => alert.device_hostname) || [])];

  const handleMarkAsRead = (alertId: string) => {
    setReadAlerts(prev => [...prev, alertId]);
    toast({
      title: "Alert Marked as Read",
      description: "The alert has been marked as read.",
    });
  };

  const handleMarkAllAsRead = () => {
    if (!alerts) return;

    const allActiveAlertIds = alerts
      .filter(alert => alert.is_active && !readAlerts.includes(alert.id))
      .map(alert => alert.id);

    setReadAlerts(prev => [...prev, ...allActiveAlertIds]);
    
    toast({
      title: "All Alerts Marked as Read",
      description: `${allActiveAlertIds.length} alerts marked as read.`,
    });
  };

  const handleCreateTicketForAlert = async (alert: Alert) => {
    setSelectedAlert(alert);
    
    // Pre-populate ticket description based on alert
    const description = `CRITICAL ALERT - Immediate Attention Required

Alert Details:
- Device: ${alert.device_hostname}
- Alert Type: ${alert.category.toUpperCase()}
- Severity: ${alert.severity.toUpperCase()}
- Message: ${alert.message}
- Triggered: ${formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}

Technical Details:
${alert.metadata ? JSON.stringify(alert.metadata, null, 2) : 'No additional metadata available'}

This ticket was automatically created from a critical system alert that requires immediate investigation and resolution.`;

    setTicketDescription(description);
    setTicketPriority(alert.severity === "critical" ? "critical" : "high");
  };

  const submitTicket = async () => {
    if (!selectedAlert) return;

    setIsCreatingTicket(true);
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      const ticketData = {
        type: "incident",
        title: `CRITICAL ALERT: ${selectedAlert.message}`,
        description: ticketDescription,
        priority: ticketPriority,
        requester_email: user.email || 'admin@company.com',
        category: `System Alert - ${selectedAlert.category}`,
        impact: selectedAlert.severity === "critical" ? "high" : "medium",
        urgency: selectedAlert.severity === "critical" ? "high" : "medium"
      };

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(ticketData)
      });

      if (response.ok) {
        const ticket = await response.json();
        toast({
          title: "Ticket Created Successfully",
          description: `Ticket ${ticket.ticket_number} has been created for this alert.`,
        });
        
        // Mark alert as read after creating ticket
        handleMarkAsRead(selectedAlert.id);
        setSelectedAlert(null);
        setTicketDescription("");
      } else {
        throw new Error('Failed to create ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setLastRefresh(new Date());
    setIsRefreshing(false);
    toast({
      title: "Alerts Refreshed",
      description: "Alert data has been refreshed.",
    });
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Critical Alerts</p>
                <p className="text-2xl font-bold">{alerts?.filter(a => a.severity === "critical" && !readAlerts.includes(a.id)).length || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">High Priority</p>
                <p className="text-2xl font-bold">{alerts?.filter(a => a.severity === "high" && !readAlerts.includes(a.id)).length || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Warnings</p>
                <p className="text-2xl font-bold">{alerts?.filter(a => a.severity === "warning" && !readAlerts.includes(a.id)).length || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Active</p>
                <p className="text-2xl font-bold">{filteredAlerts.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
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
              All Alerts ({filteredAlerts.length})
            </Button>
            <Button 
              variant={activeFilter === "critical" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setActiveFilter("critical")}
            >
              Critical ({alerts?.filter(a => a.severity === "critical" && !readAlerts.includes(a.id)).length || 0})
            </Button>
            <Button 
              variant={activeFilter === "high" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setActiveFilter("high")}
            >
              High ({alerts?.filter(a => a.severity === "high" && !readAlerts.includes(a.id)).length || 0})
            </Button>
            <Button 
              variant={activeFilter === "warning" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setActiveFilter("warning")}
            >
              Warning ({alerts?.filter(a => a.severity === "warning" && !readAlerts.includes(a.id)).length || 0})
            </Button>
            <Button 
              variant={activeFilter === "info" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setActiveFilter("info")}
            >
              Info ({alerts?.filter(a => a.severity === "info" && !readAlerts.includes(a.id)).length || 0})
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 text-sm border rounded-md w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Devices</option>
              {uniqueDevices.map(device => (
                <option key={device} value={device}>{device}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-xs text-neutral-500 mr-3">
              Last updated: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
              Mark All as Read
            </Button>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Active Alerts</span>
            <span className="text-sm font-normal text-neutral-600">
              {filteredAlerts.length} unread of {alerts?.length || 0} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAlerts && filteredAlerts.length > 0 ? (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-6 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all duration-200 ${
                    alert.severity === "critical"
                      ? "border-l-red-500 bg-gradient-to-r from-red-50 to-red-25 dark:from-red-900/20 dark:to-red-900/10 border border-red-200 dark:border-red-800"
                      : alert.severity === "high"
                      ? "border-l-orange-500 bg-gradient-to-r from-orange-50 to-orange-25 dark:from-orange-900/20 dark:to-orange-900/10 border border-orange-200 dark:border-orange-800"
                      : alert.severity === "warning"
                      ? "border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-yellow-25 dark:from-yellow-900/20 dark:to-yellow-900/10 border border-yellow-200 dark:border-yellow-800"
                      : "border-l-blue-500 bg-gradient-to-r from-blue-50 to-blue-25 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-200 dark:border-blue-800"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`p-2 rounded-full ${
                          alert.severity === "critical" ? "bg-red-100 dark:bg-red-900/40" 
                          : alert.severity === "high" ? "bg-orange-100 dark:bg-orange-900/40"
                          : alert.severity === "warning" ? "bg-yellow-100 dark:bg-yellow-900/40"
                          : "bg-blue-100 dark:bg-blue-900/40"
                        }`}>
                          <AlertTriangle className={`w-5 h-5 ${
                            alert.severity === "critical" ? "text-red-600" 
                            : alert.severity === "high" ? "text-orange-600"
                            : alert.severity === "warning" ? "text-yellow-600"
                            : "text-blue-600"
                          }`} />
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusBadge status={alert.severity} />
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 capitalize bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                            {alert.category}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                        {alert.message}
                      </h3>
                      
                      {/* Performance Metrics Display */}
                      {alert.category === "performance" && alert.metadata && (
                        <div className="mb-3 p-3 bg-white/60 dark:bg-neutral-800/60 rounded-lg border">
                          <div className="flex items-center space-x-4 text-sm">
                            {alert.metadata.cpu_usage && (
                              <div className="flex items-center space-x-2">
                                <Cpu className="w-4 h-4 text-red-500" />
                                <span className="font-medium">CPU: {alert.metadata.cpu_usage}%</span>
                                <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${alert.metadata.cpu_usage > 90 ? 'bg-red-500' : alert.metadata.cpu_usage > 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(alert.metadata.cpu_usage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {alert.metadata.memory_usage && (
                              <div className="flex items-center space-x-2">
                                <MemoryStick className="w-4 h-4 text-orange-500" />
                                <span className="font-medium">Memory: {alert.metadata.memory_usage}%</span>
                                <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${alert.metadata.memory_usage > 90 ? 'bg-red-500' : alert.metadata.memory_usage > 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(alert.metadata.memory_usage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {alert.metadata.disk_usage && (
                              <div className="flex items-center space-x-2">
                                <HardDrive className="w-4 h-4 text-purple-500" />
                                <span className="font-medium">Disk: {alert.metadata.disk_usage}%</span>
                                <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${alert.metadata.disk_usage > 90 ? 'bg-red-500' : alert.metadata.disk_usage > 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(alert.metadata.disk_usage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-4 text-sm text-neutral-600 dark:text-neutral-400">
                        <div className="flex items-center space-x-1">
                          <Monitor className="w-4 h-4" />
                          <span className="font-medium">{alert.device_hostname}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}</span>
                        </div>
                        {alert.metadata?.threshold && (
                          <>
                            <span>•</span>
                            <span className="text-xs bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded">
                              Threshold: {alert.metadata.threshold}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Critical Alert - Show Raise Ticket Button */}
                      {alert.severity === "critical" && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleCreateTicketForAlert(alert)}
                            >
                              <Ticket className="w-4 h-4 mr-2" />
                              Raise Ticket
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center space-x-2">
                                <Ticket className="w-5 h-5 text-red-500" />
                                <span>Create Incident Ticket</span>
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="priority">Priority</Label>
                                <Select value={ticketPriority} onValueChange={setTicketPriority}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="critical">Critical</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="description">Ticket Description</Label>
                                <Textarea
                                  id="description"
                                  value={ticketDescription}
                                  onChange={(e) => setTicketDescription(e.target.value)}
                                  rows={10}
                                  className="mt-1"
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setSelectedAlert(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={submitTicket}
                                  disabled={isCreatingTicket}
                                >
                                  {isCreatingTicket ? "Creating..." : "Create Ticket"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      {/* Read Button (instead of Resolve) */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleMarkAsRead(alert.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Read
                      </Button>
                      
                      {/* View Details Button */}
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
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                      <div className="flex items-center space-x-4 mb-3">
                                        <Cpu className="w-6 h-6 text-red-600" />
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-red-900 dark:text-red-100">CPU Usage Alert</p>
                                          <p className="text-sm text-red-700 dark:text-red-300">
                                            Current usage: <span className="font-mono font-bold">{alert.metadata.cpu_usage}%</span>
                                            {alert.metadata.threshold && (
                                              <span> (Threshold: {alert.metadata.threshold}%)</span>
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="w-full bg-neutral-200 rounded-full h-3 mb-2">
                                        <div 
                                          className="bg-red-600 h-3 rounded-full transition-all duration-300"
                                          style={{ width: `${Math.min(alert.metadata.cpu_usage, 100)}%` }}
                                        />
                                      </div>
                                      <div className="flex justify-between text-xs text-red-600 dark:text-red-400">
                                        <span>0%</span>
                                        <span className="font-medium">{alert.metadata.cpu_usage}%</span>
                                        <span>100%</span>
                                      </div>
                                      {alert.metadata.previous_value && (
                                        <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                                          <span>Previous: {alert.metadata.previous_value}% </span>
                                          <span className={`font-medium ${
                                            alert.metadata.cpu_usage > alert.metadata.previous_value ? 'text-red-800' : 'text-green-600'
                                          }`}>
                                            ({alert.metadata.cpu_usage > alert.metadata.previous_value ? '↗' : '↘'} 
                                            {Math.abs(alert.metadata.cpu_usage - alert.metadata.previous_value).toFixed(1)}%)
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {alert.metadata.metric === "memory" && (
                                    <div className="flex items-center space-x-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                      <MemoryStick className="w-6 h-6 text-orange-600" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Memory Usage Alert</p>
                                        <p className="text-sm text-orange-700 dark:text-orange-300">
                                          Current usage: <span className="font-mono">{alert.metadata.memory_usage}%</span>
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
                                          Current usage: <span className="font-mono">{alert.metadata.disk_usage}%</span>
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
                No Unread Alerts
              </h3>
              <p className="text-neutral-600">
                {alerts && alerts.length > 0 
                  ? "All alerts have been read. Check back later for new alerts."
                  : "All systems are running smoothly. No active alerts to display."
                }
              </p>
              {readAlerts.length > 0 && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setReadAlerts([]);
                    toast({
                      title: "Read alerts cleared",
                      description: "All previously read alerts are now visible again.",
                    });
                  }}
                >
                  Show Read Alerts ({readAlerts.length})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
