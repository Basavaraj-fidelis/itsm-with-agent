import { useLocation } from "wouter";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard", 
  "/agents": "Agents",
  "/alerts": "Alerts",
  "/reports": "Reports",
  "/settings": "Settings"
};

export function Header() {
  const [location] = useLocation();
  
  const getPageName = () => {
    if (location.startsWith("/agents/")) {
      return "Agent Details";
    }
    return pageNames[location] || "ITSM Portal";
  };

  return (
    <header className="bg-white dark:bg-neutral-800 shadow-sm border-b border-neutral-200 dark:border-neutral-700">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">
              {getPageName()}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
              <Input
                placeholder="Search..."
                className="pl-10 w-64"
              />
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
            </Button>

            {/* System Status */}
            <div className="flex items-center space-x-2 text-sm text-neutral-500">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>System Online</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
