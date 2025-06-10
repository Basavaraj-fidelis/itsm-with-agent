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
            Organization Settings
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
              <Label htmlFor="orgEmail">Organization Email</Label>
              <Input
                id="orgEmail"
                type="email"
                value={settings.adminEmail}
                onChange={(e) => updateSetting('adminEmail', e.target.value)}
                placeholder="admin@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgAddress">Organization Address</Label>
              <Input
                id="orgAddress"
                value={settings.orgAddress || ""}
                onChange={(e) => updateSetting('orgAddress', e.target.value)}
                placeholder="123 Business St, City, State"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgPhone">Organization Phone</Label>
              <Input
                id="orgPhone"
                value={settings.orgPhone || ""}
                onChange={(e) => updateSetting('orgPhone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Regional Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                  <SelectItem value="est">Eastern Time (EST)</SelectItem>
                  <SelectItem value="cst">Central Time (CST)</SelectItem>
                  <SelectItem value="mst">Mountain Time (MST)</SelectItem>
                  <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                  <SelectItem value="cet">Central European Time</SelectItem>
                  <SelectItem value="ist">Indian Standard Time (IST)</SelectItem>
                  <SelectItem value="jst">Japan Standard Time (JST)</SelectItem>
                  <SelectItem value="aest">Australian Eastern Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select
                value={settings.dateFormat || "mm/dd/yyyy"}
                onValueChange={(value) => updateSetting("dateFormat", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  <SelectItem value="dd-mm-yyyy">DD-MM-YYYY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeFormat">Time Format</Label>
              <Select
                value={settings.timeFormat || "12"}
                onValueChange={(value) => updateSetting("timeFormat", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 Hour (AM/PM)</SelectItem>
                  <SelectItem value="24">24 Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={settings.language || "en"}
                onValueChange={(value) => updateSetting("language", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Interface Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Compact View</Label>
                <p className="text-sm text-muted-foreground">
                  Use compact layout for better screen utilization
                </p>
              </div>
              <Switch
                checked={settings.compactView || false}
                onCheckedChange={(checked) => updateSetting('compactView', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Tooltips</Label>
                <p className="text-sm text-muted-foreground">
                  Display helpful tooltips throughout the interface
                </p>
              </div>
              <Switch
                checked={settings.showTooltips !== false}
                onCheckedChange={(checked) => updateSetting('showTooltips', checked)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refreshInterval">Dashboard Refresh Interval</Label>
            <Select
              value={settings.refreshInterval || "30"}
              onValueChange={(value) => updateSetting("refreshInterval", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 seconds</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
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
            System Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpu-threshold">CPU Alert Threshold (%)</Label>
              <Input
                id="cpu-threshold"
                type="number"
                min="50"
                max="100"
                value={settings.cpuThreshold}
                onChange={(e) =>
                  updateSetting("cpuThreshold", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">Warning: 80%, Critical: 90%</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memory-threshold">Memory Alert Threshold (%)</Label>
              <Input
                id="memory-threshold"
                type="number"
                min="50"
                max="100"
                value={settings.memoryThreshold}
                onChange={(e) =>
                  updateSetting("memoryThreshold", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">Warning: 75%, Critical: 85%</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="disk-threshold">Disk Alert Threshold (%)</Label>
              <Input
                id="disk-threshold"
                type="number"
                min="50"
                max="100"
                value={settings.diskThreshold}
                onChange={(e) =>
                  updateSetting("diskThreshold", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">Warning: 70%, Critical: 80%</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="network-threshold">Network Latency (ms)</Label>
              <Input
                id="network-threshold"
                type="number"
                min="100"
                max="5000"
                value={settings.networkThreshold || 1000}
                onChange={(e) =>
                  updateSetting("networkThreshold", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">Alert when response &gt; threshold</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature-threshold">Temperature (°C)</Label>
              <Input
                id="temperature-threshold"
                type="number"
                min="60"
                max="100"
                value={settings.temperatureThreshold || 75}
                onChange={(e) =>
                  updateSetting("temperatureThreshold", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">CPU temperature alert threshold</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="uptime-threshold">Uptime Alert (hours)</Label>
              <Input
                id="uptime-threshold"
                type="number"
                min="1"
                max="8760"
                value={settings.uptimeThreshold || 720}
                onChange={(e) =>
                  updateSetting("uptimeThreshold", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">Alert when downtime exceeds</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Collection & Retention
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="collection-interval">Data Collection Interval</Label>
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
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="600">10 minutes</SelectItem>
                  <SelectItem value="1800">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="data-retention">Data Retention Period</Label>
              <Select
                value={settings.dataRetention || "30"}
                onValueChange={(value) => updateSetting("dataRetention", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">6 months</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-level">Monitoring Log Level</Label>
              <Select
                value={settings.logLevel || "info"}
                onValueChange={(value) => updateSetting("logLevel", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sample-rate">Metric Sample Rate (%)</Label>
              <Input
                id="sample-rate"
                type="number"
                min="1"
                max="100"
                value={settings.sampleRate || 100}
                onChange={(e) =>
                  updateSetting("sampleRate", parseInt(e.target.value))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Monitoring Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Performance Monitoring</Label>
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

            <div className="flex items-center justify-between">
              <div>
                <Label>Application Monitoring</Label>
                <p className="text-sm text-muted-foreground">
                  Monitor application performance and errors
                </p>
              </div>
              <Switch
                checked={settings.applicationMonitoring || false}
                onCheckedChange={(checked) =>
                  updateSetting("applicationMonitoring", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Security Monitoring</Label>
                <p className="text-sm text-muted-foreground">
                  Monitor security events and authentication
                </p>
              </div>
              <Switch
                checked={settings.securityMonitoring || false}
                onCheckedChange={(checked) =>
                  updateSetting("securityMonitoring", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Database Monitoring</Label>
                <p className="text-sm text-muted-foreground">
                  Monitor database performance and queries
                </p>
              </div>
              <Switch
                checked={settings.databaseMonitoring || false}
                onCheckedChange={(checked) =>
                  updateSetting("databaseMonitoring", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Predictive Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Use AI to predict potential issues
                </p>
              </div>
              <Switch
                checked={settings.predictiveAnalytics || false}
                onCheckedChange={(checked) =>
                  updateSetting("predictiveAnalytics", checked)
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
            Notification Channels
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
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive critical alerts via SMS
                </p>
              </div>
              <Switch
                checked={settings.smsNotifications || false}
                onCheckedChange={(checked) =>
                  updateSetting("smsNotifications", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Slack Integration</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications to Slack channels
                </p>
              </div>
              <Switch
                checked={settings.slackNotifications || false}
                onCheckedChange={(checked) =>
                  updateSetting("slackNotifications", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Microsoft Teams</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications to Teams channels
                </p>
              </div>
              <Switch
                checked={settings.teamsNotifications || false}
                onCheckedChange={(checked) =>
                  updateSetting("teamsNotifications", checked)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notification-email">Primary Email</Label>
              <Input
                id="notification-email"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="admin@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary-email">Secondary Email</Label>
              <Input
                id="secondary-email"
                type="email"
                value={settings.secondaryEmail || ""}
                onChange={(e) => updateSetting('secondaryEmail', e.target.value)}
                placeholder="backup@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-number">SMS Number</Label>
              <Input
                id="sms-number"
                type="tel"
                value={settings.smsNumber || ""}
                onChange={(e) => updateSetting('smsNumber', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
              <Input
                id="slack-webhook"
                type="url"
                value={settings.slackWebhook || ""}
                onChange={(e) => updateSetting('slackWebhook', e.target.value)}
                placeholder="https://hooks.slack.com/..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Notification Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Critical System Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Instant notifications for critical system failures
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
                <Label>Security Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications for security incidents and breaches
                </p>
              </div>
              <Switch
                checked={settings.securityAlerts || true}
                onCheckedChange={(checked) =>
                  updateSetting("securityAlerts", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ticket Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications when tickets are created or updated
                </p>
              </div>
              <Switch
                checked={settings.ticketUpdates !== false}
                onCheckedChange={(checked) =>
                  updateSetting("ticketUpdates", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Agent Status Changes</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications when agents go online/offline
                </p>
              </div>
              <Switch
                checked={settings.agentStatusUpdates || false}
                onCheckedChange={(checked) =>
                  updateSetting("agentStatusUpdates", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Performance Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications for performance threshold breaches
                </p>
              </div>
              <Switch
                checked={settings.performanceAlerts !== false}
                onCheckedChange={(checked) =>
                  updateSetting("performanceAlerts", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Windows</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications for scheduled maintenance
                </p>
              </div>
              <Switch
                checked={settings.maintenanceNotifications !== false}
                onCheckedChange={(checked) =>
                  updateSetting("maintenanceNotifications", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Delivery Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet-hours-start">Quiet Hours Start</Label>
              <Input
                id="quiet-hours-start"
                type="time"
                value={settings.quietHoursStart || "22:00"}
                onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-hours-end">Quiet Hours End</Label>
              <Input
                id="quiet-hours-end"
                type="time"
                value={settings.quietHoursEnd || "07:00"}
                onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="digest-frequency">Email Digest Frequency</Label>
              <Select
                value={settings.digestFrequency || "daily"}
                onValueChange={(value) => updateSetting("digestFrequency", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="escalation-delay">Escalation Delay (minutes)</Label>
              <Input
                id="escalation-delay"
                type="number"
                min="5"
                max="1440"
                value={settings.escalationDelay || 30}
                onChange={(e) =>
                  updateSetting("escalationDelay", parseInt(e.target.value))
                }
              />
            </div>
          </div>

          <div className="space-y-4">
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

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Monthly Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Receive monthly analytics and trends
                </p>
              </div>
              <Switch
                checked={settings.monthlyReports || false}
                onCheckedChange={(checked) =>
                  updateSetting("monthlyReports", checked)
                }
              />
            </div>
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
            Authentication & Access
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
                <Label>Single Sign-On (SSO)</Label>
                <p className="text-sm text-muted-foreground">
                  Enable SAML/OAuth integration for enterprise login
                </p>
              </div>
              <Switch
                checked={settings.ssoEnabled || false}
                onCheckedChange={(checked) =>
                  updateSetting("ssoEnabled", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>LDAP Integration</Label>
                <p className="text-sm text-muted-foreground">
                  Authenticate users against Active Directory
                </p>
              </div>
              <Switch
                checked={settings.ldapEnabled || false}
                onCheckedChange={(checked) =>
                  updateSetting("ldapEnabled", checked)
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

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>IP Whitelisting</Label>
                <p className="text-sm text-muted-foreground">
                  Restrict access to specific IP addresses
                </p>
              </div>
              <Switch
                checked={settings.ipWhitelisting || false}
                onCheckedChange={(checked) =>
                  updateSetting("ipWhitelisting", checked)
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
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
              <Input
                id="max-login-attempts"
                type="number"
                min="3"
                max="10"
                value={settings.maxLoginAttempts}
                onChange={(e) =>
                  updateSetting("maxLoginAttempts", parseInt(e.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lockout-duration">Lockout Duration (minutes)</Label>
              <Input
                id="lockout-duration"
                type="number"
                min="5"
                max="1440"
                value={settings.lockoutDuration}
                onChange={(e) =>
                  updateSetting("lockoutDuration", parseInt(e.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="concurrent-sessions">Max Concurrent Sessions</Label>
              <Input
                id="concurrent-sessions"
                type="number"
                min="1"
                max="10"
                value={settings.maxConcurrentSessions || 3}
                onChange={(e) =>
                  updateSetting("maxConcurrentSessions", parseInt(e.target.value))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Password Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-password-length">Minimum Password Length</Label>
              <Input
                id="min-password-length"
                type="number"
                min="6"
                max="32"
                value={settings.minPasswordLength}
                onChange={(e) =>
                  updateSetting("minPasswordLength", parseInt(e.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-complexity">Password Complexity</Label>
              <Select
                value={settings.passwordPolicy}
                onValueChange={(value) => updateSetting("passwordPolicy", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Letters only</SelectItem>
                  <SelectItem value="medium">Medium - Letters + Numbers</SelectItem>
                  <SelectItem value="high">High - Letters + Numbers + Symbols</SelectItem>
                  <SelectItem value="enterprise">Enterprise - All + Special Rules</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-expiry">Password Expiry (days)</Label>
              <Input
                id="password-expiry"
                type="number"
                min="0"
                max="365"
                value={settings.passwordExpiry}
                onChange={(e) =>
                  updateSetting("passwordExpiry", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">0 = never expires</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-history">Password History Count</Label>
              <Input
                id="password-history"
                type="number"
                min="0"
                max="24"
                value={settings.preventReuse}
                onChange={(e) =>
                  updateSetting("preventReuse", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">Prevent reusing last N passwords</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Uppercase Letters</Label>
                <p className="text-sm text-muted-foreground">
                  Password must contain at least one uppercase letter
                </p>
              </div>
              <Switch
                checked={settings.requireUppercase}
                onCheckedChange={(checked) =>
                  updateSetting("requireUppercase", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Lowercase Letters</Label>
                <p className="text-sm text-muted-foreground">
                  Password must contain at least one lowercase letter
                </p>
              </div>
              <Switch
                checked={settings.requireLowercase}
                onCheckedChange={(checked) =>
                  updateSetting("requireLowercase", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Numbers</Label>
                <p className="text-sm text-muted-foreground">
                  Password must contain at least one number
                </p>
              </div>
              <Switch
                checked={settings.requireNumbers}
                onCheckedChange={(checked) =>
                  updateSetting("requireNumbers", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Special Characters</Label>
                <p className="text-sm text-muted-foreground">
                  Password must contain at least one special character
                </p>
              </div>
              <Switch
                checked={settings.requireSpecialChars}
                onCheckedChange={(checked) =>
                  updateSetting("requireSpecialChars", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Security Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Audit Logging</Label>
                <p className="text-sm text-muted-foreground">
                  Log all user actions and system changes
                </p>
              </div>
              <Switch
                checked={settings.auditLogging !== false}
                onCheckedChange={(checked) =>
                  updateSetting("auditLogging", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Failed Login Monitoring</Label>
                <p className="text-sm text-muted-foreground">
                  Monitor and alert on failed login attempts
                </p>
              </div>
              <Switch
                checked={settings.loginMonitoring !== false}
                onCheckedChange={(checked) =>
                  updateSetting("loginMonitoring", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Privilege Escalation Detection</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when users attempt unauthorized actions
                </p>
              </div>
              <Switch
                checked={settings.privilegeMonitoring || false}
                onCheckedChange={(checked) =>
                  updateSetting("privilegeMonitoring", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Data Access Monitoring</Label>
                <p className="text-sm text-muted-foreground">
                  Monitor access to sensitive data and files
                </p>
              </div>
              <Switch
                checked={settings.dataAccessMonitoring || false}
                onCheckedChange={(checked) =>
                  updateSetting("dataAccessMonitoring", checked)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="audit-retention">Audit Log Retention (days)</Label>
              <Input
                id="audit-retention"
                type="number"
                min="30"
                max="2555"
                value={settings.auditRetention || 365}
                onChange={(e) =>
                  updateSetting("auditRetention", parseInt(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="security-scan-frequency">Security Scan Frequency</Label>
              <Select
                value={settings.securityScanFrequency || "weekly"}
                onValueChange={(value) => updateSetting("securityScanFrequency", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
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
            Priority-Based SLA Policies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-red-800 dark:text-red-200">Critical Issues</h4>
                  <Badge variant="destructive">P1 - Critical</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Response Time</Label>
                    <p className="font-medium">15 minutes</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Resolution Time</Label>
                    <p className="font-medium">4 hours</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Escalation</Label>
                    <p className="font-medium">30 minutes</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">System outages, security breaches, data loss</p>
              </div>

              <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-orange-800 dark:text-orange-200">High Priority</h4>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">P2 - High</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Response Time</Label>
                    <p className="font-medium">2 hours</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Resolution Time</Label>
                    <p className="font-medium">24 hours</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Escalation</Label>
                    <p className="font-medium">4 hours</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Major functionality impacted, multiple users affected</p>
              </div>

              <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Medium Priority</h4>
                  <Badge variant="outline" className="border-yellow-300 text-yellow-700">P3 - Medium</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Response Time</Label>
                    <p className="font-medium">8 hours</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Resolution Time</Label>
                    <p className="font-medium">72 hours</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Escalation</Label>
                    <p className="font-medium">24 hours</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Minor functionality issues, workarounds available</p>
              </div>

              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Low Priority</h4>
                  <Badge variant="outline" className="border-blue-300 text-blue-700">P4 - Low</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Response Time</Label>
                    <p className="font-medium">24 hours</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Resolution Time</Label>
                    <p className="font-medium">7 days</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Escalation</Label>
                    <p className="font-medium">72 hours</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Enhancement requests, cosmetic issues, documentation</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Business Hours & Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business-start">Business Hours Start</Label>
              <Input 
                id="business-start"
                type="time" 
                value={settings.businessHoursStart || "09:00"}
                onChange={(e) => updateSetting('businessHoursStart', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-end">Business Hours End</Label>
              <Input 
                id="business-end"
                type="time" 
                value={settings.businessHoursEnd || "17:00"}
                onChange={(e) => updateSetting('businessHoursEnd', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-timezone">Support Timezone</Label>
              <Select
                value={settings.supportTimezone || settings.timezone}
                onValueChange={(value) => updateSetting("supportTimezone", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="est">Eastern Time</SelectItem>
                  <SelectItem value="cst">Central Time</SelectItem>
                  <SelectItem value="pst">Pacific Time</SelectItem>
                  <SelectItem value="cet">Central European Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekend-support">Weekend Support</Label>
              <Select
                value={settings.weekendSupport || "none"}
                onValueChange={(value) => updateSetting("weekendSupport", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Support</SelectItem>
                  <SelectItem value="critical">Critical Only</SelectItem>
                  <SelectItem value="limited">Limited Hours</SelectItem>
                  <SelectItem value="full">Full Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Working Days</h3>
            <div className="grid grid-cols-7 gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => (
                <div key={day} className="flex items-center space-x-2">
                  <Switch
                    checked={settings.workingDays?.[index] !== false}
                    onCheckedChange={(checked) => {
                      const workingDays = settings.workingDays || [true, true, true, true, true, false, false];
                      workingDays[index] = checked;
                      updateSetting('workingDays', [...workingDays]);
                    }}
                  />
                  <Label className="text-xs">{day.slice(0, 3)}</Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            SLA Breach Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Escalation</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically escalate tickets approaching SLA breach
                </p>
              </div>
              <Switch
                checked={settings.autoEscalation !== false}
                onCheckedChange={(checked) =>
                  updateSetting("autoEscalation", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SLA Breach Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications when SLA is breached
                </p>
              </div>
              <Switch
                checked={settings.slaBreachNotifications !== false}
                onCheckedChange={(checked) =>
                  updateSetting("slaBreachNotifications", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SLA Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Generate regular SLA compliance reports
                </p>
              </div>
              <Switch
                checked={settings.slaReports !== false}
                onCheckedChange={(checked) =>
                  updateSetting("slaReports", checked)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="escalation-warning">Escalation Warning (%)</Label>
              <Input
                id="escalation-warning"
                type="number"
                min="10"
                max="90"
                value={settings.escalationWarning || 80}
                onChange={(e) =>
                  updateSetting("escalationWarning", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">Warning when SLA time % consumed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sla-buffer">SLA Buffer Time (%)</Label>
              <Input
                id="sla-buffer"
                type="number"
                min="0"
                max="50"
                value={settings.slaBuffer || 10}
                onChange={(e) =>
                  updateSetting("slaBuffer", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">Extra time buffer for SLA calculations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Service Levels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Platinum Customers</h4>
                <Badge className="bg-purple-100 text-purple-800">Premium</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">VIP customers with enhanced SLA</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Response Boost</Label>
                  <p className="font-medium">50% faster</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Priority Queue</Label>
                  <p className="font-medium">Always first</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Dedicated Support</Label>
                  <p className="font-medium">Named agents</p>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Gold Customers</h4>
                <Badge className="bg-yellow-100 text-yellow-800">Enhanced</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">Priority customers with improved SLA</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Response Boost</Label>
                  <p className="font-medium">25% faster</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Priority Queue</Label>
                  <p className="font-medium">High priority</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Extended Hours</Label>
                  <p className="font-medium">24/7 critical</p>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Standard Customers</h4>
                <Badge variant="outline">Standard</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">Regular customers with standard SLA</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Response Time</Label>
                  <p className="font-medium">Standard SLA</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Support Hours</Label>
                  <p className="font-medium">Business hours</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Channels</Label>
                  <p className="font-medium">Email, Portal</p>
                </div>
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
            Agent Deployment & Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Auto-assignment</h4>
                <p className="text-sm text-muted-foreground">Automatically assign tickets to available agents</p>
              </div>
              <Switch 
                checked={settings.autoAssignment !== false}
                onCheckedChange={(checked) => updateSetting('autoAssignment', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Load Balancing</h4>
                <p className="text-sm text-muted-foreground">Distribute tickets evenly among agents</p>
              </div>
              <Switch 
                checked={settings.loadBalancing || false}
                onCheckedChange={(checked) => updateSetting('loadBalancing', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Agent Health Monitoring</h4>
                <p className="text-sm text-muted-foreground">Monitor agent system performance and connectivity</p>
              </div>
              <Switch 
                checked={settings.agentMonitoring !== false}
                onCheckedChange={(checked) => updateSetting('agentMonitoring', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Auto-Update Agents</h4>
                <p className="text-sm text-muted-foreground">Automatically update agents to latest version</p>
              </div>
              <Switch 
                checked={settings.autoUpdate || false}
                onCheckedChange={(checked) => updateSetting('autoUpdate', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Agent Authentication</h4>
                <p className="text-sm text-muted-foreground">Require API key authentication for agents</p>
              </div>
              <Switch 
                checked={settings.agentAuth !== false}
                onCheckedChange={(checked) => updateSetting('agentAuth', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Agent Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="collection-interval">Data Collection Interval</Label>
              <Select 
                value={settings.agentCollectionInterval || "300"}
                onValueChange={(value) => updateSetting('agentCollectionInterval', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="120">2 minutes</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="600">10 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-port">Default Agent Port</Label>
              <Input 
                id="agent-port"
                type="number"
                min="1024"
                max="65535"
                value={settings.agentPort || 8080}
                onChange={(e) => updateSetting('agentPort', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heartbeat-interval">Heartbeat Interval (seconds)</Label>
              <Input 
                id="heartbeat-interval"
                type="number"
                min="10"
                max="300"
                value={settings.heartbeatInterval || 60}
                onChange={(e) => updateSetting('heartbeatInterval', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="connection-timeout">Connection Timeout (seconds)</Label>
              <Input 
                id="connection-timeout"
                type="number"
                min="5"
                max="120"
                value={settings.connectionTimeout || 30}
                onChange={(e) => updateSetting('connectionTimeout', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-retries">Max Connection Retries</Label>
              <Input 
                id="max-retries"
                type="number"
                min="1"
                max="10"
                value={settings.maxRetries || 3}
                onChange={(e) => updateSetting('maxRetries', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-level">Agent Log Level</Label>
              <Select 
                value={settings.agentLogLevel || "info"}
                onValueChange={(value) => updateSetting('agentLogLevel', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Master API Key</Label>
              <div className="flex gap-2">
                <Input 
                  id="api-key"
                  type="password"
                  value={settings.masterApiKey || ""}
                  onChange={(e) => updateSetting('masterApiKey', e.target.value)}
                  placeholder="Enter master API key for agents"
                />
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const newKey = crypto.randomUUID().replace(/-/g, '');
                    updateSetting('masterApiKey', newKey);
                  }}
                >
                  Generate
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="encryption-key">Agent Communication Encryption</Label>
              <div className="flex gap-2">
                <Input 
                  id="encryption-key"
                  type="password"
                  value={settings.encryptionKey || ""}
                  onChange={(e) => updateSetting('encryptionKey', e.target.value)}
                  placeholder="Encryption key for agent communications"
                />
                <Button 
                  variant="outline"
                  onClick={() => {
                    const newKey = btoa(crypto.randomUUID() + crypto.randomUUID()).substring(0, 32);
                    updateSetting('encryptionKey', newKey);
                  }}
                >
                  Generate
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SSL/TLS Required</Label>
                <p className="text-sm text-muted-foreground">
                  Require encrypted connections for all agent communications
                </p>
              </div>
              <Switch 
                checked={settings.sslRequired !== false}
                onCheckedChange={(checked) => updateSetting('sslRequired', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Certificate Validation</Label>
                <p className="text-sm text-muted-foreground">
                  Validate agent certificates against trusted CA
                </p>
              </div>
              <Switch 
                checked={settings.certValidation || false}
                onCheckedChange={(checked) => updateSetting('certValidation', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Agent Alerting & Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="offline-threshold">Offline Alert Threshold (minutes)</Label>
              <Input 
                id="offline-threshold"
                type="number"
                min="1"
                max="60"
                value={settings.offlineThreshold || 5}
                onChange={(e) => updateSetting('offlineThreshold', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="response-threshold">Response Time Threshold (ms)</Label>
              <Input 
                id="response-threshold"
                type="number"
                min="100"
                max="10000"
                value={settings.responseThreshold || 5000}
                onChange={(e) => updateSetting('responseThreshold', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="error-threshold">Error Rate Threshold (%)</Label>
              <Input 
                id="error-threshold"
                type="number"
                min="1"
                max="100"
                value={settings.errorThreshold || 5}
                onChange={(e) => updateSetting('errorThreshold', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disk-usage-threshold">Disk Usage Threshold (%)</Label>
              <Input 
                id="disk-usage-threshold"
                type="number"
                min="50"
                max="95"
                value={settings.diskUsageThreshold || 85}
                onChange={(e) => updateSetting('diskUsageThreshold', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Agent Performance Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when agent performance degrades
                </p>
              </div>
              <Switch 
                checked={settings.performanceAlerts !== false}
                onCheckedChange={(checked) => updateSetting('performanceAlerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Agent Connectivity Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when agents go offline or become unreachable
                </p>
              </div>
              <Switch 
                checked={settings.connectivityAlerts !== false}
                onCheckedChange={(checked) => updateSetting('connectivityAlerts', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Agent Deployment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2">
              <Server className="h-6 w-6" />
              <span>Download Windows Agent</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2">
              <Server className="h-6 w-6" />
              <span>Download Linux Agent</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2">
              <Server className="h-6 w-6" />
              <span>Download macOS Agent</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2">
              <Server className="h-6 w-6" />
              <span>PowerShell Script</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2">
              <Server className="h-6 w-6" />
              <span>Docker Container</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2">
              <Server className="h-6 w-6" />
              <span>Kubernetes Manifest</span>
            </Button>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Quick Deploy Command</h4>
            <div className="bg-black text-green-400 p-3 rounded font-mono text-sm">
              curl -sSL https://your-itsm-portal.com/agent/install.sh | bash -s -- --token={settings.masterApiKey || 'YOUR_API_KEY'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              One-line installation command for Linux/macOS agents
            </p>
          </div>

          <div className="space-y-2">
            <Label>Deployment Statistics</Label>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 border rounded">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-xs text-muted-foreground">Online Agents</div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-2xl font-bold text-red-600">0</div>
                <div className="text-xs text-muted-foreground">Offline Agents</div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-xs text-muted-foreground">Total Deployments</div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-2xl font-bold text-orange-600">0</div>
                <div className="text-xs text-muted-foreground">Pending Updates</div>
              </div>
            </div>
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
            <h1 className="text-2xl font-semibold text-[#201F1E] dark:text-[#F3F2F1] mb-2">Admin Panel</h1>
            <p className="text-neutral-600">System configuration and preferences</p>
          </div>
          {renderContent()}

          {/* Save Button - Always show */}
          <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button
              onClick={saveSettings}
              className="flex items-center space-x-2"
              variant={hasChanges ? "default" : "outline"}
            >
              <Save className="w-4 h-4" />
              <span>{hasChanges ? "Save Changes" : "Settings Saved"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}