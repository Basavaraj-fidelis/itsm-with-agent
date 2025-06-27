import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus,
  AlertTriangle,
  Users,
  Settings,
  FileText,
  Activity
} from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      title: "Create Ticket",
      description: "New service request",
      icon: Plus,
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
    },
    {
      title: "View Alerts", 
      description: "System notifications",
      icon: AlertTriangle,
      color: "bg-red-500",
      hoverColor: "hover:bg-red-600",
    },
    {
      title: "Manage Users",
      description: "User administration", 
      icon: Users,
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600",
    },
    {
      title: "System Settings",
      description: "Configuration",
      icon: Settings,
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600",
    },
    {
      title: "Generate Report",
      description: "Analytics & insights",
      icon: FileText,
      color: "bg-orange-500", 
      hoverColor: "hover:bg-orange-600",
    },
    {
      title: "System Health",
      description: "Performance monitor",
      icon: Activity,
      color: "bg-indigo-500",
      hoverColor: "hover:bg-indigo-600",
    },
  ];

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-lg border-0 rounded-xl">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-600">
        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className={`${action.color} ${action.hoverColor} text-white border-0 h-auto p-4 flex flex-col items-center space-y-2 transition-all duration-200 hover:scale-105 hover:shadow-lg`}
            >
              <action.icon className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium text-sm">{action.title}</div>
                <div className="text-xs opacity-90">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}