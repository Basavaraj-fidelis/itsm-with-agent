import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import SettingsSidebar from "@/components/layout/settings-sidebar";
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  RefreshCw,
  Users,
  Shield,
  Monitor,
  Bell,
  Palette,
  Globe,
  Database,
  Mail,
  Phone,
  Building,
  MapPin,
  Save,
  TestTube,
  Eye,
  EyeOff,
  Server,
  Zap,
  Key,
  Settings as SettingsIcon,
  Activity,
  Link,
  UserCheck,
  Users2,
  Info,
  Laptop,
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    return (
      localStorage.getItem("darkMode") === "true" ||
      document.documentElement.classList.contains("dark")
    );
  });
  const [settings, setSettings] = useState({
    // Basic Configuration
    orgName: "ITSM Portal",
    adminEmail: "admin@company.com",
    timezone: "utc",

    // Interface
    autoRefresh: true,

    // Monitoring Thresholds
    cpuThreshold: 90,
    memoryThreshold: 85,
    diskThreshold: 80,
    collectionInterval: "300",

    // Notifications
    emailNotifications: true,
    criticalAlerts: true,
    notificationEmail: "",

    // Security
    twoFactor: false,
    sessionTimeout: true,
    sessionDuration: "8",
    minPasswordLength: 8,

    // SLA
    businessHoursStart: "09:00",
    businessHoursEnd: "17:00",
    autoEscalation: true,

    // Agent Management
    autoAssignment: true,
    agentMonitoring: true,
    agentPort: 8080,
    heartbeatInterval: 60,
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
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error("Failed to load settings:", error);
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
      // Save settings to localStorage
      localStorage.setItem("itsm-settings", JSON.stringify(settings));
      localStorage.setItem("darkMode", darkMode.toString());

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
  const activeSection = location.split("/")[2] || "general";

  const renderGeneralSettings = () => (
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
                onChange={(e) => updateSetting("orgName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={settings.adminEmail}
                onChange={(e) => updateSetting("adminEmail", e.target.value)}
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
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
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
                    updateSetting("autoRefresh", checked)
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
                onValueChange={(value) => updateSetting("timezone", value)}
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

  const renderMonitoringSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            System Monitoring Thresholds
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
              <p className="text-xs text-muted-foreground">
                Alert when CPU usage exceeds this threshold
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memory-threshold">
                Memory Alert Threshold (%)
              </Label>
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
              <p className="text-xs text-muted-foreground">
                Alert when memory usage exceeds this threshold
              </p>
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
              <p className="text-xs text-muted-foreground">
                Alert when disk usage exceeds this threshold
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
              </SelectContent>
            </Select>
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
            Notification Preferences
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
                checked={settings.emailNotifications}
                onCheckedChange={(checked) =>
                  updateSetting("emailNotifications", checked)
                }
              />
            </div>

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
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-email">Notification Email</Label>
            <Input
              id="notification-email"
              type="email"
              value={settings.notificationEmail}
              onChange={(e) =>
                updateSetting("notificationEmail", e.target.value)
              }
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
            Security & Authentication
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
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-password-length">
                Minimum Password Length
              </Label>
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
            Business Hours & SLA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business-start">Business Hours Start</Label>
              <Input
                id="business-start"
                type="time"
                value={settings.businessHoursStart}
                onChange={(e) =>
                  updateSetting("businessHoursStart", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-end">Business Hours End</Label>
              <Input
                id="business-end"
                type="time"
                value={settings.businessHoursEnd}
                onChange={(e) =>
                  updateSetting("businessHoursEnd", e.target.value)
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Escalation</Label>
              <p className="text-sm text-muted-foreground">
                Automatically escalate tickets approaching SLA breach
              </p>
            </div>
            <Switch
              checked={settings.autoEscalation}
              onCheckedChange={(checked) =>
                updateSetting("autoEscalation", checked)
              }
            />
          </div>

          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/10">
            <h4 className="font-medium mb-2">SLA Response Times</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Badge variant="destructive" className="mb-1">
                  Critical
                </Badge>
                <p>Response: 15 minutes | Resolution: 4 hours</p>
              </div>
              <div>
                <Badge variant="secondary" className="mb-1">
                  High
                </Badge>
                <p>Response: 2 hours | Resolution: 24 hours</p>
              </div>
              <div>
                <Badge variant="outline" className="mb-1">
                  Medium
                </Badge>
                <p>Response: 8 hours | Resolution: 72 hours</p>
              </div>
              <div>
                <Badge variant="outline" className="mb-1">
                  Low
                </Badge>
                <p>Response: 24 hours | Resolution: 7 days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAgentSettings = () => (
    <div className="space-y-6">
      {/* Agent Download Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Agent Download
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download the ITSM agent for your target systems. The agent
              collects system information and enables remote management
              capabilities.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              {agentOptions.map((agent) => (
                <Card
                  key={agent.platform}
                  className="cursor-pointer hover:bg-accent transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <agent.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {agent.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-3"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAgent(agent.platform)}
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                    Installation Notes
                  </h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                    <li>
                      • Configure config.ini with your server details before
                      deployment
                    </li>
                    <li>• Ensure Python 3.7+ is installed on target systems</li>
                    <li>
                      • Administrator/root privileges required for installation
                    </li>
                    <li>• Check firewall settings for outbound connectivity</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Agent Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-assignment</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically assign tickets to available agents
                </p>
              </div>
              <Switch
                checked={settings.autoAssignment}
                onCheckedChange={(checked) =>
                  updateSetting("autoAssignment", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Agent Health Monitoring</Label>
                <p className="text-sm text-muted-foreground">
                  Monitor agent system performance and connectivity
                </p>
              </div>
              <Switch
                checked={settings.agentMonitoring}
                onCheckedChange={(checked) =>
                  updateSetting("agentMonitoring", checked)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent-port">Default Agent Port</Label>
              <Input
                id="agent-port"
                type="number"
                min="1024"
                max="65535"
                value={settings.agentPort}
                onChange={(e) =>
                  updateSetting("agentPort", parseInt(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heartbeat-interval">
                Heartbeat Interval (seconds)
              </Label>
              <Input
                id="heartbeat-interval"
                type="number"
                min="10"
                max="300"
                value={settings.heartbeatInterval}
                onChange={(e) =>
                  updateSetting("heartbeatInterval", parseInt(e.target.value))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Active Directory settings removed - no longer needed
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adBindDN">Bind DN (User)</Label>
              <Input
                id="adBindDN"
                placeholder="CN=Bind User,OU=Service Accounts,DC=your-domain,DC=com"
                value={settings.adBindDN}
                onChange={(e) => updateSetting("adBindDN", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adBindPassword">Bind Password</Label>
              <Input
                id="adBindPassword"
                type="password"
                value={settings.adBindPassword}
                onChange={(e) =>
                  updateSetting("adBindPassword", e.target.value)
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Active Directory</Label>
              <p className="text-sm text-muted-foreground">
                Enable synchronization with Active Directory
              </p>
            </div>
            <Switch
              checked={settings.adEnabled}
              onCheckedChange={(checked) => updateSetting("adEnabled", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return renderGeneralSettings();
      case "monitoring":
        return renderMonitoringSettings();
      case "notifications":
        return renderNotificationSettings();
      case "security":
        return renderSecuritySettings();
      case "sla":
        return <SLAManagementContent />;
      case "agent":
        return renderAgentSettings();
      // Active Directory settings removed
      default:
        return renderGeneralSettings();
    }
  };

  const SLAManagementContent = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Business Hours & SLA
          </CardTitle>
          <CardDescription>
            Configure service level agreement policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business-start">Business Hours Start</Label>
              <Input
                id="business-start"
                type="time"
                value={settings.businessHoursStart}
                onChange={(e) =>
                  updateSetting("businessHoursStart", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-end">Business Hours End</Label>
              <Input
                id="business-end"
                type="time"
                value={settings.businessHoursEnd}
                onChange={(e) =>
                  updateSetting("businessHoursEnd", e.target.value)
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Escalation</Label>
              <p className="text-sm text-muted-foreground">
                Automatically escalate tickets approaching SLA breach
              </p>
            </div>
            <Switch
              checked={settings.autoEscalation}
              onCheckedChange={(checked) =>
                updateSetting("autoEscalation", checked)
              }
            />
          </div>

          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/10">
            <h4 className="font-medium mb-2">SLA Response Times</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Badge variant="destructive" className="mb-1">
                  Critical
                </Badge>
                <p>Response: 15 minutes | Resolution: 4 hours</p>
              </div>
              <div>
                <Badge variant="secondary" className="mb-1">
                  High
                </Badge>
                <p>Response: 2 hours | Resolution: 24 hours</p>
              </div>
              <div>
                <Badge variant="outline" className="mb-1">
                  Medium
                </Badge>
                <p>Response: 8 hours | Resolution: 72 hours</p>
              </div>
              <div>
                <Badge variant="outline" className="mb-1">
                  Low
                </Badge>
                <p>Response: 24 hours | Resolution: 7 days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const downloadAgent = async (platform: string) => {
    try {
      // Direct download without authentication
      const response = await fetch(`/api/download/agent/${platform}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Download error response:", errorText);
        throw new Error(`Download failed: ${response.status} ${errorText}`);
      }

      // Get the blob and create download
      const blob = await response.blob();

      // Check if blob is empty
      if (blob.size === 0) {
        throw new Error("Downloaded file is empty");
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `itsm-agent-${platform}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `ITSM Agent for ${platform} is downloading...`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download the agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  const agentOptions = [
    {
      platform: "windows",
      name: "Windows Agent",
      description: "For Windows 10/11 and Server",
      icon: Monitor,
      filename: "itsm-agent-windows.zip",
    },
    {
      platform: "linux",
      name: "Linux Agent",
      description: "For Ubuntu, CentOS, RHEL",
      icon: Server,
      filename: "itsm-agent-linux.zip",
    },
    {
      platform: "macos",
      name: "macOS Agent",
      description: "For macOS 10.15+",
      icon: Laptop,
      filename: "itsm-agent-macos.zip",
    },
  ];

  const renderAdminSettings = () => (
    <div className="space-y-6">
      {/* Agent Download Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Agent Download & Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download ITSM agents for deployment across your organization.
              These agents collect system information and enable remote
              management capabilities.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              {agentOptions.map((agent) => (
                <Card
                  key={agent.platform}
                  className="cursor-pointer hover:bg-accent transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <agent.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {agent.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-3"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAgent(agent.platform)}
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                    InstallationNotes
                  </h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                    <li>
                      • Configure config.ini with your server details before
                      deployment
                    </li>
                    <li>• Ensure Python 3.7+ is installed on target systems</li>
                    <li>
                      • Administrator/root privileges required for installation
                    </li>
                    <li>• Check firewall settings for outbound connectivity</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Advanced administrative functions and system controls.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" className="justify-start h-auto p-4">
              <Database className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-medium">Database Management</div>
                <div className="text-sm text-muted-foreground">
                  Manage database connections and migrations
                </div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <Shield className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-medium">Security Settings</div>
                <div className="text-sm text-muted-foreground">
                  Configure security policies and access controls
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // const renderContent = () => {
  //   switch (activeSection) {
  //     case 'general':
  //       return renderGeneralSettings();
  //     case 'monitoring':
  //       return renderMonitoringSettings();
  //     case 'notifications':
  //       return renderNotificationSettings();
  //     case 'security':
  //       return renderSecuritySettings();
  //     case 'sla':
  //       return renderSLAPolicies();
  //     case 'agent':
  //       return renderAgentSettings();
  //     case 'active-directory':
  //       return renderActiveDirectorySettings();
  //     case 'admin':
  //       return renderAdminSettings();
  //     default:
  //       return renderGeneralSettings();
  //   }
  // };

  // const SLAManagementContent = () => (
  //   <div className="space-y-6">
  //     <Card>
  //       <CardHeader>
  //         <CardTitle className="flex items-center gap-2">
  //           <Clock className="h-5 w-5" />
  //           Business Hours & SLA
  //         </CardTitle>
  //         <CardDescription>
  //           Configure service level agreement policies
  //         </CardDescription>
  //       </CardHeader>
  //       <CardContent className="space-y-4">
  //         <div className="grid grid-cols-2 gap-4">
  //           <div className="space-y-2">
  //             <Label htmlFor="business-start">Business Hours Start</Label>
  //             <Input
  //               id="business-start"
  //               type="time"
  //               value={settings.businessHoursStart}
  //               onChange={(e) =>
  //                 updateSetting("businessHoursStart", e.target.value)
  //               }
  //             />
  //           </div>
  //           <div className="space-y-2">
  //             <Label htmlFor="business-end">Business Hours End</Label>
  //             <Input
  //               id="business-end"
  //               type="time"
  //               value={settings.businessHoursEnd}
  //               onChange={(e) =>
  //                 updateSetting("businessHoursEnd", e.target.value)
  //               }
  //             />
  //           </div>
  //         </div>

  //         <div className="flex items-center justify-between">
  //           <div className="space-y-0.5">
  //             <Label>Auto-Escalation</Label>
  //             <p className="text-sm text-muted-foreground">
  //               Automatically escalate tickets approaching SLA breach
  //             </p>
  //           </div>
  //           <Switch
  //             checked={settings.autoEscalation}
  //             onCheckedChange={(checked) =>
  //               updateSetting("autoEscalation", checked)
  //             }
  //           />
  //         </div>

  //         <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/10">
  //           <h4 className="font-medium mb-2">SLA Response Times</h4>
  //           <div className="grid grid-cols-2 gap-4 text-sm">
  //             <div>
  //               <Badge variant="destructive" className="mb-1">
  //                 Critical
  //               </Badge>
  //               <p>Response: 15 minutes | Resolution: 4 hours</p>
  //             </div>
  //             <div>
  //               <Badge variant="secondary" className="mb-1">
  //                 High
  //               </Badge>
  //               <p>Response: 2 hours | Resolution: 24 hours</p>
  //             </div>
  //             <div>
  //               <Badge variant="outline" className="mb-1">
  //                 Medium
  //               </Badge>
  //               <p>Response: 8 hours | Resolution: 72 hours</p>
  //             </div>
  //             <div>
  //               <Badge variant="outline" className="mb-1">
  //                 Low
  //               </Badge>
  //               <p>Response: 24 hours | Resolution: 7 days</p>
  //             </div>
  //           </div>
  //         </div>
  //       </CardContent>
  //     </Card>
  //   </div>
  // );

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900">
      <SettingsSidebar activeTab={activeSection} onTabChange={() => {}} />
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-[#201F1E] dark:text-[#F3F2F1] mb-2">
              Settings
            </h1>
            <p className="text-neutral-600">
              System configuration and agent management
            </p>
          </div>
          {renderContent()}

          {/* Save Button */}
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
