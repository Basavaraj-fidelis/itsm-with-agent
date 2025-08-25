import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Shield, ShieldCheck, ShieldAlert, Lock, Unlock, Eye, EyeOff, Activity, TrendingUp, TrendingDown, Users, Server, Wifi, Download, XCircle, CheckCircle, Bug, Key, Usb } from 'lucide-react';
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Define alert level constants
const ALERT_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

const getAlertLevel = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return ALERT_LEVELS.CRITICAL;
    case 'high': return ALERT_LEVELS.HIGH;
    case 'medium': return ALERT_LEVELS.MEDIUM;
    case 'low': return ALERT_LEVELS.LOW;
    default: return ALERT_LEVELS.LOW;
  }
};


export default function SecurityDashboard() {
  const [selectedDevice, setSelectedDevice] = useState("");

  const { data: devices, isLoading: devicesLoading, isError: devicesError } = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.getDevices(),
    retry: 1,
    refetchOnWindowFocus: false
  });

  const { data: vulnerabilities, isError: vulnerabilitiesError, isLoading: vulnerabilitiesLoading } = useQuery({
    queryKey: ["vulnerabilities", selectedDevice],
    queryFn: () => api.getVulnerabilities(selectedDevice),
    enabled: !!selectedDevice,
    retry: 1,
    onError: (error) => {
      console.error("Error fetching vulnerabilities:", error);
    }
  });

  const { data: alerts, isError: alertsError, isLoading: alertsLoading } = useQuery({
    queryKey: ["security-alerts"],
    queryFn: async () => {
      try {
        const response = await api.get("/api/security/alerts");
        if (!response.ok) {
          console.error("Security alerts API error:", response.status);
          return [];
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching security alerts:", error);
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security & Compliance</h1>
          <p className="text-muted-foreground">Monitor security threats, compliance status, and vulnerabilities</p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {alertsLoading ? "..." : (alerts?.filter(a => getAlertLevel(a.severity) === ALERT_LEVELS.CRITICAL || getAlertLevel(a.severity) === ALERT_LEVELS.HIGH).length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Critical/High severity from database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">USB Violations</CardTitle>
            <Usb className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alertsLoading ? "..." : (alerts?.filter(a => a.metadata?.usb_device || a.message?.toLowerCase().includes('usb')).length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">USB policy violations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">License Issues</CardTitle>
            <Key className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {alertsLoading ? "..." : (alerts?.filter(a => getAlertLevel(a.category) === ALERT_LEVELS.MEDIUM).length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Compliance violations from database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vulnerabilities</CardTitle>
            <Bug className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {vulnerabilities?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Known CVEs</p>
          </CardContent>
        </Card>
      </div>

      {/* Device Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Device Security Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={selectedDevice} onValueChange={setSelectedDevice} disabled={devicesLoading || devicesError}>
              <SelectTrigger>
                <SelectValue placeholder={
                  devicesLoading ? "Loading devices..." :
                  devicesError ? "Error loading devices" :
                  devices?.length === 0 ? "No devices available" :
                  "Select a device to analyze"
                } />
              </SelectTrigger>
              <SelectContent>
                {devices?.map((device: any) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.hostname} ({device.ip_address})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDevice && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Vulnerability Assessment</h3>
              {vulnerabilitiesLoading ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Scanning for vulnerabilities...</span>
                </div>
              ) : vulnerabilitiesError ? (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-4 h-4" />
                  <span>Error loading vulnerability data. Please try again.</span>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              ) : vulnerabilities && vulnerabilities.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>No known vulnerabilities detected</span>
                </div>
              ) : vulnerabilities && vulnerabilities.length > 0 ? (
                <div className="space-y-3">
                  {vulnerabilities.map((vuln: any, index: number) => (
                    <Card key={index} className="border-l-4 border-l-red-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{vuln.software_name} v{vuln.version}</h4>
                            <div className="space-y-2 mt-2">
                              {vuln.cve_matches.map((cve: any, cveIndex: number) => (
                                <div key={cveIndex} className="flex items-center gap-2">
                                  <Badge variant={getAlertLevel(cve.severity) === ALERT_LEVELS.CRITICAL ? "destructive" :
                                                getAlertLevel(cve.severity) === ALERT_LEVELS.HIGH ? "destructive" :
                                                getAlertLevel(cve.severity) === ALERT_LEVELS.MEDIUM ? "secondary" : "outline"}>
                                    {cve.severity.toUpperCase()}
                                  </Badge>
                                  <span className="text-sm">{cve.cve_id}</span>
                                  {cve.patch_available && (
                                    <Badge variant="outline" className="text-green-600">Patch Available</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bug className="w-12 h-12 mx-auto mb-4" />
                  <p>Select a device to view vulnerability assessment</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert: any) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getAlertLevel(alert.severity) === ALERT_LEVELS.CRITICAL || getAlertLevel(alert.severity) === ALERT_LEVELS.HIGH ?
                      <XCircle className="w-5 h-5 text-red-500" /> :
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    }
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm text-muted-foreground">
                        Device: {alert.device_hostname || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getAlertLevel(alert.severity) === ALERT_LEVELS.CRITICAL ? "destructive" :
                                getAlertLevel(alert.severity) === ALERT_LEVELS.HIGH ? "destructive" : "secondary"}>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4" />
              <p>No security alerts at this time</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}