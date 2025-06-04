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
  color?: "blue" | "green" | "red" | "purple";
}

const colorClasses = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  red: "bg-red-100 text-red-600",
  purple: "bg-purple-100 text-purple-600",
};

const changeClasses = {
  increase: "text-green-600",
  decrease: "text-red-600",
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  change,
  trend,
  color = "blue",
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-600">{title}</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
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
          <div
            className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center`}
          >
            <Icon className="w-6 h-6" />
          </div>
        </div>

        {change && (
          <div className="mt-4 flex items-center text-sm">
            <span className={`font-medium ${changeClasses[change.type]}`}>
              {/* {change.type === "increase" ? "+" : "-"} */}
              {change.value}
            </span>
            <span className="text-neutral-600 ml-1">{change.label}</span>
          </div>
        )}

        {trend && (
          <div className="mt-4 text-sm text-neutral-600">
            <span>{trend.label}: </span>
            <span className="font-medium">{trend.value}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
