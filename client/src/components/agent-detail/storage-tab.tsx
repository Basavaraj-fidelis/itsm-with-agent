
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrive } from "lucide-react";

interface StorageTabProps {
  storage: any[];
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-neutral-600">{label}:</span>
    <span className="font-medium">{value || "N/A"}</span>
  </div>
);

export function StorageTab({ storage }: StorageTabProps) {
  return (
    <Card className="shadow-lg rounded-2xl border border-gray-200 dark:border-gray-700">
      <CardHeader className="bg-muted/40 rounded-t-2xl p-4">
        <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-neutral-800 dark:text-neutral-200">
          <HardDrive className="w-5 h-5 text-primary" />
          <span>Storage Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {storage.length > 0 ? (
            storage.map((drive: any, index: number) => {
              const usage = Math.round(drive.percent || drive.usage?.percentage || 0) || 0;
              const bytesToGB = (bytes: number) => {
                if (!bytes || bytes === 0) return "0 GB";
                return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
              };

              return (
                <div key={index} className="bg-muted/10 dark:bg-muted/20 p-5 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2 mb-4">
                    <HardDrive className="w-5 h-5 text-orange-500" />
                    <h4 className="text-base font-semibold">
                      {drive.device || drive.mountpoint || `Drive ${index + 1}`}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <Stat label="Total Size" value={bytesToGB(drive.total)} />
                    <Stat label="Used" value={bytesToGB(drive.used)} />
                    <Stat label="Free" value={bytesToGB(drive.free)} />
                    <Stat label="Filesystem" value={drive.filesystem || "N/A"} />
                    <Stat label="Mount Point" value={drive.mountpoint || "N/A"} />
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-neutral-600">Usage</span>
                      <span className={`${usage >= 85 ? "text-red-600" : usage >= 75 ? "text-yellow-600" : "text-green-600"}`}>
                        {usage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${usage >= 85 ? "bg-red-600" : usage >= 75 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${usage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <HardDrive className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
              <p>No storage data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
