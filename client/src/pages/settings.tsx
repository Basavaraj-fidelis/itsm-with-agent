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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Upload,
  Shield,
  Bell,
  Database,
  Users,
  Key,
  Globe,
  Palette,
  Monitor,
  Save,
  Mail,
  Clock,
  Plus,
  Settings as SettingsIcon,
  Copy,
  CheckCircle,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Settings() {
  const { toast } = useToast();
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

  const handleSaveChanges = () => {
    // Save settings to localStorage or API
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
      title: "Settings Saved",
      description: "Your settings have been saved successfully.",
    });
  };

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
    passwordPolicy: "strong",
  });

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

  const [activeTab, setActiveTab] = useState("general");
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

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
    setSettings((prev) => ({ ...prev, [key]: value }));
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
4. python install_windows.py start`
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
\`\`\``
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
\`\`\``
      }
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
      description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} agent files downloaded successfully.`,
    });
  };

  const copyToClipboard = (text: string, stepNumber: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStep(stepNumber);
      setTimeout(() => setCopiedStep(null), 2000);
    });
  };
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
          System Settings
        </h1>
        <p className="text-neutral-600">
          Configure system preferences and monitoring settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="sla">SLA Policies</TabsTrigger>
          <TabsTrigger value="agent">Agent</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="w-5 h-5 mr-2" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={settings.orgName}
                    onChange={(e) => updateSetting("orgName", e.target.value)}
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
                      <SelectItem value="ist">Indian Standard Time (IST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-neutral-600">
                      Enable dark theme for the interface
                    </p>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-refresh Dashboard</Label>
                    <p className="text-sm text-neutral-600">
                      Automatically refresh data every 30 seconds
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Monitor className="w-5 h-5 mr-2" />
                Monitoring Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <p className="text-sm text-neutral-600">
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
                    <p className="text-sm text-neutral-600">
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
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notification Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Configuration */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium">Email Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="notification-email"
                      className="flex items-center space-x-2"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Primary Notification Email</span>
                    </Label>
                    <Input
                      id="notification-email"
                      type="email"
                      placeholder="admin@company.com"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-sm text-neutral-600 mt-1">
                      Primary email address for receiving system notifications
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="cc-emails">CC Email Addresses</Label>
                    <Textarea
                      id="cc-emails"
                      placeholder="user1@company.com, user2@company.com"
                      className="mt-2 h-20"
                    />
                    <p className="text-sm text-neutral-600 mt-1">
                      Additional email addresses (comma-separated)
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notification Methods */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium">Notification Methods</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-neutral-600">
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
                      <p className="text-sm text-neutral-600">
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
                      <p className="text-sm text-neutral-600">
                        Receive critical alerts via SMS
                      </p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Slack Integration</Label>
                      <p className="text-sm text-neutral-600">
                        Send notifications to Slack channels
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notification Types */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium">Notification Types</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-neutral-700">System Alerts</h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Critical System Alerts</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Performance Warnings</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Security Alerts</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Disk Space Warnings</Label>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-neutral-700">Agent & System</h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Agent Status Changes</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">New Agent Registrations</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Agent Connection Lost</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">System Health Reports</Label>
                        <Switch />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-neutral-700">Tickets & SLA</h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">New Ticket Created</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Ticket Assignments</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">SLA Breach Warnings</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Escalated Tickets</Label>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-neutral-700">Reports & Summaries</h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Daily Summary Reports</Label>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Weekly Performance Reports</Label>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Monthly SLA Reports</Label>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Maintenance Notifications</Label>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notification Timing */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium">Notification Timing</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="quiet-hours-start">Quiet Hours Start</Label>
                    <Input
                      id="quiet-hours-start"
                      type="time"
                      defaultValue="22:00"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quiet-hours-end">Quiet Hours End</Label>
                    <Input
                      id="quiet-hours-end"
                      type="time"
                      defaultValue="08:00"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone-notifications">Timezone</Label>
                    <Select defaultValue="utc">
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="est">Eastern Time</SelectItem>
                        <SelectItem value="pst">Pacific Time</SelectItem>
                        <SelectItem value="cet">Central European Time</SelectItem>
                        <SelectItem value="ist">Indian Standard Time (IST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch />
                  <Label>Respect quiet hours for non-critical notifications</Label>
                </div>
              </div>

              <Separator />

              {/* SMTP Configuration */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium">SMTP Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp-host">SMTP Host</Label>
                    <Input
                      id="smtp-host"
                      placeholder="smtp.gmail.com"
                      value={smtpSettings.host}
                      onChange={(e) =>
                        setSmtpSettings({
                          ...smtpSettings,
                          host: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtp-port">Port</Label>
                    <Input
                      id="smtp-port"
                      placeholder="587"
                      value={smtpSettings.port}
                      onChange={(e) =>
                        setSmtpSettings({
                          ...smtpSettings,
                          port: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtp-username">Username</Label>
                    <Input
                      id="smtp-username"
                      placeholder="your-email@gmail.com"
                      value={smtpSettings.username}
                      onChange={(e) =>
                        setSmtpSettings({
                          ...smtpSettings,
                          username: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtp-password">Password/App Password</Label>
                    <Input
                      id="smtp-password"
                      type="password"
                      placeholder="••••••••"
                      value={smtpSettings.password}
                      onChange={(e) =>
                        setSmtpSettings({
                          ...smtpSettings,
                          password: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={smtpSettings.secure}
                    onCheckedChange={(checked) =>
                      setSmtpSettings({ ...smtpSettings, secure: checked })
                    }
                  />
                  <Label>Use SSL/TLS</Label>
                </div>
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Test SMTP Connection
                </Button>
              </div>

              <Separator />

              {/* Integration Settings */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium">Third-Party Integrations</h4>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h5 className="font-medium">Slack Integration</h5>
                        <p className="text-sm text-neutral-600">
                          Send notifications to Slack channels
                        </p>
                      </div>
                      <Switch />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input placeholder="Webhook URL" />
                      <Input placeholder="Default Channel" />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h5 className="font-medium">Microsoft Teams</h5>
                        <p className="text-sm text-neutral-600">
                          Send notifications to Teams channels
                        </p>
                      </div>
                      <Switch />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input placeholder="Webhook URL" />
                      <Input placeholder="Team Name" />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h5 className="font-medium">SMS/Twilio</h5>
                        <p className="text-sm text-neutral-600">
                          Send critical alerts via SMS
                        </p>
                      </div>
                      <Switch />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input placeholder="Account SID" />
                      <Input placeholder="Auth Token" type="password" />
                      <Input placeholder="From Number" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-neutral-600">
                      Enable 2FA for enhanced security
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
                  <div>
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-neutral-600">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="session-duration">
                    Session Duration (hours)
                  </Label>
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
                  <Label htmlFor="password-policy">Password Policy</Label>
                  <Select
                    value={settings.passwordPolicy}
                    onValueChange={(value) =>
                      updateSetting("passwordPolicy", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">
                        Basic (8+ characters)
                      </SelectItem>
                      <SelectItem value="medium">
                        Medium (8+ chars, mixed case)
                      </SelectItem>
                      <SelectItem value="strong">
                        Strong (12+ chars, mixed case, numbers, symbols)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>SLA Policies</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-neutral-600">
                  Configure Service Level Agreement policies for different
                  ticket types
                </p>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add SLA Policy
                </Button>
              </div>

              <div className="space-y-4">
                {/* Default SLA Policies */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">Critical Incidents</h4>
                      <p className="text-sm text-neutral-600">
                        For critical priority incidents
                      </p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-600">Response Time:</span>
                      <span className="ml-2 font-medium">15 minutes</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">Resolution Time:</span>
                      <span className="ml-2 font-medium">4 hours</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">Business Hours:</span>
                      <span className="ml-2 font-medium">24/7</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">Applies to:</span>
                      <span className="ml-2 font-medium">
                        Type: Incident, Priority: Critical
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">High Priority Issues</h4>
                      <p className="text-sm text-neutral-600">
                        For high priority incidents and problems
                      </p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-600">Response Time:</span>
                      <span className="ml-2 font-medium">1 hour</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">Resolution Time:</span>
                      <span className="ml-2 font-medium">8 hours</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">Business Hours:</span>
                      <span className="ml-2 font-medium">9 AM - 5 PM</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">Applies to:</span>
                      <span className="ml-2 font-medium">Priority: High</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">Standard Requests</h4>
                      <p className="text-sm text-neutral-600">
                        For service requests and medium priority issues
                      </p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-600">Response Time:</span>
                      <span className="ml-2 font-medium">4 hours</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">Resolution Time:</span>
                      <span className="ml-2 font-medium">3 business days</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">Business Hours:</span>
                      <span className="ml-2 font-medium">9 AM - 5 PM</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">Applies to:</span>
                      <span className="ml-2 font-medium">
                        Type: Request, Priority: Medium/Low
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agent" className="space-y-6">
          {/* Agent Download Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Monitor className="w-5 h-5 mr-2" />
                Agent Download & Deployment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Monitor className="w-6 h-6 text-blue-600 mr-2" />
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">
                      Windows Agent
                    </h4>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                    For Windows 10/11 and Windows Server
                  </p>
                  <Button
                    onClick={() => handleDownloadAgent("windows")}
                    className="w-full flex items-center justify-center space-x-2"
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Windows Agent</span>
                  </Button>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Monitor className="w-6 h-6 text-green-600 mr-2" />
                    <h4 className="font-medium text-green-900 dark:text-green-100">
                      Linux Agent
                    </h4>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                    For Ubuntu, CentOS, RHEL, Debian
                  </p>
                  <Button
                    onClick={() => handleDownloadAgent("linux")}
                    className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Linux Agent</span>
                  </Button>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Monitor className="w-6 h-6 text-neutral-600 mr-2" />
                    <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                      macOS Agent
                    </h4>
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">
                    For macOS 10.15+ and Apple Silicon
                  </p>
                  <Button
                    onClick={() => handleDownloadAgent("macos")}
                    className="w-full flex items-center justify-center space-x-2 bg-neutral-600 hover:bg-neutral-700"
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download macOS Agent</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Installation Instructions */}
          <Tabs defaultValue="windows" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="windows">Windows</TabsTrigger>
              <TabsTrigger value="linux">Linux</TabsTrigger>
              <TabsTrigger value="macos">macOS</TabsTrigger>
            </TabsList>

            {/* Windows Installation */}
            <TabsContent value="windows" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Monitor className="w-5 h-5" />
                    <span>Windows Installation Guide</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">Step 1: Install Python Dependencies</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard("pip install psutil requests configparser pywin32", 1)
                          }
                        >
                          {copiedStep === 1 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-neutral-600 mb-2">
                        Open Command Prompt as Administrator and run:
                      </p>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                        pip install psutil requests configparser pywin32
                      </code>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h5 className="font-medium mb-2">Step 2: Configure Agent</h5>
                      <p className="text-sm text-neutral-600 mb-2">
                        Edit config.ini with your settings:
                      </p>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm whitespace-pre">
{`[agent]
collection_interval = 120
log_level = INFO

