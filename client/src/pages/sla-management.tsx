
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle, CheckCircle, TrendingUp, RefreshCw } from "lucide-react";

interface SLADashboardData {
  totalTickets: number;
  breached: number;
  dueIn2Hours: number;
  dueToday: number;
  onTrack: number;
  compliance: number;
  escalationAlerts: number;
}

export default function SLAManagement() {
  const [slaData, setSlaData] = useState<SLADashboardData>({
    totalTickets: 0,
    breached: 0,
    dueIn2Hours: 0,
    dueToday: 0,
    onTrack: 0,
    compliance: 100,
    escalationAlerts: 0
  });
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const fetchSLAData = async () => {
    try {
      const response = await fetch('/api/sla/dashboard');
      if (response.ok) {
        const data = await response.json();
        setSlaData(data);
      }
    } catch (error) {
      console.error('Error fetching SLA data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerEscalationCheck = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/sla/check-escalations', {
        method: 'POST'
      });
      if (response.ok) {
        await fetchSLAData(); // Refresh data
      }
    } catch (error) {
      console.error('Error triggering escalation check:', error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchSLAData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchSLAData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-6">Loading SLA data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SLA Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage Service Level Agreement compliance
          </p>
        </div>
        <Button 
          onClick={triggerEscalationCheck} 
          disabled={checking}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking...' : 'Check Escalations'}
        </Button>
      </div>

      {/* Critical Alerts */}
      {slaData.escalationAlerts > 0 && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <strong>{slaData.escalationAlerts} tickets</strong> require immediate attention due to SLA violations or approaching deadlines.
          </AlertDescription>
        </Alert>
      )}

      {/* SLA Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  SLA Compliance
                </p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {slaData.compliance}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  SLA Breached
                </p>
                <p className="text-3xl font-bold text-red-900 dark:text-red-100">
                  {slaData.breached}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  Due in 2 Hours
                </p>
                <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                  {slaData.dueIn2Hours}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  On Track
                </p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {slaData.onTrack}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>SLA Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Compliance</span>
                <span className="text-2xl font-bold text-green-600">
                  {slaData.compliance}%
                </span>
              </div>
              <Progress value={slaData.compliance} className="w-full" />
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <p className="text-lg font-bold text-green-600">{slaData.onTrack}</p>
                  <p className="text-xs text-green-700 dark:text-green-300">On Track</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                  <p className="text-lg font-bold text-red-600">{slaData.breached}</p>
                  <p className="text-xs text-red-700 dark:text-red-300">Breached</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Escalation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">Critical</p>
                  <p className="text-xs text-red-600 dark:text-red-300">Overdue tickets</p>
                </div>
                <Badge variant="destructive">{slaData.breached}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">Warning</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-300">Due in 2 hours</p>
                </div>
                <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                  {slaData.dueIn2Hours}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">Watch</p>
                  <p className="text-xs text-blue-600 dark:text-blue-300">Due today</p>
                </div>
                <Badge variant="outline" className="border-blue-500 text-blue-700">
                  {slaData.dueToday}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Policies Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current SLA Policies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/10">
              <Badge variant="destructive" className="mb-2">Critical</Badge>
              <p className="text-sm">Response: 15 minutes</p>
              <p className="text-sm">Resolution: 4 hours</p>
            </div>
            <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-900/10">
              <Badge variant="secondary" className="mb-2">High</Badge>
              <p className="text-sm">Response: 1 hour</p>
              <p className="text-sm">Resolution: 8-24 hours</p>
            </div>
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/10">
              <Badge variant="outline" className="mb-2">Medium</Badge>
              <p className="text-sm">Response: 4 hours</p>
              <p className="text-sm">Resolution: 24-48 hours</p>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/10">
              <Badge variant="outline" className="mb-2">Low</Badge>
              <p className="text-sm">Response: 8 hours</p>
              <p className="text-sm">Resolution: 48-96 hours</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
