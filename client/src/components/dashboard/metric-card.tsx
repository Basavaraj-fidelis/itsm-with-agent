
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: string;
    type: "increase" | "decrease";
    label: string;
  };
  trend?: {
    label: string;
    value: string;
  };
  color?: "blue" | "green" | "red" | "orange";
}

const colorClasses = {
  blue: {
    bg: "bg-gradient-to-br from-blue-500 to-blue-600",
    text: "text-blue-600",
    light: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800"
  },
  green: {
    bg: "bg-gradient-to-br from-green-500 to-green-600",
    text: "text-green-600",
    light: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800"
  },
  red: {
    bg: "bg-gradient-to-br from-red-500 to-red-600",
    text: "text-red-600",
    light: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800"
  },
  orange: {
    bg: "bg-gradient-to-br from-orange-500 to-orange-600",
    text: "text-orange-600",
    light: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-200 dark:border-orange-800"
  },
};

const changeClasses = {
  increase: "text-green-600 dark:text-green-400",
  decrease: "text-red-600 dark:text-red-400",
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  change,
  trend,
  color = "blue",
}: MetricCardProps) {
  const colorScheme = colorClasses[color];
  
  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden group hover:scale-105">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 group-hover:scale-105 transition-transform">
              {[
                "Total Agents",
                "Online Agents", 
                "Offline Agents",
                "Alerts",
              ].includes(title)
                ? value
                : typeof value === "string"
                  ? value
                  : `${Math.round(parseFloat(value.toString()))}%`}
            </p>
          </div>
          <div className={`w-14 h-14 ${colorScheme.bg} rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>

        {change && (
          <div className={`flex items-center text-sm p-3 rounded-lg ${colorScheme.light} ${colorScheme.border} border`}>
            <div className={`flex items-center ${changeClasses[change.type]}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${change.type === 'increase' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="font-semibold">
                {change.type === "increase" ? "+" : ""}{change.value}
              </span>
            </div>
            <span className="text-gray-600 dark:text-gray-300 ml-2">{change.label}</span>
          </div>
        )}

        {trend && (
          <div className={`mt-3 text-sm p-3 rounded-lg ${colorScheme.light} ${colorScheme.border} border`}>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">{trend.label}:</span>
              <span className={`font-semibold ${colorScheme.text}`}>{trend.value}</span>
            </div>
          </div>
        )}

        {/* Progress indicator for percentage values */}
        {!["Total Agents", "Online Agents", "Offline Agents", "Alerts"].includes(title) && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${colorScheme.bg} transition-all duration-500 ease-out`}
                style={{
                  width: `${Math.min(typeof value === "string" ? parseFloat(value) : value, 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
