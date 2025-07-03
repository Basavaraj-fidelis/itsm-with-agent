
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

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
  color?: "blue" | "green" | "red" | "orange" | "purple";
}

const colorClasses = {
  blue: {
    bg: "bg-gradient-to-br from-blue-50 to-blue-100/50",
    cardBg: "bg-white/80 backdrop-blur-sm border-blue-200/40",
    iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
    text: "text-blue-900",
    valueText: "text-blue-800",
    iconColor: "text-white",
    accentBg: "bg-blue-100/60",
    changePositive: "text-blue-600",
    changeNegative: "text-blue-500"
  },
  green: {
    bg: "bg-gradient-to-br from-green-50 to-green-100/50",
    cardBg: "bg-white/80 backdrop-blur-sm border-green-200/40",
    iconBg: "bg-gradient-to-br from-green-500 to-green-600",
    text: "text-green-900",
    valueText: "text-green-800",
    iconColor: "text-white",
    accentBg: "bg-green-100/60",
    changePositive: "text-green-600",
    changeNegative: "text-green-500"
  },
  red: {
    bg: "bg-gradient-to-br from-red-50 to-red-100/50",
    cardBg: "bg-white/80 backdrop-blur-sm border-red-200/40",
    iconBg: "bg-gradient-to-br from-red-500 to-red-600",
    text: "text-red-900",
    valueText: "text-red-800",
    iconColor: "text-white",
    accentBg: "bg-red-100/60",
    changePositive: "text-red-600",
    changeNegative: "text-red-500"
  },
  orange: {
    bg: "bg-gradient-to-br from-orange-50 to-orange-100/50",
    cardBg: "bg-white/80 backdrop-blur-sm border-orange-200/40",
    iconBg: "bg-gradient-to-br from-orange-500 to-orange-600",
    text: "text-orange-900",
    valueText: "text-orange-800",
    iconColor: "text-white",
    accentBg: "bg-orange-100/60",
    changePositive: "text-orange-600",
    changeNegative: "text-orange-500"
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-50 to-purple-100/50",
    cardBg: "bg-white/80 backdrop-blur-sm border-purple-200/40",
    iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
    text: "text-purple-900",
    valueText: "text-purple-800",
    iconColor: "text-white",
    accentBg: "bg-purple-100/60",
    changePositive: "text-purple-600",
    changeNegative: "text-purple-500"
  },
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
    <Card className={`${colorScheme.cardBg} border shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group hover:scale-[1.02]`}>
      <CardContent className="p-0">
        {/* Main Content Area */}
        <div className={`${colorScheme.bg} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h3 className={`text-sm font-semibold ${colorScheme.text} mb-1 uppercase tracking-wide`}>
                {title}
              </h3>
              <div className={`text-3xl font-bold ${colorScheme.valueText} leading-none`}>
                {value}
              </div>
            </div>
            <div className={`w-14 h-14 ${colorScheme.iconBg} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
              <Icon className={`w-7 h-7 ${colorScheme.iconColor}`} />
            </div>
          </div>

          {/* Change/Trend Indicator */}
          {(change || trend) && (
            <div className={`${colorScheme.accentBg} rounded-xl p-3 border border-white/30`}>
              {change && (
                <div className="flex items-center space-x-2">
                  {change.type === "increase" ? (
                    <TrendingUp className={`w-4 h-4 ${colorScheme.changePositive}`} />
                  ) : (
                    <TrendingDown className={`w-4 h-4 ${colorScheme.changeNegative}`} />
                  )}
                  <span className={`text-sm font-semibold ${change.type === "increase" ? colorScheme.changePositive : colorScheme.changeNegative}`}>
                    {change.type === "increase" ? "+" : ""}{change.value}
                  </span>
                  <span className={`text-xs ${colorScheme.text} opacity-75`}>
                    {change.label}
                  </span>
                </div>
              )}
              
              {trend && !change && (
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${colorScheme.text} opacity-75`}>
                    {trend.label}
                  </span>
                  <span className={`text-sm font-bold ${colorScheme.valueText}`}>
                    {trend.value}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
