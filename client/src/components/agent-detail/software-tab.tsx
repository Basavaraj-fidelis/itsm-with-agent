
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

interface SoftwareTabProps {
  software: any[];
}

export function SoftwareTab({ software }: SoftwareTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Info className="w-5 h-5" />
          <span>Installed Software</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {software.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {software.map((softwareItem, index) => (
                <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                  <div className="text-sm">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                      {softwareItem.name || softwareItem.display_name || "N/A"}
                    </div>
                    <div className="text-neutral-600">
                      Version: {softwareItem.version || softwareItem.display_version || "N/A"}
                    </div>
                    {softwareItem.vendor && (
                      <div className="text-neutral-500 text-xs">
                        Vendor: {softwareItem.vendor}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <Info className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
              <p>No software data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
