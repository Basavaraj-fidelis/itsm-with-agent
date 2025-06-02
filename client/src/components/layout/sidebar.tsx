import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Server, BarChart3, Monitor, AlertTriangle, FileText, Settings, Ticket, BookOpen, Users } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Agents", href: "/agents", icon: Monitor },
  { name: "Alerts", href: "/alerts", icon: AlertTriangle },
  { name: "Service Desk", href: "/tickets", icon: Ticket },
  { name: "Knowledge Base", href: "/knowledge-base", icon: BookOpen },
  { name: "Users", href: "/users", icon: Users },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white dark:bg-neutral-800 shadow-sm border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">ITSM Portal</h1>
            <p className="text-xs text-neutral-500">IT Service Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center space-x-3 px-3 py-2">
          <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-600 rounded-full flex items-center justify-center">
            <span className="text-neutral-600 dark:text-neutral-300 text-sm font-medium">A</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Admin User</p>
            <p className="text-xs text-neutral-500">System Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
}