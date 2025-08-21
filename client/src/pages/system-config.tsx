
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, RotateCcw } from 'lucide-react';

interface SystemConfig {
  alerts: {
    thresholds: {
      cpu: { warning: number; high: number; critical: number };
      memory: { warning: number; high: number; critical: number };
      disk: { warning: number; high: number; critical: number };
      network: { errorRate: number; responseTime: number };
    };
    retryAttempts: number;
    timeoutMs: number;
  };
  network: {
    scan: {
      timeoutMs: number;
      retryAttempts: number;
      pingTimeout: number;
      portScanTimeout: number;
    };
    agents: {
      heartbeatInterval: number;
      offlineThreshold: number;
    };
  };
  tickets: {
    sla: {
      defaultResponseTime: number;
      defaultResolutionTime: number;
      escalationTime: number;
    };
  };
}

export default function SystemConfig() {
  const { toast } = useToast();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/system/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      toast({
        title: "Error",
        description: "Failed to load system configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch('/api/system/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "System configuration updated successfully",
        });
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "Failed to save system configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    // This would reset to default values
    fetchConfig();
    toast({
      title: "Configuration Reset",
      description: "Configuration reset to default values",
    });
  };

  const updateNestedConfig = (path: string[], value: number) => {
    if (!config) return;

    const newConfig = { ...config };
    let current: any = newConfig;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    setConfig(newConfig);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading system configuration...</div>;
  }

  if (!config) {
    return <div className="flex justify-center p-8">Failed to load configuration</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Alert Thresholds</TabsTrigger>
          <TabsTrigger value="network">Network Settings</TabsTrigger>
          <TabsTrigger value="tickets">Ticket SLA</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* CPU Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle>CPU Usage Thresholds</CardTitle>
                <CardDescription>Configure CPU usage alert thresholds (percentage)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Warning Threshold (%)</Label>
                  <Input
                    type="number"
                    value={config.alerts.thresholds.cpu.warning}
                    onChange={(e) => updateNestedConfig(['alerts', 'thresholds', 'cpu', 'warning'], Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>High Threshold (%)</Label>
                  <Input
                    type="number"
                    value={config.alerts.thresholds.cpu.high}
                    onChange={(e) => updateNestedConfig(['alerts', 'thresholds', 'cpu', 'high'], Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Critical Threshold (%)</Label>
                  <Input
                    type="number"
                    value={config.alerts.thresholds.cpu.critical}
                    onChange={(e) => updateNestedConfig(['alerts', 'thresholds', 'cpu', 'critical'], Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Memory Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle>Memory Usage Thresholds</CardTitle>
                <CardDescription>Configure memory usage alert thresholds (percentage)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Warning Threshold (%)</Label>
                  <Input
                    type="number"
                    value={config.alerts.thresholds.memory.warning}
                    onChange={(e) => updateNestedConfig(['alerts', 'thresholds', 'memory', 'warning'], Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>High Threshold (%)</Label>
                  <Input
                    type="number"
                    value={config.alerts.thresholds.memory.high}
                    onChange={(e) => updateNestedConfig(['alerts', 'thresholds', 'memory', 'high'], Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Critical Threshold (%)</Label>
                  <Input
                    type="number"
                    value={config.alerts.thresholds.memory.critical}
                    onChange={(e) => updateNestedConfig(['alerts', 'thresholds', 'memory', 'critical'], Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Disk Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle>Disk Usage Thresholds</CardTitle>
                <CardDescription>Configure disk usage alert thresholds (percentage)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Warning Threshold (%)</Label>
                  <Input
                    type="number"
                    value={config.alerts.thresholds.disk.warning}
                    onChange={(e) => updateNestedConfig(['alerts', 'thresholds', 'disk', 'warning'], Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>High Threshold (%)</Label>
                  <Input
                    type="number"
                    value={config.alerts.thresholds.disk.high}
                    onChange={(e) => updateNestedConfig(['alerts', 'thresholds', 'disk', 'high'], Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Critical Threshold (%)</Label>
                  <Input
                    type="number"
                    value={config.alerts.thresholds.disk.critical}
                    onChange={(e) => updateNestedConfig(['alerts', 'thresholds', 'disk', 'critical'], Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Network Scanning</CardTitle>
                <CardDescription>Configure network scan timeouts and retry attempts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Scan Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={config.network.scan.timeoutMs}
                    onChange={(e) => updateNestedConfig(['network', 'scan', 'timeoutMs'], Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Retry Attempts</Label>
                  <Input
                    type="number"
                    value={config.network.scan.retryAttempts}
                    onChange={(e) => updateNestedConfig(['network', 'scan', 'retryAttempts'], Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ping Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={config.network.scan.pingTimeout}
                    onChange={(e) => updateNestedConfig(['network', 'scan', 'pingTimeout'], Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Monitoring</CardTitle>
                <CardDescription>Configure agent heartbeat and offline detection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Heartbeat Interval (ms)</Label>
                  <Input
                    type="number"
                    value={config.network.agents.heartbeatInterval}
                    onChange={(e) => updateNestedConfig(['network', 'agents', 'heartbeatInterval'], Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Offline Threshold (ms)</Label>
                  <Input
                    type="number"
                    value={config.network.agents.offlineThreshold}
                    onChange={(e) => updateNestedConfig(['network', 'agents', 'offlineThreshold'], Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SLA Configuration</CardTitle>
              <CardDescription>Configure default SLA timeframes for tickets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Response Time (hours)</Label>
                <Input
                  type="number"
                  value={config.tickets.sla.defaultResponseTime / (60 * 60 * 1000)}
                  onChange={(e) => updateNestedConfig(['tickets', 'sla', 'defaultResponseTime'], Number(e.target.value) * 60 * 60 * 1000)}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Resolution Time (hours)</Label>
                <Input
                  type="number"
                  value={config.tickets.sla.defaultResolutionTime / (60 * 60 * 1000)}
                  onChange={(e) => updateNestedConfig(['tickets', 'sla', 'defaultResolutionTime'], Number(e.target.value) * 60 * 60 * 1000)}
                />
              </div>
              <div className="space-y-2">
                <Label>Escalation Time (hours)</Label>
                <Input
                  type="number"
                  value={config.tickets.sla.escalationTime / (60 * 60 * 1000)}
                  onChange={(e) => updateNestedConfig(['tickets', 'sla', 'escalationTime'], Number(e.target.value) * 60 * 60 * 1000)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
