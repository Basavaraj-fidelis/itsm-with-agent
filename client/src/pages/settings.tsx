import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import SettingsSidebar from "@/components/layout/settings-sidebar";
import {
  Settings as SettingsIcon,
  Shield,
  Bell,
  Clock,
  Users,
  Monitor,
  Save,
  Eye,
  Mail,
  Key,
  Server,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Settings() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    return (
      localStorage.getItem("darkMode") === "true" ||
      document.documentElement.classList.contains("dark")
    );
  });
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [smtpSettings, setSmtpSettings] = useState({
    host: "",
    port: "587",
    username: "",
    password: "",
    secure: false,
  });
  const [settings, setSettings] = useState({
    orgName: "ITSM Portal",
    timezone: "utc",
    autoRefresh: true,
    cpuThreshold: 90,
    memoryThreshold: 85,
    diskThreshold: 80,
    collectionInterval: "300",
    performanceMonitoring: true,
    networkMonitoring: true,
    criticalAlerts: true,
    weeklyReports: false,
    adminEmail: "admin@company.com",
    twoFactor: false,
    sessionTimeout: true,
    sessionDuration: "8",
    passwordPolicy: "medium",
    minPasswordLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    passwordExpiry: 90,
    preventReuse: 5,
    accountLockout: true,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Apply dark mode
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
  }, [darkMode]);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("itsm-settings");
    const savedGeneralSettings = localStorage.getItem("settings");

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }

    if (savedGeneralSettings) {
      try {
        const parsed = JSON.parse(savedGeneralSettings);
        if (parsed.darkMode !== undefined) setDarkMode(parsed.darkMode);
        if (parsed.emailNotifications !== undefined)
          setEmailNotifications(parsed.emailNotifications);
        if (parsed.pushNotifications !== undefined)
          setPushNotifications(parsed.pushNotifications);
        if (parsed.notificationEmail !== undefined)
          setNotificationEmail(parsed.notificationEmail);
        if (parsed.smtpSettings !== undefined)
          setSmtpSettings(parsed.smtpSettings);
      } catch (error) {
        console.error("Failed to load general settings:", error);
      }
    }
  }, []);

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setHasChanges(true);

    // Auto-save to localStorage
    localStorage.setItem("itsm-settings", JSON.stringify(newSettings));
  };

  const saveSettings = async () => {
    try {
      // Save all settings to localStorage
      localStorage.setItem("itsm-settings", JSON.stringify(settings));
      localStorage.setItem(
        "settings",
        JSON.stringify({
          darkMode,
          emailNotifications,
          pushNotifications,
          notificationEmail,
          smtpSettings,
        }),
      );

      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get active section from URL or default to general
  const activeSection = location.split('/')[2] || 'general';

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={settings.orgName}
                onChange={(e) => updateSetting('orgName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => updateSetting("timezone", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="est">Eastern Time</SelectItem>
                  <SelectItem value="pst">Pacific Time</SelectItem>
                  <SelectItem value="cet">Central European Time</SelectItem>
                  <SelectItem value="ist">
                    Indian Standard Time (IST)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Enable dark theme for the interface
                </p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-refresh Dashboard</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically refresh data every 30 seconds
                </p>
              </div>
              <Switch
                checked={settings.autoRefresh}
                onCheckedChange={(checked) => updateSetting('autoRefresh', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMonitoringSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Monitoring Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpu-threshold">CPU Alert Threshold (%)</Label>
              <Input
                id="cpu-threshold"
                type="number"
                value={settings.cpuThreshold}
                onChange={(e) =>
                  updateSetting("cpuThreshold", parseInt(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memory-threshold">
                Memory Alert Threshold (%)
              </Label>
              <Input
                id="memory-threshold"
                type="number"
                value={settings.memoryThreshold}
                onChange={(e) =>
                  updateSetting("memoryThreshold", parseInt(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disk-threshold">
                Disk Alert Threshold (%)
              </Label>
              <Input
                id="disk-threshold"
                type="number"
                value={settings.diskThreshold}
                onChange={(e) =>
                  updateSetting("diskThreshold", parseInt(e.target.value))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="collection-interval">
              Data Collection Interval (seconds)
            </Label>
            <Select
              value={settings.collectionInterval}
              onValueChange={(value) =>
                updateSetting("collectionInterval", value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
                <SelectItem value="600">10 minutes</SelectItem>
                <SelectItem value="1800">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Performance Monitoring</Label>
                <p className="text-sm text-muted-foreground">
                  Monitor CPU, memory, and disk usage
                </p>
              </div>
              <Switch
                checked={settings.performanceMonitoring}
                onCheckedChange={(checked) =>
                  updateSetting("performanceMonitoring", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Network Monitoring</Label>
                <p className="text-sm text-muted-foreground">
                  Monitor network traffic and connectivity
                </p>
              </div>
              <Switch
                checked={settings.networkMonitoring}
                onCheckedChange={(checked) =>
                  updateSetting("networkMonitoring", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive browser push notifications
                </p>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Critical Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Instant notifications for critical system alerts
                </p>
              </div>
              <Switch
                checked={settings.criticalAlerts}
                onCheckedChange={(checked) =>
                  updateSetting("criticalAlerts", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly system performance reports
                </p>
              </div>
              <Switch
                checked={settings.weeklyReports}
                onCheckedChange={(checked) =>
                  updateSetting("weeklyReports", checked)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-email">Notification Email</Label>
            <Input
              id="notification-email"
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="admin@company.com"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Two-Factor Authentication
                </Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Switch
                checked={settings.twoFactor}
                onCheckedChange={(checked) =>
                  updateSetting("twoFactor", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Session Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically log out inactive users
                </p>
              </div>
              <Switch
                checked={settings.sessionTimeout}
                onCheckedChange={(checked) =>
                  updateSetting("sessionTimeout", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Account Lockout</Label>
                <p className="text-sm text-muted-foreground">
                  Lock accounts after multiple failed login attempts
                </p>
              </div>
              <Switch
                checked={settings.accountLockout}
                onCheckedChange={(checked) =>
                  updateSetting("accountLockout", checked)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session-duration">Session Duration (hours)</Label>
              <Select
                value={settings.sessionDuration}
                onValueChange={(value) =>
                  updateSetting("sessionDuration", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
              <Input
                id="max-login-attempts"
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) =>
                  updateSetting("maxLoginAttempts", parseInt(e.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-password-length">Min Password Length</Label>
              <Input
                id="min-password-length"
                type="number"
                value={settings.minPasswordLength}
                onChange={(e) =>
                  updateSetting("minPasswordLength", parseInt(e.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lockout-duration">Lockout Duration (minutes)</Label>
              <Input
                id="lockout-duration"
                type="number"
                value={settings.lockoutDuration}
                onChange={(e) =>
                  updateSetting("lockoutDuration", parseInt(e.target.value))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSLAPolicies = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            SLA Policies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Critical Issues</h4>
                <p className="text-sm text-muted-foreground">Response time: 1 hour</p>
                <p className="text-sm text-muted-foreground">Resolution time: 4 hours</p>
              </div>
              <Badge variant="destructive">Critical</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">High Priority</h4>
                <p className="text-sm text-muted-foreground">Response time: 4 hours</p>
                <p className="text-sm text-muted-foreground">Resolution time: 24 hours</p>
              </div>
              <Badge variant="secondary">High</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Medium Priority</h4>
                <p className="text-sm text-muted-foreground">Response time: 24 hours</p>
                <p className="text-sm text-muted-foreground">Resolution time: 72 hours</p>
              </div>
              <Badge variant="outline">Medium</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Low Priority</h4>
                <p className="text-sm text-muted-foreground">Response time: 48 hours</p>
                <p className="text-sm text-muted-foreground">Resolution time: 7 days</p>
              </div>
              <Badge variant="outline">Low</Badge>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <h3 className="text-lg font-medium">Business Hours</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" defaultValue="09:00" />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" defaultValue="17:00" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAgentSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Agent Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Auto-assignment</h4>
                <p className="text-sm text-muted-foreground">Automatically assign tickets to available agents</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Load Balancing</h4>
                <p className="text-sm text-muted-foreground">Distribute tickets evenly among agents</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Agent Monitoring</h4>
                <p className="text-sm text-muted-foreground">Monitor agent system performance</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <h3 className="text-lg font-medium">Deployment Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Collection Interval (seconds)</Label>
                <Select defaultValue="300">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">60 seconds</SelectItem>
                    <SelectItem value="120">2 minutes</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="600">10 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Agent Port</Label>
                <Input defaultValue="8080" />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button variant="outline">
              Download Agent Package
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return renderGeneralSettings();
      case 'monitoring':
        return renderMonitoringSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      case 'sla':
        return renderSLAPolicies();
      case 'agent':
        return renderAgentSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900">
      <SettingsSidebar activeTab={activeSection} onTabChange={() => {}} />
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <div className="mb-8">
          <p className="text-neutral-600">System configuration and preferences</p>
        </div>
          {renderContent()}

          {/* Save Button */}
          {hasChanges && (
            <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                onClick={saveSettings}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}