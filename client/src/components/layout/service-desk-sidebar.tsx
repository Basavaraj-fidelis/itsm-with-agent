import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Headphones, 
  ClipboardList, 
  AlertTriangle, 
  Bug, 
  RefreshCw,
  Settings
} from "lucide-react";
import { useLocation } from "wouter";

interface ServiceDeskSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function ServiceDeskSidebar({ activeTab, setActiveTab }: ServiceDeskSidebarProps) {
  const serviceDeskNavigation = [
    {
      id: "overview",
      name: "Overview",
      icon: Headphones,
      description: "Dashboard and quick actions"
    },
    {
      id: "requests",
      name: "Service Requests",
      icon: ClipboardList,
      description: "Software, hardware, and access requests"
    },
    {
      id: "incidents",
      name: "Incidents",
      icon: AlertTriangle,
      description: "Service interruptions and outages"
    },
    {
      id: "problems",
      name: "Problems",
      icon: Bug,
      description: "Root cause analysis and known errors"
    },
    {
      id: "changes",
      name: "Changes",
      icon: RefreshCw,
      description: "Change requests and approvals"
    }
  ];

  const [, setLocation] = useLocation();

  return (
    <div className="w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 h-full">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
            <Headphones className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              Service Desk
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              IT Service Management
            </p>
          </div>
        </div>
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          {serviceDeskNavigation.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-start space-x-3 p-3 rounded-lg text-left transition-colors",
                  activeTab === item.id
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 mt-0.5 flex-shrink-0",
                  activeTab === item.id
                    ? "text-green-600 dark:text-green-400"
                    : "text-neutral-500 dark:text-neutral-400"
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium",
                    activeTab === item.id
                      ? "text-green-700 dark:text-green-300"
                      : "text-neutral-700 dark:text-neutral-300"
                  )}>
                    {item.name}
                  </p>
                  <p className={cn(
                    "text-xs mt-0.5",
                    activeTab === item.id
                      ? "text-green-600 dark:text-green-400"
                      : "text-neutral-500 dark:text-neutral-400"
                  )}>
                    {item.description}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}