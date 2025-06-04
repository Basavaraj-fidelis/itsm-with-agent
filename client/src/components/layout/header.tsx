import { useLocation } from "wouter";
import { Bell, Search, Menu, Settings, User, LogOut, Shield, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth/protected-route";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard", 
  "/agents": "Agents",
  "/alerts": "Alerts",
  "/reports": "Reports",
  "/settings": "Settings"
};

export default function Header() {
  const { user, logout } = useAuth();

  const [location] = useLocation();

  const getPageName = () => {
    if (location.startsWith("/agents/")) {
      return "Agent Details";
    }
    return pageNames[location] || "ITSM Portal";
  };

    const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'technician': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <header className="bg-white dark:bg-[#201F1E] shadow-sm border-b border-[#F3F2F1] dark:border-[#323130]">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold text-[#201F1E] dark:text-[#F3F2F1]">
              {getPageName()}
            </h1>
          </div>

          {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#605E5C] w-4 h-4" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-10 w-64 bg-[#F3F2F1] border-[#E1DFDD] text-[#201F1E] placeholder-[#605E5C] focus:border-[#0078D4] focus:ring-[#0078D4] dark:bg-[#323130] dark:border-[#484644] dark:text-[#F3F2F1]"
            />
          </div>

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between p-2">
                <h3 className="font-semibold">Notifications</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => {
                    // In a real app, this would call an API to mark notifications as read
                    // For now, we'll just show a toast
                    console.log("Marking all notifications as read");
                  }}
                >
                  Mark all as read
                </Button>
              </div>
              <DropdownMenuSeparator />

              <DropdownMenuItem className="flex items-start space-x-3 p-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">High Priority Ticket</p>
                  <p className="text-xs text-muted-foreground">Ticket #1234 requires immediate attention</p>
                  <p className="text-xs text-muted-foreground mt-1">5 minutes ago</p>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem className="flex items-start space-x-3 p-3">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Ticket Resolved</p>
                  <p className="text-xs text-muted-foreground">Ticket #1235 has been resolved successfully</p>
                  <p className="text-xs text-muted-foreground mt-1">15 minutes ago</p>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem className="flex items-start space-x-3 p-3">
                <div className="flex-shrink-0">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">SLA Warning</p>
                  <p className="text-xs text-muted-foreground">Ticket #1236 approaching SLA deadline</p>
                  <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center text-sm text-muted-foreground">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 px-3 hover:bg-[#F3F2F1] dark:hover:bg-[#323130] text-[#201F1E] dark:text-[#F3F2F1]">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#0078D4] text-white text-sm">
                    {user ? getUserInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3 text-left hidden md:block">
                  <div className="text-sm font-medium">{user?.name || 'User'}</div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user?.role || 'user')}`}>
                      {user?.role || 'user'}
                    </span>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-white dark:bg-[#201F1E] border-[#E1DFDD] dark:border-[#484644]" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-[#201F1E] dark:text-[#F3F2F1]">{user?.name}</p>
                  <p className="text-xs text-[#605E5C]">{user?.email}</p>
                  {user?.department && (
                    <p className="text-xs text-[#605E5C]">{user.department} Department</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#E1DFDD] dark:bg-[#484644]" />
              <DropdownMenuItem onClick={() => window.location.href = '/profile'} className="text-[#201F1E] dark:text-[#F3F2F1] hover:bg-[#F3F2F1] dark:hover:bg-[#323130]">
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              {(user?.role === 'admin') && (
                <DropdownMenuItem onClick={() => window.location.href = '/settings'} className="text-[#201F1E] dark:text-[#F3F2F1] hover:bg-[#F3F2F1] dark:hover:bg-[#323130]">
                  <Settings className="mr-2 h-4 w-4" />
                  System Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => window.location.href = '/settings?tab=security'} className="text-[#201F1E] dark:text-[#F3F2F1] hover:bg-[#F3F2F1] dark:hover:bg-[#323130]">
                <Shield className="mr-2 h-4 w-4" />
                Security
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#E1DFDD] dark:bg-[#484644]" />
              <DropdownMenuItem onClick={logout} className="text-red-600 hover:bg-[#F3F2F1] dark:hover:bg-[#323130]">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </div>
    </header>
  );
}