
import { Home, Users, AlertTriangle, Settings, BarChart3, Headphones, FileText, Server, Menu, X, Shield, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/components/auth/protected-route";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();

  // Define navigation with colored icons based on user role
  const getNavigation = () => {
    const baseNavigation = [
      { 
        name: "Dashboard", 
        href: "/dashboard", 
        icon: Home, 
        current: window.location.pathname === "/dashboard", 
        roles: ["user", "technician", "manager", "admin"],
        iconColor: "text-blue-500"
      },
      { 
        name: "Service Desk", 
        href: "/tickets", 
        icon: Headphones, 
        current: window.location.pathname === "/tickets", 
        roles: ["user", "technician", "manager", "admin"],
        iconColor: "text-green-500"
      },
      { 
        name: "Help Articles", 
        href: "/knowledge-base", 
        icon: FileText, 
        current: window.location.pathname === "/knowledge-base", 
        roles: ["user", "technician", "manager", "admin"],
        iconColor: "text-purple-500"
      },
    ];

    const techNavigation = [
      { 
        name: "Managed Systems", 
        href: "/agents", 
        icon: Server, 
        current: window.location.pathname === "/agents", 
        roles: ["technician", "manager", "admin"],
        iconColor: "text-orange-500"
      },
      { 
        name: "System Alerts", 
        href: "/alerts", 
        icon: AlertTriangle, 
        current: window.location.pathname === "/alerts", 
        roles: ["technician", "manager", "admin"],
        iconColor: "text-red-500"
      },
    ];

    const managerNavigation = [
      { 
        name: "User Directory", 
        href: "/users", 
        icon: UserCheck, 
        current: window.location.pathname === "/users", 
        roles: ["manager", "admin"],
        iconColor: "text-cyan-500"
      },
      { 
        name: "Analytics", 
        href: "/reports", 
        icon: BarChart3, 
        current: window.location.pathname === "/reports", 
        roles: ["manager", "admin"],
        iconColor: "text-indigo-500"
      },
    ];

    const adminNavigation = [
      { 
        name: "Admin Panel", 
        href: "/settings", 
        icon: Settings, 
        current: window.location.pathname === "/settings", 
        roles: ["admin"],
        iconColor: "text-gray-500"
      },
    ];

    const allNavigation = [...baseNavigation, ...techNavigation, ...managerNavigation, ...adminNavigation];

    // Filter navigation based on user role
    return allNavigation.filter(item => 
      user?.role === 'admin' || item.roles.includes(user?.role || 'user')
    );
  };

  const navigation = getNavigation();

  return (
    <div className={cn("flex flex-col h-full bg-[#F3F2F1] border-r border-[#E1DFDD] dark:bg-[#323130] dark:border-[#484644] w-full", isCollapsed ? "w-16" : "w-64")}>
      <div className="flex items-center justify-between p-4">
          <div className={cn("flex items-center space-x-3", isCollapsed && "justify-center")}>
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-[#E1DFDD]">
              <img 
                src="https://fidelisgroup.in/assets/imgs/logo/Logo_Fidelis.png" 
                alt="Fidelis Logo" 
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  // Fallback to a colored shield icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling.style.display = 'block';
                }}
              />
              <Shield className="w-5 h-5 text-[#0078D4] hidden" />
            </div>
            {!isCollapsed && (
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-[#201F1E] dark:text-[#F3F2F1]">Nexole ITSM</h1>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-[#605E5C]">Portal</p>
                  {user?.role && (
                    <Badge variant="outline" className="text-xs px-1 py-0 border-[#0078D4] text-[#0078D4]">
                      <Shield className="w-3 h-3 mr-1" />
                      {user.role}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="p-0 hover:bg-[#E1DFDD] dark:hover:bg-[#484644] text-[#201F1E] dark:text-[#F3F2F1]" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <Menu /> : <X />}
          </Button>
        </div>
      <nav className="flex-1 px-2 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link to={item.href} className={cn(
                "group flex items-center space-x-3 py-2 px-3 rounded-md font-medium transition-colors",
                item.current 
                  ? "bg-[#0078D4] text-white" 
                  : "text-[#201F1E] dark:text-[#F3F2F1] hover:bg-[#E1DFDD] dark:hover:bg-[#484644]"
              )}>
                <item.icon className={cn(
                  "w-4 h-4 transition-colors",
                  item.current 
                    ? "text-white" 
                    : `${item.iconColor} group-hover:${item.iconColor}`
                )} />
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
