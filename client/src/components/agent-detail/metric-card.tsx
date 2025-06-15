import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  progress?: number;
  color?: "blue" | "green" | "yellow" | "red";
}

const colorClasses = {
  blue: {
    icon: "text-blue-600",
    progress: "bg-blue-500"
  },
  green: {
    icon: "text-green-600", 
    progress: "bg-green-500"
  },
  yellow: {
    icon: "text-yellow-600",
    progress: "bg-yellow-500"
  },
  red: {
    icon: "text-red-600",
    progress: "bg-red-500"
  }
};

export function MetricCard({ title, value, icon: Icon, progress, color = "blue" }: MetricCardProps) {
  const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
  
  const getStatusIcon = () => {
    if (progress === undefined) return null;
    
    if (progress >= 90) return "🔴";
    if (progress >= 75) return "🟡";
    return "🟢";
  };

  return (
    <Card className={`transition-all hover:shadow-md ${
      progress !== undefined && progress >= 85 ? 'ring-2 ring-red-200' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">{title}</p>
              {getStatusIcon()}
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formattedValue}</p>
          </div>
          <Icon className={`w-5 h-5 ${colorClasses[color].icon}`} />
        </div>
        {progress !== undefined && (
          <div className="mt-2">
            <Progress value={progress} className="h-2" />
            {progress >= 85 && (
              <p className="text-xs text-red-600 mt-1 font-medium">Critical</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}