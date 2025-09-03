
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALERT_THRESHOLDS } from "@shared/alert-thresholds";
import { Monitor } from "lucide-react";

interface MonitoringSettingsProps {
  settings: any;
  onSettingUpdate: (key: string, value: any) => void;
}

export function MonitoringSettings({ settings, onSettingUpdate }: MonitoringSettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            System Monitoring Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Standardized Alert Thresholds</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">CPU Usage:</span>
                  <div className="mt-1 space-y-1">
                    <div>Critical: {ALERT_THRESHOLDS?.CPU?.CRITICAL || 95}%+</div>
                    <div>High: {ALERT_THRESHOLDS?.CPU?.HIGH || 85}%+</div>
                    <div>Warning: {ALERT_THRESHOLDS?.CPU?.WARNING || 70}%+</div>
                    <div>Info: {ALERT_THRESHOLDS?.CPU?.INFO || 50}%+</div>
                  </div>
                </div>
                <div>
                  <span className="font-medium">Memory Usage:</span>
                  <div className="mt-1 space-y-1">
                    <div>Critical: {ALERT_THRESHOLDS?.MEMORY?.CRITICAL || 95}%+</div>
                    <div>High: {ALERT_THRESHOLDS?.MEMORY?.HIGH || 85}%+</div>
                    <div>Warning: {ALERT_THRESHOLDS?.MEMORY?.WARNING || 70}%+</div>
                    <div>Info: {ALERT_THRESHOLDS?.MEMORY?.INFO || 50}%+</div>
                  </div>
                </div>
                <div>
                  <span className="font-medium">Disk Usage:</span>
                  <div className="mt-1 space-y-1">
                    <div>Critical: {ALERT_THRESHOLDS?.DISK?.CRITICAL || 95}%+</div>
                    <div>High: {ALERT_THRESHOLDS?.DISK?.HIGH || 85}%+</div>
                    <div>Warning: {ALERT_THRESHOLDS?.DISK?.WARNING || 70}%+</div>
                    <div>Info: {ALERT_THRESHOLDS?.DISK?.INFO || 50}%+</div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                These standardized thresholds are used across all System Alerts and agent monitoring views.
                Critical alerts automatically trigger ticket creation options.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="collection-interval">
              Data Collection Interval
            </Label>
            <Select
              value={settings.collectionInterval}
              onValueChange={(value) =>
                onSettingUpdate("collectionInterval", value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
                <SelectItem value="600">10 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
