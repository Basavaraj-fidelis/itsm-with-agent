
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon } from "lucide-react";

interface GeneralSettingsProps {
  settings: any;
  darkMode: boolean;
  onSettingUpdate: (key: string, value: any) => void;
  onDarkModeChange: (value: boolean) => void;
}

export function GeneralSettings({ 
  settings, 
  darkMode, 
  onSettingUpdate, 
  onDarkModeChange 
}: GeneralSettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Basic Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={settings.orgName}
                onChange={(e) => onSettingUpdate("orgName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={settings.adminEmail}
                onChange={(e) => onSettingUpdate("adminEmail", e.target.value)}
                placeholder="admin@company.com"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Interface Preferences</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable dark theme
                  </p>
                </div>
                <Switch checked={darkMode} onCheckedChange={onDarkModeChange} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-refresh Dashboard</Label>
                  <p className="text-sm text-muted-foreground">
                    Refresh data automatically every 30 seconds
                  </p>
                </div>
                <Switch
                  checked={settings.autoRefresh}
                  onCheckedChange={(checked) =>
                    onSettingUpdate("autoRefresh", checked)
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Regional Settings</h3>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => onSettingUpdate("timezone", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="est">Eastern Time</SelectItem>
                  <SelectItem value="cst">Central Time</SelectItem>
                  <SelectItem value="pst">Pacific Time</SelectItem>
                  <SelectItem value="ist">Indian Standard Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
