
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
  color?: "blue" | "green" | "red" | "orange" | "purple";
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    cardBg: "bg-blue-50/50",
    iconBg: "bg-blue-100",
    text: "text-blue-700",
    iconColor: "text-blue-600",
    border: "border-blue-100"
  },
  green: {
    bg: "bg-green-50",
    cardBg: "bg-green-50/50",
    iconBg: "bg-green-100",
    text: "text-green-700",
    iconColor: "text-green-600",
    border: "border-green-100"
  },
  red: {
    bg: "bg-red-50",
    cardBg: "bg-red-50/50",
    iconBg: "bg-red-100",
    text: "text-red-700",
    iconColor: "text-red-600",
    border: "border-red-100"
  },
  orange: {
    bg: "bg-orange-50",
    cardBg: "bg-orange-50/50",
    iconBg: "bg-orange-100",
    text: "text-orange-700",
    iconColor: "text-orange-600",
    border: "border-orange-100"
  },
  purple: {
    bg: "bg-purple-50",
    cardBg: "bg-purple-50/50",
    iconBg: "bg-purple-100",
    text: "text-purple-700",
    iconColor: "text-purple-600",
    border: "border-purple-100"
  },
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  color = "blue",
}: MetricCardProps) {
  const colorScheme = colorClasses[color];
  
  return (
    <Card className={`${colorScheme.cardBg} border ${colorScheme.border} hover:shadow-lg transition-all duration-200 rounded-xl`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">
              {title}
            </p>
            <p className={`text-2xl font-bold ${colorScheme.text}`}>
              {value}
            </p>
          </div>
          <div className={`w-12 h-12 ${colorScheme.iconBg} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${colorScheme.iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
