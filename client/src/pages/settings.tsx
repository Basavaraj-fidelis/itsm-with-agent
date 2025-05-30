import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Database, Bell, Shield, Monitor, Download, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [settings, setSettings] = useState({
    orgName: "ITSM Portal",
    timezone: "utc",
    darkMode: false,
    autoRefresh: true,
    cpuThreshold: 90,
    memoryThreshold: 85,
    diskThreshold: 80,
    collectionInterval: "300",
    performanceMonitoring: true,
    networkMonitoring: true,
    emailNotifications: true,
    criticalAlerts: true,
    weeklyReports: false,
    adminEmail: "admin@company.com",
    twoFactor: false,
    sessionTimeout: true,
    sessionDuration: "8",
    passwordPolicy: "strong",
  });

  const [activeTab, setActiveTab] = useState("general");
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['general', 'monitoring', 'notifications', 'security', 'agent'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const handleSaveSettings = () => {
    // In a real app, this would save to the backend
    localStorage.setItem('itsm-settings', JSON.stringify(settings));
    toast({
      title: "Settings saved",
      description: "Your settings have been saved successfully!",
    });
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleDownloadAgent = () => {
    // Create a downloadable zip file with agent files
    const agentFiles = {
      'config.ini': `[agent]
# Collection interval in seconds (600 = 10 minutes)
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
verify_ssl = false`,

      'README.md': `# ITSM Agent Installation Guide

## Prerequisites
- Python 3.6 or higher
- Administrator privileges (for Windows service installation)

## Installation Steps

### 1. Download and Extract
Download the agent files and extract to a folder (e.g., C:\\ITSM-Agent)

### 2. Install Dependencies
\`\`\`bash
pip install psutil requests configparser pywin32
\`\`\`

### 3. Configure Agent
Edit config.ini to set your API endpoint and authentication token

### 4. Install as Windows Service
Run as Administrator:
\`\`\`bash
python install_windows.py
\`\`\`

### 5. Fix Common Issues (if needed)
If the service fails to start:
\`\`\`bash
python fix_windows_service.py
\`\`\`

## Verification
Check Windows Services for "ITSM Endpoint Agent" and verify it's running.
The agent should appear in your ITSM dashboard within a few minutes.
`
    };

    // Create and download a text file with instructions since we can't create actual zip files in browser
    const content = Object.entries(agentFiles).map(([filename, content]) => 
      `=== ${filename} ===\n${content}\n\n`
    ).join('');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'itsm-agent-files.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        <p className="text-neutral-600">Configure system preferences and monitoring settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
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
                    onChange={(e) => updateSetting('orgName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={settings.timezone} onValueChange={(value) => updateSetting('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time</SelectItem>
                      <SelectItem value="pst">Pacific Time</SelectItem>
                      <SelectItem value="cet">Central European Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-neutral-600">Enable dark theme for the interface</p>
                  </div>
                  <Switch 
                    checked={settings.darkMode}
                    onCheckedChange={(checked) => updateSetting('darkMode', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-refresh Dashboard</Label>
                    <p className="text-sm text-neutral-600">Automatically refresh data every 30 seconds</p>
                  </div>
                  <Switch 
                    checked={settings.autoRefresh}
                    onCheckedChange={(checked) => updateSetting('autoRefresh', checked)}
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
                  <Input id="cpu-threshold" type="number" defaultValue="90" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memory-threshold">Memory Alert Threshold (%)</Label>
                  <Input id="memory-threshold" type="number" defaultValue="85" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disk-threshold">Disk Alert Threshold (%)</Label>
                  <Input id="disk-threshold" type="number" defaultValue="80" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="collection-interval">Data Collection Interval (seconds)</Label>
                <Select defaultValue="300">
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
                    <p className="text-sm text-neutral-600">Monitor CPU, memory, and disk usage</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Network Monitoring</Label>
                    <p className="text-sm text-neutral-600">Monitor network traffic and connectivity</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-neutral-600">Receive alerts via email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Critical Alert Notifications</Label>
                    <p className="text-sm text-neutral-600">Immediate notifications for critical issues</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Weekly Summary Reports</Label>
                    <p className="text-sm text-neutral-600">Receive weekly performance summaries</p>
                  </div>
                  <Switch />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="admin-email">Administrator Email</Label>
                <Input id="admin-email" type="email" defaultValue="admin@company.com" />
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
                    <p className="text-sm text-neutral-600">Enable 2FA for enhanced security</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-neutral-600">Automatically log out inactive users</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="session-duration">Session Duration (hours)</Label>
                  <Select defaultValue="8">
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
                  <Select defaultValue="strong">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="strong">Strong</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Monitor className="w-5 h-5 mr-2" />
                Agent Download & Installation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Download ITSM Agent</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                  Download the agent files and follow the installation instructions below.
                </p>
                <Button onClick={handleDownloadAgent} className="flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download Agent Files</span>
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-medium">Installation Instructions</h4>
                
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">Step 1: Install Dependencies</h5>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('pip install psutil requests configparser pywin32', 1)}
                      >
                        {copiedStep === 1 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-sm text-neutral-600 mb-2">Open Command Prompt as Administrator and run:</p>
                    <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                      pip install psutil requests configparser pywin32
                    </code>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">Step 2: Configure Agent</h5>
                    </div>
                    <p className="text-sm text-neutral-600 mb-2">
                      Edit the config.ini file to set your API endpoint:
                    </p>
                    <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                      base_url = {window.location.origin}
                    </code>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">Step 3: Install as Windows Service</h5>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('python install_windows.py', 3)}
                      >
                        {copiedStep === 3 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-sm text-neutral-600 mb-2">Run as Administrator:</p>
                    <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                      python install_windows.py
                    </code>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">Step 4: Fix Issues (if needed)</h5>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('python fix_windows_service.py', 4)}
                      >
                        {copiedStep === 4 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-sm text-neutral-600 mb-2">If the service fails to start, run:</p>
                    <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-sm">
                      python fix_windows_service.py
                    </code>
                  </div>

                  <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <h5 className="font-medium text-green-900 dark:text-green-100 mb-2">Verification</h5>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <li>• Check Windows Services for "ITSM Endpoint Agent"</li>
                      <li>• Verify the service is running</li>
                      <li>• Agent should appear in your dashboard within 2-5 minutes</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h5 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Troubleshooting</h5>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>• Ensure you're running Command Prompt as Administrator</li>
                    <li>• Check Python is properly installed and in PATH</li>
                    <li>• Verify all dependencies are installed</li>
                    <li>• Check Windows Event Viewer for service errors</li>
                    <li>• Try running the agent manually first: <code>python itsm_agent.py</code></li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button size="lg" onClick={handleSaveSettings}>Save Settings</Button>
      </div>
    </div>
  );
}