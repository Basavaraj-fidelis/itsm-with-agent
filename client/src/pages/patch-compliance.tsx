import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Download,
  Calendar,
  Server,
  TrendingUp,
  Settings,
  Plus,
  Play,
  Pause,
  RefreshCw,
  Clock,
  Lightbulb
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface ComplianceReport {
  device_id: string;
  device_name: string;
  os_version: string;
  last_scan: string;
  total_patches: number;
  installed_patches: number;
  missing_critical: number;
  missing_important: number;
  compliance_percentage: number;
  risk_score: number;
  next_maintenance_window?: string;
}

interface DashboardData {
  summary: {
    total_devices: number;
    compliant_devices: number;
    compliance_rate: number;
    devices_with_critical_gaps: number;
    average_compliance: number;
  };
  devices?: ComplianceReport[];
  top_non_compliant?: ComplianceReport[];
  upcoming_maintenance?: ComplianceReport[];
  recommendations?: string[];
}

export default function PatchCompliancePage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deployments, setDeployments] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [createDeploymentOpen, setCreateDeploymentOpen] = useState(false);
  const [deploymentForm, setDeploymentForm] = useState({
    name: '',
    description: '',
    schedule_type: 'immediate',
    scheduled_date: '',
    target_patches: [],
    target_devices: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/patch-compliance/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Dashboard data received:', data);
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching patch compliance dashboard:', error);
      // Set fallback data to prevent UI errors
      setDashboardData({
        summary: {
          total_devices: 0,
          compliant_devices: 0,
          compliance_rate: 0,
          devices_with_critical_gaps: 0,
          average_compliance: 0
        },
        devices: [],
        top_non_compliant: [],
        upcoming_maintenance: [],
        recommendations: ['Error loading data - please refresh'],
        error: true
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeColor = (riskScore: number) => {
    if (riskScore > 75) return 'destructive';
    if (riskScore > 25) return 'warning';
    return 'secondary';
  };

  const getRiskLabel = (riskScore: number) => {
    if (riskScore > 75) return 'High Risk';
    if (riskScore > 25) return 'Medium Risk';
    return 'Low Risk';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Always show the dashboard, even with empty data
  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

    // Calculate summary data safely with fallbacks
    const devices = dashboardData?.devices || [];
    const summary = dashboardData?.summary || {
      total_devices: 0,
      compliant_devices: 0,
      compliance_rate: 0,
      devices_with_critical_gaps: 0,
      average_compliance: 0
    };

    const totalDevices = summary.total_devices || devices.length || 0;
    const compliantDevices = summary.compliant_devices || devices.filter(d => (d?.compliance_percentage || 0) >= 95).length || 0;
    const devicesWithCriticalGaps = summary.devices_with_critical_gaps || devices.filter(d => (d?.missing_critical || 0) > 0).length || 0;
    const averageCompliance = summary.average_compliance || (totalDevices > 0 
      ? devices.reduce((sum, d) => sum + ((d?.compliance_percentage || 0)), 0) / totalDevices 
      : 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Patch Compliance Dashboard</h1>
        <Button onClick={fetchDashboardData}>
          <Download className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* System Status Notice */}
      {dashboardData.mock_mode ? (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            System is initializing - displaying sample data. Patch compliance tables are being set up.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-4">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Security patches are automatically deployed. Application patches require manual review and approval.
          </AlertDescription>
        </Alert>
      )}

      {/* Recommendations */}
      {dashboardData.recommendations && dashboardData.recommendations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>System Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="space-y-2">
              {(dashboardData?.recommendations || []).map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                  <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((dashboardData.summary?.compliance_rate || 0)).toFixed(1)}%
            </div>
            <Progress 
              value={dashboardData.summary.compliance_rate || 0} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Security patches auto-deployed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant Devices</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.summary?.compliant_devices || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {dashboardData.summary?.total_devices || 0} total devices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Gaps</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {dashboardData.summary?.devices_with_critical_gaps || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              devices with critical patches missing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Compliance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((dashboardData.summary?.average_compliance || 0)).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              across all managed devices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution */}
      {dashboardData.risk_distribution && (
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {dashboardData.risk_distribution.high_risk || 0}
                </div>
                <p className="text-sm text-muted-foreground">High Risk</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {dashboardData.risk_distribution.medium_risk || 0}
                </div>
                <p className="text-sm text-muted-foreground">Medium Risk</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {dashboardData.risk_distribution.low_risk || 0}
                </div>
                <p className="text-sm text-muted-foreground">Low Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Non-Compliant Devices */}
        <Card>
          <CardHeader>
            <CardTitle>Top Non-Compliant Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(dashboardData.top_non_compliant || dashboardData.devices || []).slice(0, 5).map((device) => (
                <div key={device.device_id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{device.hostname || device.device_name || 'Unknown Device'}</div>
                      <div className="text-sm text-muted-foreground">
                        {device.missing_critical || 0} critical, {device.missing_important || 0} important
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant={getRiskBadgeColor(device.risk_score || 0)}>
                      {getRiskLabel(device.risk_score || 0)}
                    </Badge>
                    <div className="text-sm font-medium">
                      {(device.compliance_percentage || 0).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Auto-Deployed Security Patches */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Auto-Deployments</CardTitle>
            <CardDescription>Security patches deployed automatically</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(dashboardData.devices || []).slice(0, 5).map((device) => (
                <div key={device.device_id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="font-medium">{device.hostname}</div>
                      <div className="text-sm text-muted-foreground">
                        Security patches deployed
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      <Shield className="h-3 w-3 mr-1" />
                      Auto-deployed
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}