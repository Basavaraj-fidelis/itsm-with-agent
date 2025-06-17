import { useLocation } from "wouter";
import { Settings, User, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/protected-route";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Header() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "manager":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "technician":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <header className="bg-white dark:bg-[#201F1E] shadow-sm border-b border-[#F3F2F1] dark:border-[#323130]">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end h-16">
          {/* Right: User Dropdown */}
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 px-3 hover:bg-[#F3F2F1] dark:hover:bg-[#323130] text-[#201F1E] dark:text-[#F3F2F1] flex items-center"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#0078D4] text-white text-sm">
                      {user ? getUserInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3 text-left hidden md:block">
                    <div className="text-sm font-medium">
                      {user?.name || "User"}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user?.role || "user")}`}
                      >
                        {user?.role || "user"}
                      </span>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-white dark:bg-[#201F1E] border-[#E1DFDD] dark:border-[#484644]"
                align="end"
              >
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-[#201F1E] dark:text-[#F3F2F1]">
                      {user?.name}
                    </p>
                    <p className="text-xs text-[#605E5C]">{user?.email}</p>
                    {user?.department && (
                      <p className="text-xs text-[#605E5C]">
                        {user.department} Department
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#E1DFDD] dark:bg-[#484644]" />
                <DropdownMenuItem asChild>
                  <a
                    href="/profile"
                    className="text-[#201F1E] dark:text-[#F3F2F1] hover:bg-[#F3F2F1] dark:hover:bg-[#323130] flex items-center"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </a>
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <a
                      href="/settings"
                      className="text-[#201F1E] dark:text-[#F3F2F1] hover:bg-[#F3F2F1] dark:hover:bg-[#323130] flex items-center"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      System Settings
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <a
                    href="/settings?tab=security"
                    className="text-[#201F1E] dark:text-[#F3F2F1] hover:bg-[#F3F2F1] dark:hover:bg-[#323130] flex items-center"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Security
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#E1DFDD] dark:bg-[#484644]" />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-600 hover:bg-[#F3F2F1] dark:hover:bg-[#323130]"
                >
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