[api]
base_url = ${window.location.origin}
auth_token = your-api-token

[security]
verify_ssl = true`}
                      </code>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">Step 3: Install Windows Service</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("python install_windows.py", 3)}
                        >
                          {copiedStep === 3 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                        python install_windows.py
                      </code>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">Step 4: Verify Installation</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("sc query \"ITSM Endpoint Agent\"", 4)}
                        >
                          {copiedStep === 4 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                        sc query "ITSM Endpoint Agent"
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Linux Installation */}
            <TabsContent value="linux" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Monitor className="w-5 h-5" />
                    <span>Linux Installation Guide</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">Step 1: Install Dependencies</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard("sudo apt update && sudo apt install python3 python3-pip", 11)
                          }
                        >
                          {copiedStep === 11 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-neutral-600 mb-2">For Ubuntu/Debian:</p>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                        sudo apt update && sudo apt install python3 python3-pip
                      </code>
                      <p className="text-sm text-neutral-600 mt-2 mb-2">For CentOS/RHEL:</p>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                        sudo yum install python3 python3-pip
                      </code>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">Step 2: Install Python Packages</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("pip3 install psutil requests configparser", 12)}
                        >
                          {copiedStep === 12 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                        pip3 install psutil requests configparser
                      </code>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h5 className="font-medium mb-2">Step 3: Configure Agent</h5>
                      <p className="text-sm text-neutral-600 mb-2">
                        Edit /opt/itsm-agent/config.ini:
                      </p>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm whitespace-pre">
{`[agent]
collection_interval = 120
log_level = INFO

