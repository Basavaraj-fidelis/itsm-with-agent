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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import SettingsSidebar from "@/components/layout/settings-sidebar";
import {
  Settings as SettingsIcon,
  Shield,
  Bell,
  FileText,
  Clock,
  Users,
  Monitor,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import {
  Download,
  Upload,
  Database,
  Key,
  Globe,
  Palette,
  Mail,
  Copy,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import {
  Eye,
  AlertTriangle,
  Timer,
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
  const [activeTab, setActiveTab] = useState("general");
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

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

  useEffect(() => {
    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");
    if (
      tab &&
      [
        "general",
        "monitoring",
        "notifications",
        "security",
        "agent",
        "sla",
      ].includes(tab)
    ) {
      setActiveTab(tab);
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

      // In a real app, you would also save to backend
      // await api.saveSettings(settings);

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
  const getPasswordStrengthIndicator = () => {
    const {
      passwordPolicy,
      minPasswordLength,
      requireUppercase,
      requireLowercase,
      requireNumbers,
      requireSpecialChars,
    } = settings;

    let strength = 0;
    let requirements = [];

    if (minPasswordLength >= 8) strength++;
    if (requireUppercase) {
      strength++;
      requirements.push("uppercase");
    }
    if (requireLowercase) {
      strength++;
      requirements.push("lowercase");
    }
    if (requireNumbers) {
      strength++;
      requirements.push("numbers");
    }
    if (requireSpecialChars) {
      strength++;
      requirements.push("special characters");
    }

    if (strength >= 4)
      return { level: "Strong", color: "green", requirements };
    if (strength >= 2)
      return { level: "Medium", color: "orange", requirements };
    return { level: "Weak", color: "red", requirements };
  };

  const handleDownloadAgent = (platform = "windows") => {
    const baseConfig = `[agent]
# Collection interval in seconds
collection_interval = 120

# Logging configuration
log_level = INFO
log_max_size = 10485760
log_backup_count = 5

[api]
# ITSM API configuration
base_url = ${window.location.origin}
auth_token = dashboard-api-token

# Request configuration
timeout = 30
retry_attempts = 3
retry_delay = 5

[security]
# Security configuration
verify_ssl = true`;

    const agentFiles: Record<string, any> = {
      windows: {
        "config.ini": baseConfig,
        "install_windows.py": `#!/usr/bin/env python3
"""
Windows service installer for ITSM Agent
"""
import os
import sys
import win32serviceutil
import win32service
import win32event

class ITSMAgentService(win32serviceutil.ServiceFramework):
    _svc_name_ = "ITSMAgent"
    _svc_display_name_ = "ITSM Endpoint Agent"
    _svc_description_ = "Monitors system metrics and reports to ITSM platform"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.hWaitStop)

    def SvcDoRun(self):
        # Run the main agent
        os.system("python itsm_agent.py")

if __name__ == '__main__':
    win32serviceutil.HandleCommandLine(ITSMAgentService)`,
        "README.md": `# ITSM Agent - Windows Installation

## Prerequisites
- Windows 10/11 or Windows Server 2016+
- Python 3.8+ with pip
- Administrator privileges

## Quick Install
1. Extract all files to C:\\ITSM-Agent
2. Run install.bat as Administrator
3. Service will auto-start

## Manual Install
1. pip install psutil requests configparser pywin32
2. Edit config.ini with your settings
3. python install_windows.py install
4. python install_windows.py start`,
      },
      linux: {
        "config.ini": baseConfig,
        "install_linux.sh": `#!/bin/bash
# ITSM Agent Linux installer

set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Install Python dependencies
pip3 install psutil requests configparser

# Create service user
useradd -r -s /bin/false itsm-agent || true

# Create directories
mkdir -p /opt/itsm-agent
mkdir -p /var/log/itsm-agent
mkdir -p /etc/itsm-agent

# Copy files
cp itsm_agent.py /opt/itsm-agent/
cp config.ini /etc/itsm-agent/
chown -R itsm-agent:itsm-agent /opt/itsm-agent /var/log/itsm-agent

# Create systemd service
cat > /etc/systemd/system/itsm-agent.service << 'EOF'
[Unit]
Description=ITSM Endpoint Agent
After=network.target

[Service]
Type=simple
User=itsm-agent
WorkingDirectory=/opt/itsm-agent
ExecStart=/usr/bin/python3 /opt/itsm-agent/itsm_agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable itsm-agent
systemctl start itsm-agent

echo "ITSM Agent installed and started successfully!"`,
        "README.md": `# ITSM Agent - Linux Installation

## Prerequisites
- Linux (Ubuntu 18.04+, CentOS 7+, RHEL 7+)
- Python 3.6+ with pip
- sudo privileges

## Quick Install
\`\`\`bash
sudo ./install_linux.sh
\`\`\`

## Manual Install
\`\`\`bash
# Install dependencies
sudo apt install python3 python3-pip  # Ubuntu/Debian
sudo yum install python3 python3-pip  # CentOS/RHEL

# Install Python packages
pip3 install psutil requests configparser

# Configure and start
sudo systemctl enable itsm-agent
sudo systemctl start itsm-agent
\`\`\``,
      },
      macos: {
        "config.ini": baseConfig,
        "install_macos.sh": `#!/bin/bash
# ITSM Agent macOS installer

set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run with sudo"
    exit 1
fi

# Install Python dependencies
pip3 install psutil requests configparser

# Create directories
mkdir -p /usr/local/itsm-agent
mkdir -p /var/log/itsm-agent

# Copy files
cp itsm_agent.py /usr/local/itsm-agent/
cp config.ini /usr/local/itsm-agent/

# Create LaunchDaemon
cat > /Library/LaunchDaemons/com.itsm.agent.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.itsm.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/usr/local/itsm-agent/itsm_agent.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/usr/local/itsm-agent</string>
    <key>StandardOutPath</key>
    <string>/var/log/itsm-agent/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/itsm-agent/stderr.log</string>
</dict>
</plist>
EOF

# Load and start service
launchctl load /Library/LaunchDaemons/com.itsm.agent.plist

echo "ITSM Agent installed and started successfully!"`,
        "README.md": `# ITSM Agent - macOS Installation

## Prerequisites
- macOS 10.15+ (Catalina or later)
- Python 3.8+ (install via Homebrew recommended)
- Administrator privileges

## Quick Install
\`\`\`bash
sudo ./install_macos.sh
\`\`\`

## Install Python (if needed)
\`\`\`bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install python
\`\`\`

## Manual Install
\`\`\`bash
# Install dependencies
pip3 install psutil requests configparser

# Load service
sudo launchctl load /Library/LaunchDaemons/com.itsm.agent.plist
\`\`\``,
      },
    };

    const selectedFiles = agentFiles[platform];

    // Create and download a text file with platform-specific instructions
    const content = Object.entries(selectedFiles)
      .map(([filename, content]) => `=== ${filename} ===\n${content}\n\n`)
      .join("");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `itsm-agent-${platform}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Agent Downloaded",
      description: `${
        platform.charAt(0).toUpperCase() + platform.slice(1)
      } agent files downloaded successfully.`,
    });
  };

  const copyToClipboard = (text: string, stepNumber: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStep(stepNumber);
      setTimeout(() => setCopiedStep(null), 2000);
    });
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
            {/*<CardDescription>
              Configure system preferences and monitoring settings
            </CardDescription>*/}
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
              <Eye className="h-5 w-5" />
              Monitoring Settings
            </CardTitle>
           {/* <CardDescription>
              Configure system monitoring and alerting thresholds
            </CardDescription>*/}
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
            {/*<CardDescription>
              Configure how you receive notifications
            </CardDescription>*/}
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
            {/*<CardDescription>
              Configure security and authentication settings
            </CardDescription>*/}
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
            {/*<CardDescription>
              Configure Service Level Agreement policies and response times
            </CardDescription>*/}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Critical Issues</h4>
                  <p className="text-sm text-muted-foreground">Response time: 1 hour</p>
                </div>
                <Badge variant="destructive">Critical</Badge>
              </div>
  
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">High Priority</h4>
                  <p className="text-sm text-muted-foreground">Response time: 4 hours</p>
                </div>
                <Badge variant="secondary">High</Badge>
              </div>
  
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Medium Priority</h4>
                  <p className="text-sm text-muted-foreground">Response time: 24 hours</p>
                </div>
                <Badge variant="outline">Medium</Badge>
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
              <Users className="h-5 w-5" />
              Agent Management
            </CardTitle>
            {/*<CardDescription>
              Configure agent settings and permissions
            </CardDescription>*/}
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
        <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* General Settings */}
            {activeTab === "general" && (
              renderGeneralSettings()
            )}
  
            {/* Monitoring Settings */}
            {activeTab === "monitoring" && (
              renderMonitoringSettings()
            )}
  
            {/* Notifications Settings */}
            {activeTab === "notifications" && (
              renderNotificationSettings()
            )}
  
            {/* Security Settings */}
            {activeTab === "security" && (
              renderSecuritySettings()
            )}
  
            {/* SLA Settings */}
            {activeTab === "sla" && (
              renderSLAPolicies()
            )}
  
            {/* Agent Settings */}
            {activeTab === "agent" && (
             renderAgentSettings()
            )}
  
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