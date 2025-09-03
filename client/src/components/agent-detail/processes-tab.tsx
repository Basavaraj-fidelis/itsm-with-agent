
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, MemoryStick } from "lucide-react";

interface ProcessesTabProps {
  processes: any[];
}

export function ProcessesTab({ processes }: ProcessesTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Processes by Memory Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MemoryStick className="w-5 h-5" />
            <span>Top 10 Processes (by Memory Usage)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {processes.length > 0 ? (
              <div className="space-y-3">
                {processes.map((process, index) => (
                  <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-neutral-600">Process: </span>
                        <span className="font-medium">{process.name || "N/A"}</span>
                        <p className="text-xs text-neutral-500">PID: {process.pid || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-neutral-600">Memory: </span>
                        <span className={`font-medium ${(process.memory_percent || 0) >= 10 ? "text-red-600" : (process.memory_percent || 0) >= 5 ? "text-yellow-600" : "text-green-600"}`}>
                          {(process.memory_percent || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-600">User: </span>
                        <span className="font-medium text-xs">{process.username || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <MemoryStick className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                <p>No process data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Processes by CPU Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Cpu className="w-5 h-5" />
            <span>Top 10 Processes (by CPU Usage)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {processes.length > 0 ? (
              <div className="space-y-3">
                {processes
                  .sort((a, b) => (b.cpu_percent || 0) - (a.cpu_percent || 0))
                  .slice(0, 10)
                  .map((process, index) => (
                    <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-neutral-600">Process: </span>
                          <span className="font-medium">{process.name || "N/A"}</span>
                          <p className="text-xs text-neutral-500">PID: {process.pid || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-neutral-600">CPU: </span>
                          <span className={`font-medium ${(process.cpu_percent || 0) >= 10 ? "text-red-600" : (process.cpu_percent || 0) >= 5 ? "text-yellow-600" : "text-green-600"}`}>
                            {(process.cpu_percent || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-600">User: </span>
                          <span className="font-medium text-xs">{process.username || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <Cpu className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                <p>No CPU process data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