[api]
base_url = ${window.location.origin}
auth_token = your-api-token`}
                      </code>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">Step 4: Install Systemd Service</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("sudo ./install_linux.sh", 13)}
                        >
                          {copiedStep === 13 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                        sudo ./install_linux.sh
                      </code>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">Step 5: Start and Enable Service</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard("sudo systemctl enable itsm-agent && sudo systemctl start itsm-agent", 14)
                          }
                        >
                          {copiedStep === 14 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                        sudo systemctl enable itsm-agent && sudo systemctl start itsm-agent
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* macOS Installation */}
            <TabsContent value="macos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Monitor className="w-5 h-5" />
                    <span>macOS Installation Guide</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">Step 1: Install Homebrew (if needed)</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"', 21)
                          }
                        >
                          {copiedStep === 21 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                      </code>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">Step 2: Install Python</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("brew install python", 22)}
                        >
                          {copiedStep === 22 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                        brew install python
                      </code>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">Step 3: Install Dependencies</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("pip3 install psutil requests configparser", 23)}
                        >
                          {copiedStep === 23 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                        pip3 install psutil requests configparser
                      </code>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h5 className="font-medium mb-2">Step 4: Configure Agent</h5>
                      <p className="text-sm text-neutral-600 mb-2">
                        Edit ~/itsm-agent/config.ini:
                      </p>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm whitespace-pre">
{`[agent]
collection_interval = 120
log_level = INFO

