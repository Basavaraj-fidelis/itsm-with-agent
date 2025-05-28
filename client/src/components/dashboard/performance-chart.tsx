import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export function PerformanceChart() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>System Performance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-500">Performance chart integration</p>
            <p className="text-sm text-neutral-400">CPU, Memory, Disk usage over time</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
