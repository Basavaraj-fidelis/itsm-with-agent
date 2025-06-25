
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
    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-3xl overflow-hidden group hover:scale-[1.02] hover:border-gray-300/60 dark:hover:border-gray-600/60">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 uppercase tracking-wide">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 group-hover:scale-105 transition-transform duration-200">
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
          <div className={`w-16 h-16 ${colorScheme.bg} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>

        {change && (
          <div className={`flex items-center text-sm p-4 rounded-2xl ${colorScheme.light} ${colorScheme.border} border-2 border-opacity-50 shadow-sm hover:shadow-md transition-all duration-200`}>
            <div className={`flex items-center ${changeClasses[change.type]}`}>
              <div className={`w-3 h-3 rounded-full mr-3 ${change.type === 'increase' ? 'bg-green-500' : 'bg-red-500'} ${change.type === 'increase' ? 'animate-pulse' : ''} shadow-sm`}></div>
              <span className="font-bold text-base">
                {change.type === "increase" ? "+" : ""}{change.value}
              </span>
            </div>
            <span className="text-gray-600 dark:text-gray-300 ml-3 font-medium">{change.label}</span>
          </div>
        )}

        {trend && (
          <div className={`mt-4 text-sm p-4 rounded-2xl ${colorScheme.light} ${colorScheme.border} border-2 border-opacity-50 shadow-sm hover:shadow-md transition-all duration-200`}>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300 font-medium">{trend.label}:</span>
              <span className={`font-bold text-base ${colorScheme.text}`}>{trend.value}</span>
            </div>
          </div>
        )}

        {/* Progress indicator for percentage values */}
        {!["Total Agents", "Online Agents", "Offline Agents", "Alerts"].includes(title) && (
          <div className="mt-5">
            <div className="w-full bg-gray-200/70 dark:bg-gray-700/70 rounded-full h-3 shadow-inner overflow-hidden">
              <div
                className={`h-full rounded-full ${colorScheme.bg} transition-all duration-700 ease-out shadow-sm`}
                style={{
                  width: `${Math.min(typeof value === "string" ? parseFloat(value) : value, 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>0%</span>
              <span className="font-medium">
                {Math.min(typeof value === "string" ? parseFloat(value) : value, 100).toFixed(1)}%
              </span>
              <span>100%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
