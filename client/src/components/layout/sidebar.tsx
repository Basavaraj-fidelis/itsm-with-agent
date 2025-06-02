import { Home, Users, AlertTriangle, Settings, BarChart3, Ticket, BookOpen, Monitor, Menu, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/protected-route";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();

  // Define navigation based on user role
  const getNavigation = () => {
    const baseNavigation = [
      { name: "Dashboard", href: "/dashboard", icon: Home, current: window.location.pathname === "/dashboard", roles: ["user", "technician", "manager", "admin"] },
      { name: "Tickets", href: "/tickets", icon: Ticket, current: window.location.pathname === "/tickets", roles: ["user", "technician", "manager", "admin"] },
      { name: "Knowledge Base", href: "/knowledge-base", icon: BookOpen, current: window.location.pathname === "/knowledge-base", roles: ["user", "technician", "manager", "admin"] },
    ];

    const techNavigation = [
      { name: "Agents", href: "/agents", icon: Monitor, current: window.location.pathname === "/agents", roles: ["technician", "manager", "admin"] },
      { name: "Alerts", href: "/alerts", icon: AlertTriangle, current: window.location.pathname === "/alerts", roles: ["technician", "manager", "admin"] },
    ];

    const managerNavigation = [
      { name: "Users", href: "/users", icon: Users, current: window.location.pathname === "/users", roles: ["manager", "admin"] },
      { name: "Reports", href: "/reports", icon: BarChart3, current: window.location.pathname === "/reports", roles: ["manager", "admin"] },
    ];

    const adminNavigation = [
      { name: "Settings", href: "/settings", icon: Settings, current: window.location.pathname === "/settings", roles: ["admin"] },
    ];

    const allNavigation = [...baseNavigation, ...techNavigation, ...managerNavigation, ...adminNavigation];

    // Filter navigation based on user role
    return allNavigation.filter(item => 
      user?.role === 'admin' || item.roles.includes(user?.role || 'user')
    );
  };

  const navigation = getNavigation();

  return (
    <div className={cn("flex flex-col h-full bg-white border-r border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 w-full", isCollapsed ? "w-16" : "w-64")}>
      <div className="flex items-center justify-between p-4">
          <div className={cn("flex items-center space-x-3", isCollapsed && "justify-center")}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">ITSM</h1>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">Portal</p>
                  {user?.role && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      <Shield className="w-3 h-3 mr-1" />
                      {user.role}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="p-0" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <Menu /> : <X />}
          </Button>
        </div>
      <nav className="flex-1 px-2 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link href={item.href} className="group flex items-center space-x-3 py-2 px-3 rounded-md font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <item.icon className="w-4 h-4 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100" />
                {!isCollapsed && (
                  <span>
                    {item.name}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}