import {
  Home,
  Users,
  Ticket,
  AlertTriangle,
  Settings,
  HelpCircle,
  Shield,
  FileText,
  Bell,
  Monitor,
  Headphones,
  Server,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Zap,
  TrendingUp,
  Cog,
  Wifi,
  BarChart3,
  Network,
  Scan,
  ArrowLeft,
  GitBranch,
  CheckCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth/protected-route";
// import { useUser } from "@/hooks/use-auth"; // Removed this line

export function Sidebar() {
  const [location] = useLocation();
  // const { user } = useUser(); // Removed this line
  const [isExpanded, setIsExpanded] = useState(true);
  const { user: authUser } = useAuth();

  // Fetch ticket counts for sidebar
  const { data: ticketsResponse } = useQuery({
    queryKey: ["/api/tickets", { limit: 1000 }],
    queryFn: async () => {
      try {
        const response = await api.get("/api/tickets?limit=1000");
        if (!response.ok) throw new Error("Failed to fetch tickets");
        return await response.json();
      } catch (error) {
        console.warn("Failed to fetch tickets for sidebar:", error);
        return { data: [], total: 0 };
      }
    },
    refetchInterval: 30000,
    retry: 1,
  });

  const tickets = Array.isArray(ticketsResponse?.data)
    ? ticketsResponse.data
    : ticketsResponse?.data?.tickets || [];
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(
    (t) => !["resolved", "closed", "cancelled"].includes(t.status),
  ).length;
  const alertCount = tickets.filter(
    (t) =>
      t.priority === "critical" &&
      !["resolved", "closed", "cancelled"].includes(t.status),
  ).length;

  const [isCollapsed, setIsCollapsed] = useState(false);
  // const { user: authUser } = useAuth(); // Already defined above
  const [notifications, setNotifications] = useState({
    tickets: 0,
    alerts: 0,
    agents: 0,
  });

  // Fetch notification counts
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        // Fetch unread notifications count from the notifications endpoint
        const notificationsResponse = await api.get(
          "/api/notifications?filter=unread",
        );
        if (notificationsResponse.ok) {
          const unreadNotifications = await notificationsResponse.json();
          const unreadCount = Array.isArray(unreadNotifications)
            ? unreadNotifications.length
            : 0;

          // Count by type for more granular display
          let ticketCount = 0;
          let alertCount = 0;

          if (Array.isArray(unreadNotifications)) {
            unreadNotifications.forEach((notification) => {
              if (notification.source === "Service Desk") {
                ticketCount++;
              } else if (notification.source === "System Monitor") {
                alertCount++;
              }
            });
          }

          setNotifications({
            tickets: ticketCount,
            alerts: alertCount,
            agents: 0, // Don't show count for managed systems
          });
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
        // Fallback to zero counts on error
        setNotifications({
          tickets: 0,
          alerts: 0,
          agents: 0,
        });
      }
    };

    if (authUser) {
      fetchNotifications();
      // Refresh every 10 seconds for more responsive updates
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [authUser]);

  const isAdmin = authUser?.role === "admin";

  // Define navigation with colored icons based on user role
  const getNavigation = () => {
    const baseNavigation = [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: Home,
        current: location === "/dashboard",
        roles: ["user", "technician", "manager", "admin"],
        iconColor: "text-blue-500",
        activeColor: "bg-blue-50 border-blue-200 text-blue-700",
        description: "Overview and metrics",
      },
      {
        name: "Service Desk",
        href: "/tickets",
        icon: Headphones,
        current: location === "/tickets" || location.startsWith("/tickets/"),
        roles: ["user", "technician", "manager", "admin"],
        iconColor: "text-green-500",
        activeColor: "bg-green-50 border-green-200 text-green-700",
        description: "Manage tickets and requests",
        notification:
          notifications.tickets > 0 ? notifications.tickets : undefined,
      },
      {
        name: "Help Articles",
        href: "/knowledge-base",
        icon: FileText,
        current: location === "/knowledge-base",
        roles: ["user", "technician", "manager", "admin"],
        iconColor: "text-purple-500",
        activeColor: "bg-purple-50 border-purple-200 text-purple-700",
        description: "Documentation and guides",
      },
    ];

    const techNavigation = [
      {
        name: "Managed Systems",
        href: "/agents",
        icon: Server,
        current: location === "/agents" || location.startsWith("/agents/"),
        roles: ["technician", "manager", "admin"],
        iconColor: "text-orange-500",
        activeColor: "bg-orange-50 border-orange-200 text-orange-700",
        description: "Monitor system health",
      },

      {
        name: "System Alerts",
        href: "/alerts",
        icon: AlertTriangle,
        current: location === "/alerts",
        roles: ["technician", "manager", "admin"],
        iconColor: "text-red-500",
        activeColor: "bg-red-50 border-red-200 text-red-700",
        description: "Critical system notifications",
        notification:
          notifications.alerts > 0 ? notifications.alerts : undefined,
      },
    ];

    const managerNavigation = [
      {
        name: "User Directory",
        href: "/users",
        icon: UserCheck,
        current: location === "/users",
        roles: ["manager", "admin"],
        iconColor: "text-cyan-500",
        activeColor: "bg-cyan-50 border-cyan-200 text-cyan-700",
        description: "Manage user accounts",
      },

      {
        name: "Network Scan",
        href: "/network-scan",
        icon: Scan,
        current: location === "/network-scan",
        roles: ["admin", "manager", "technician"],
        iconColor: "text-teal-500",
        activeColor: "bg-teal-50 border-teal-200 text-teal-700",
        description: "Scan network for devices",
      },

      {
        name: "Security Dashboard",
        href: "/security-dashboard",
        icon: Shield,
        current: location === "/security-dashboard",
        roles: ["admin", "manager"],
        iconColor: "text-indigo-500",
        activeColor: "bg-indigo-50 border-indigo-200 text-indigo-700",
        description: "Security overview and threats",
      },

      {
        name: "Performance Analytics",
        href: "/performance-analytics",
        icon: BarChart3,
        roles: ["manager", "admin", "technician"],
        iconColor: "text-amber-500",
        activeColor: "bg-amber-50 border-amber-200 text-amber-700",
        description: "Analyze performance metrics",
      },
      { name: "SLA Analysis", href: "/sla-analysis", icon: CheckCircle },
    ];

    const adminNavigation = [
      {
        name: "Admin Panel",
        href: "/settings",
        icon: Settings,
        current:
          location === "/settings" ||
          location === "/settings/general" ||
          location === "/settings/active-directory",
        roles: ["admin"],
        iconColor: "text-gray-500",
        activeColor: "bg-gray-50 border-gray-200 text-gray-700",
        description: "System configuration",
      },
    ];

    const mainNavigation = [
      ...baseNavigation,
      ...techNavigation,
      ...managerNavigation,
    ];

    const bottomNavigation = adminNavigation;

    // Filter navigation based on user role
    const filteredMainNavigation = mainNavigation.filter(
      (item) =>
        authUser?.role === "admin" ||
        item.roles.includes(authUser?.role || "user"),
    );

    const filteredBottomNavigation = bottomNavigation.filter(
      (item) =>
        authUser?.role === "admin" ||
        item.roles.includes(authUser?.role || "user"),
    );

    return { main: filteredMainNavigation, bottom: filteredBottomNavigation };
  };

  const navigation = getNavigation();

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-col h-full bg-gradient-to-b from-white to-gray-50 dark:from-[#323130] dark:to-[#2B2A29] border-r border-[#E1DFDD] dark:border-[#484644] transition-all duration-300 ease-in-out shadow-lg",
          isCollapsed ? "w-16" : "w-72",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E1DFDD] dark:border-[#484644]">
          <div
            className={cn(
              "flex items-center space-x-3",
              isCollapsed && "justify-center",
            )}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <img
                src="https://fidelisgroup.in/assets/imgs/logo/Logo_Fidelis.png"
                alt="Fidelis Logo"
                className="w-7 h-7 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling.style.display = "block";
                }}
              />
              <Shield className="w-6 h-6 text-white hidden" />
            </div>
            {!isCollapsed && (
              <div className="flex-1">
                {/* Removed Nexole ITSM branding */}
                <h1 className="text-h4 font-bold text-[#201F1E] dark:text-[#F3F2F1] bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ITSM
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-xs text-[#605E5C] dark:text-[#A19F9D]">
                    IT Service Management
                  </p>
                  {authUser?.role && (
                    <Badge
                      variant="outline"
                      className="text-xs px-2 py-0.5 border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-900/30"
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      {authUser.role.charAt(0).toUpperCase() +
                        authUser.role.slice(1)}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-[#484644] transition-colors"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* User Info */}
        {/* {!isCollapsed && authUser && (
          <div className="p-4 border-b border-[#E1DFDD] dark:border-[#484644]">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                {authUser.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#201F1E] dark:text-[#F3F2F1] truncate">
                  {authUser.name || authUser.email}
                </p>
                <p className="text-xs text-[#605E5C] dark:text-[#A19F9D] truncate">
                  {authUser.email}
                </p>
              </div>
              {(notifications.tickets + notifications.alerts) > 0 && (
                <div className="relative">
                  <Bell className="w-4 h-4 text-[#605E5C] dark:text-[#A19F9D]" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{notifications.tickets + notifications.alerts}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )} */}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.main.map((item, index) => {
            const isActive = item.current;
            const NavItem = (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center space-x-3 py-3 px-3 rounded-xl font-medium transition-all duration-200 relative",
                  isActive
                    ? `${item.activeColor} shadow-sm border`
                    : "text-[#201F1E] dark:text-[#F3F2F1] hover:bg-gray-100 dark:hover:bg-[#484644] hover:scale-[1.02]",
                )}
              >
                <div
                  className={cn(
                    "relative flex items-center justify-center",
                    isActive && "transform scale-110",
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 transition-all duration-200",
                      isActive
                        ? item.iconColor.replace("text-", "text-")
                        : `${item.iconColor} group-hover:scale-110`,
                    )}
                  />
                  {/* {item.notification && !isCollapsed && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">{item.notification}</span>
                    </div>
                  )} */}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        {item.name}
                      </span>
                      {item.notification && item.notification > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-2 h-5 text-xs bg-red-100 text-red-700 border-red-200"
                        >
                          {item.notification}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                )}
                {/* {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full" />
                )} */}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="flex items-center space-x-2"
                  >
                    <span>{item.name}</span>
                    {item.notification && item.notification > 0 && (
                      <Badge
                        variant="secondary"
                        className="h-5 text-xs bg-red-100 text-red-700"
                      >
                        {item.notification}
                      </Badge>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return NavItem;
          })}

          {/* Quick Actions */}
          {/* {!isCollapsed && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider px-3">
                  Quick Actions
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs h-8 border-dashed hover:border-solid transition-all"
                >
                  <MoreHorizontal className="w-3 h-3 mr-2" />
                  Create Ticket
                </Button>
              </div>
            </>
          )} */}
        </nav>

        {/* Bottom Navigation - Admin Panel */}
        {navigation.bottom.length > 0 && (
          <div className="px-3 py-2 border-t border-[#E1DFDD] dark:border-[#484644]">
            {navigation.bottom.map((item, index) => {
              const isActive = item.current;
              const NavItem = (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center space-x-3 py-3 px-3 rounded-xl font-medium transition-all duration-200 relative",
                    isActive
                      ? `${item.activeColor} shadow-sm border`
                      : "text-[#201F1E] dark:text-[#F3F2F1] hover:bg-gray-100 dark:hover:bg-[#484644] hover:scale-[1.02]",
                  )}
                >
                  <div
                    className={cn(
                      "relative flex items-center justify-center",
                      isActive && "transform scale-110",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-5 h-5 transition-all duration-200",
                        isActive
                          ? item.iconColor.replace("text-", "text-")
                          : `${item.iconColor} group-hover:scale-110`,
                      )}
                    />
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {item.name}
                        </span>
                        {item.notification && item.notification > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-2 h-5 text-xs bg-red-100 text-red-700 border-red-200"
                          >
                            {item.notification}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  )}
                </Link>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="flex items-center space-x-2"
                    >
                      <span>{item.name}</span>
                      {item.notification && item.notification > 0 && (
                        <Badge
                          variant="secondary"
                          className="h-5 text-xs bg-red-100 text-red-700"
                        >
                          {item.notification}
                        </Badge>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return NavItem;
            })}
          </div>
        )}

        {/* User Profile Section */}
        {!isCollapsed && authUser && (
          <div className="p-4 border-t border-[#E1DFDD] dark:border-[#484644]">
            {/* <Link
              to="/profile"
              className="flex items-center space-x-3 mb-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#484644] transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                {authUser.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#201F1E] dark:text-[#F3F2F1] truncate">
                  {authUser.name || authUser.email}
                </p>
                <p className="text-xs text-[#605E5C] dark:text-[#A19F9D] truncate mt-1">
                  {authUser.email}
                </p>
              </div>
            </Link> */}

            <div className="text-center border-t border-[#E1DFDD] dark:border-[#484644] pt-3">
              <p className="text-xs text-[#605E5C] dark:text-[#A19F9D]">
                © 2024 Nexole ITSM
              </p>
              <p className="text-xs text-[#605E5C] dark:text-[#A19F9D] mt-1">
                v1.0.0
              </p>
            </div>
          </div>
        )}

        {/* Footer for collapsed state */}
        {/* {isCollapsed && (
          <div className="p-2 border-t border-[#E1DFDD] dark:border-[#484644]">
            {authUser && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/profile"
                    className="flex justify-center mb-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#484644] transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium text-xs">
                      {authUser.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <span>Profile Settings</span>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )} */}
      </div>
    </TooltipProvider>
  );
}

export default Sidebar;