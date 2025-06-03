
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  Trash2,
  MarkAsRead,
  Clock,
  X,
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  created_at: string;
  source?: string;
}

export default function Notifications() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  useEffect(() => {
    // Mock notifications - in real app, fetch from API
    const mockNotifications: Notification[] = [
      {
        id: "1",
        title: "High CPU Usage Alert",
        message: "Server DESKTOP-CMM8H3C has exceeded 90% CPU usage for the last 5 minutes.",
        type: "warning",
        read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        source: "System Monitor"
      },
      {
        id: "2",
        title: "Agent Connected",
        message: "New agent DESKTOP-CMM8H3C has been successfully registered and is reporting data.",
        type: "success",
        read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        source: "Agent Management"
      },
      {
        id: "3",
        title: "Memory Usage Warning",
        message: "System memory usage has reached 88% on DESKTOP-CMM8H3C.",
        type: "warning",
        read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        source: "System Monitor"
      },
      {
        id: "4",
        title: "Weekly Report Generated",
        message: "Your weekly system health report is now available for download.",
        type: "info",
        read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        source: "Reports"
      },
      {
        id: "5",
        title: "Disk Space Alert",
        message: "Disk usage on C: drive has reached 85% capacity. Consider cleaning up files.",
        type: "error",
        read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        source: "Storage Monitor"
      }
    ];
    setNotifications(mockNotifications);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "error": return <X className="w-5 h-5 text-red-500" />;
      case "success": return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "warning": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "error": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "success": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    toast({
      title: "Marked as read",
      description: "Notification has been marked as read.",
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    toast({
      title: "Notification deleted",
      description: "Notification has been removed.",
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    toast({
      title: "All marked as read",
      description: "All notifications have been marked as read.",
    });
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === "unread") return !notif.read;
    if (filter === "read") return notif.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
            Notifications
          </h1>
          <p className="text-neutral-600">
            System alerts and important messages
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="flex items-center">
            <Bell className="w-3 h-3 mr-1" />
            {unreadCount} unread
          </Badge>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" size="sm">
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg w-fit">
        {["all", "unread", "read"].map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === filterOption
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            {filterOption === "unread" && unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {unreadCount}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No notifications found</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {filteredNotifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors ${
                    !notification.read ? "bg-blue-50 dark:bg-blue-900/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className={`text-sm font-medium ${
                            !notification.read ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-700 dark:text-neutral-300"
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <Badge className={`text-xs ${getBadgeColor(notification.type)}`}>
                            {notification.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-neutral-500">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTime(notification.created_at)}
                          </span>
                          {notification.source && (
                            <span>Source: {notification.source}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.read && (
                        <Button
                          onClick={() => markAsRead(notification.id)}
                          variant="ghost"
                          size="sm"
                          className="text-neutral-500 hover:text-neutral-700"
                        >
                          <MarkAsRead className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        onClick={() => deleteNotification(notification.id)}
                        variant="ghost"
                        size="sm"
                        className="text-neutral-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
