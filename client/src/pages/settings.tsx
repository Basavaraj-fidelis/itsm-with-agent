import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings as SettingsIcon, 
  Users, 
  Bell, 
  Shield, 
  Clock,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/components/auth/protected-route';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    // System
    systemName: 'ITSM Portal',
    autoRefresh: true,
    refreshInterval: '30',

    // Notifications
    emailNotifications: true,
    slackIntegration: false,

    // Security
    twoFactorAuth: false,
    sessionTimeout: '480', // 8 hours

    // SLA
    defaultResponseTime: '4',
    defaultResolutionTime: '24'
  });

  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error

  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-neutral-600">
              You need administrator privileges to access system settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaveStatus('idle');
  };

  const saveSettings = async () => {
    setSaveStatus('saving');
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveStatus('saved');
      toast({
        title: "Settings saved",
        description: "Your changes have been applied successfully.",
      });
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      toast({
        title: "Error saving settings",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin Panel</h1>
          <p className="text-neutral-600">Manage system configuration and preferences</p>
        </div>
        <div className="flex items-center space-x-3">
          {saveStatus !== 'idle' && (
            <Badge variant={saveStatus === 'saved' ? 'default' : saveStatus === 'error' ? 'destructive' : 'secondary'}>
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && <><Check className="w-3 h-3 mr-1" /> Saved</>}
              {saveStatus === 'error' && <><AlertTriangle className="w-3 h-3 mr-1" /> Error</>}
            </Badge>
          )}
          <Button onClick={saveSettings} disabled={saveStatus === 'saving'}>
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <SettingsIcon className="w-4 h-4" />
            <span>System</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Basic system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>System Name</Label>
                <Input
                  value={settings.systemName}
                  onChange={(e) => updateSetting('systemName', e.target.value)}
                  placeholder="ITSM Portal"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Refresh Dashboard</Label>
                  <p className="text-sm text-neutral-500">Automatically update data</p>
                </div>
                <Switch
                  checked={settings.autoRefresh}
                  onCheckedChange={(checked) => updateSetting('autoRefresh', checked)}
                />
              </div>

              {settings.autoRefresh && (
                <div className="space-y-2">
                  <Label>Refresh Interval</Label>
                  <Select value={settings.refreshInterval} onValueChange={(value) => updateSetting('refreshInterval', value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default SLA Times</CardTitle>
              <CardDescription>Set default response and resolution times</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Response Time (hours)</Label>
                  <Input
                    type="number"
                    value={settings.defaultResponseTime}
                    onChange={(e) => updateSetting('defaultResponseTime', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resolution Time (hours)</Label>
                  <Input
                    type="number"
                    value={settings.defaultResolutionTime}
                    onChange={(e) => updateSetting('defaultResolutionTime', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
                <h3 className="text-lg font-medium mb-2">User Management</h3>
                <p className="text-neutral-600 mb-4">
                  Manage users, roles, and permissions from the dedicated user management page.
                </p>
                <Button onClick={() => window.location.href = '/users'}>
                  Go to User Management
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how users receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-neutral-500">Send notifications via email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Slack Integration</Label>
                  <p className="text-sm text-neutral-500">Send alerts to Slack channels</p>
                </div>
                <Switch
                  checked={settings.slackIntegration}
                  onCheckedChange={(checked) => updateSetting('slackIntegration', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-neutral-500">Require 2FA for admin accounts</p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(checked) => updateSetting('twoFactorAuth', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Session Timeout (minutes)</Label>
                <Select value={settings.sessionTimeout} onValueChange={(value) => updateSetting('sessionTimeout', value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                    <SelectItem value="1440">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}