[api]
base_url = ${window.location.origin}
auth_token = your-api-token`}
                      </code>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">Step 5: Install Launch Daemon</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("sudo ./install_macos.sh", 24)}
                        >
                          {copiedStep === 24 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                        sudo ./install_macos.sh
                      </code>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">Step 6: Load and Start Service</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard("sudo launchctl load /Library/LaunchDaemons/com.itsm.agent.plist", 25)
                          }
                        >
                          {copiedStep === 25 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                        sudo launchctl load /Library/LaunchDaemons/com.itsm.agent.plist
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Agent Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="w-5 h-5" />
                <span>Agent Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Collection Settings</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="collection-interval">Collection Interval (seconds)</Label>
                      <Select defaultValue="120">
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">60 seconds (1 minute)</SelectItem>
                          <SelectItem value="120">120 seconds (2 minutes)</SelectItem>
                          <SelectItem value="300">300 seconds (5 minutes)</SelectItem>
                          <SelectItem value="600">600 seconds (10 minutes)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="retry-attempts">Retry Attempts</Label>
                      <Input
                        id="retry-attempts"
                        type="number"
                        defaultValue="3"
                        min="1"
                        max="10"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timeout">Request Timeout (seconds)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        defaultValue="30"
                        min="5"
                        max="120"
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Security Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Verify SSL Certificates</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Enable Agent Authentication</Label>
                      <Switch defaultChecked />
                    </div>
                    <div>
                      <Label htmlFor="api-token">API Authentication Token</Label>
                      <Input
                        id="api-token"
                        type="password"
                        placeholder="Enter API token"
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-lg font-medium">Monitoring Modules</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>System Performance</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Network Interfaces</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Disk Usage</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Process Monitoring</Label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Installed Software</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>System Health</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Security Status</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>USB Devices</Label>
                      <Switch />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Troubleshooting & Support</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
                  <h5 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                    Common Issues
                  </h5>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>• Python not found in PATH</li>
                    <li>• Permission denied errors</li>
                    <li>• Network connectivity issues</li>
                    <li>• Service installation failures</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                  <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Log Locations
                  </h5>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Windows: C:\ProgramData\ITSM\logs</li>
                    <li>• Linux: /var/log/itsm-agent</li>
                    <li>• macOS: /var/log/itsm-agent</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                  <h5 className="font-medium text-green-900 dark:text-green-100 mb-2">
                    Support Commands
                  </h5>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>• Test connection manually</li>
                    <li>• Check service status</li>
                    <li>• View recent logs</li>
                    <li>• Restart agent service</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Test Agent Connection
                </Button>
                <Button variant="outline" size="sm">
                  <Monitor className="w-4 h-4 mr-2" />
                  View Agent Logs
                </Button>
                <Button variant="outline" size="sm">
                  <Key className="w-4 h-4 mr-2" />
                  Generate New API Token
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveChanges}
          className="flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </Button>
      </div>
    </div>
  );
}
