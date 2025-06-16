import { useState } from "react";
import { cn } from "@/lib/utils";
import { Settings, Monitor, Bell, Shield, Clock, Server } from "lucide-react";
import { useLocation } from "wouter";

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  const settingsNavigation = [
    {
      id: 'general',
      name: 'General',
      icon: Settings,
      description: 'Basic system settings'
    },
    {
      id: 'monitoring',
      name: 'Monitoring',
      icon: Monitor,
      description: 'System monitoring configuration'
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: Bell,
      description: 'Notification preferences'
    },
    {
      id: 'security',
      name: 'Security',
      icon: Shield,
      description: 'Security and authentication'
    },
    {
      id: 'sla',
      name: 'SLA Management',
      icon: Clock,
      description: 'Service level agreements and escalation policies'
    },
    {
      id: 'agent',
      name: 'Agent',
      icon: Server,
      description: 'Agent deployment and configuration'
    },
    {
      id: 'active-directory',
      name: 'Active Directory',
      icon: Shield,
      description: 'Manage Active Directory integration'
    }
  ];

  const [, setLocation] = useLocation();

  return (
    <div className="w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 h-full">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
          Settings
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          System configuration
        </p>
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          {settingsNavigation.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => {
                  if (item.id === 'active-directory') {
                    setLocation('/settings/active-directory');
                  } else {
                    setLocation(`/settings/${item.id}`);
                  }
                }}
                className={cn(
                  "w-full flex items-start space-x-3 p-3 rounded-lg text-left transition-colors",
                  activeTab === item.id
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 mt-0.5 flex-shrink-0",
                  activeTab === item.id
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-neutral-500 dark:text-neutral-400"
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium",
                    activeTab === item.id
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-neutral-700 dark:text-neutral-300"
                  )}>
                    {item.name}
                  </p>
                  <p className={cn(
                    "text-xs mt-0.5",
                    activeTab === item.id
                      ? "text-blue-600 dark:text-blue-400"
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