
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Users, Calendar, BarChart3 } from "lucide-react";
import { useAgents } from "@/hooks/use-agents";

export default function ExecutiveDashboard() {
  const { data: agents = [], isLoading } = useAgents();

  const calculateBusinessMetrics = () => {
    let totalAssetValue = 0;
    let atRiskAssets = 0;
    let refreshNeeded = 0;
    let productivityImpact = 0;

    const departmentMetrics = {};

    agents.forEach(agent => {
      // Estimate asset value based on OS and age
      const osName = agent.os_name || '';
      let assetValue = 1000; // Base value
      if (osName.includes('Windows 11')) assetValue = 1500;
      if (osName.includes('macOS')) assetValue = 2000;
      if (agent.hostname.includes('SRV')) assetValue = 5000; // Server
      
      totalAssetValue += assetValue;

      // Determine if asset is at risk
      const report = agent.latest_report;
      if (report) {
        const cpu = parseFloat(report.cpu_usage) || 0;
        const memory = parseFloat(report.memory_usage) || 0;
        const disk = parseFloat(report.disk_usage) || 0;

        if (cpu > 80 || memory > 85 || disk > 90) {
          atRiskAssets++;
          productivityImpact += 0.15; // 15% productivity loss per affected system
        }

        // Check if system needs refresh (high resource usage consistently)
        if (memory > 85 && disk > 80) {
          refreshNeeded++;
        }
      }

      // Department breakdown
      const user = agent.assigned_user || 'Unassigned';
      const dept = user.includes('@') ? 'IT' : 'Operations'; // Simplified
      
      if (!departmentMetrics[dept]) {
        departmentMetrics[dept] = { count: 0, issues: 0 };
      }
      departmentMetrics[dept].count++;
      
      if (agent.status === 'offline' || (report && parseFloat(report.cpu_usage || '0') > 80)) {
        departmentMetrics[dept].issues++;
      }
    });

    return {
      totalAssetValue,
      atRiskAssets,
      refreshNeeded,
      productivityImpact: Math.round(productivityImpact * 100),
      departmentMetrics,
      totalSystems: agents.length
    };
  };

  const estimateRefreshBudget = () => {
    const metrics = calculateBusinessMetrics();
    const avgSystemCost = 1200;
    const refreshBudget = metrics.refreshNeeded * avgSystemCost;
    const riskMitigation = metrics.atRiskAssets * 200; // Cost to mitigate risks
    
    return {
      refreshBudget,
      riskMitigation,
      totalBudgetNeeded: refreshBudget + riskMitigation
    };
  };

  const metrics = calculateBusinessMetrics();
  const budget = estimateRefreshBudget();

  if (isLoading) return <div>Loading executive dashboard...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Executive IT Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Business intelligence and strategic IT insights
        </p>
      </div>

      {/* Key Business Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 text-green-500 mr-2" />
              Asset Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.totalAssetValue.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">
              Current IT asset value
            </p>
            <div className="mt-2 text-xs text-gray-500">
              {metrics.totalSystems} managed systems
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 text-red-500 mr-2" />
              Business Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.atRiskAssets}
            </div>
            <p className="text-sm text-gray-600">
              Systems at risk
            </p>
            <div className="mt-2 text-xs text-red-500">
              {metrics.productivityImpact}% productivity impact
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 text-orange-500 mr-2" />
              Refresh Planning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.refreshNeeded}
            </div>
            <p className="text-sm text-gray-600">
              Systems need upgrade
            </p>
            <div className="mt-2 text-xs text-orange-500">
              ${budget.refreshBudget.toLocaleString()} budget needed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 text-blue-500 mr-2" />
              Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((agents.filter(a => a.status === 'online').length / agents.length) * 100)}%
            </div>
            <p className="text-sm text-gray-600">
              System uptime
            </p>
            <div className="mt-2 text-xs text-blue-500">
              {agents.filter(a => a.status === 'online').length} of {agents.length} online
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Planning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>IT Budget Planning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                <span className="font-medium">Hardware Refresh Budget</span>
                <span className="font-bold text-blue-600">
                  ${budget.refreshBudget.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                <span className="font-medium">Risk Mitigation Cost</span>
                <span className="font-bold text-orange-600">
                  ${budget.riskMitigation.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-green-50 rounded border-2 border-green-200">
                <span className="font-medium">Total Budget Required</span>
                <span className="font-bold text-green-600">
                  ${budget.totalBudgetNeeded.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.departmentMetrics).map(([dept, data]) => {
                const healthPercent = Math.round(((data.count - data.issues) / data.count) * 100);
                return (
                  <div key={dept} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{dept}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({data.count} systems)
                      </span>
                    </div>
                    <Badge variant={healthPercent >= 90 ? "default" : healthPercent >= 70 ? "secondary" : "destructive"}>
                      {healthPercent}% healthy
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-blue-600 mb-2">Cost Optimization</h4>
              <p className="text-sm text-gray-600">
                Proactive maintenance could reduce emergency IT costs by 40%. 
                Current risk: ${(metrics.atRiskAssets * 500).toLocaleString()} in potential downtime costs.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-green-600 mb-2">Productivity Gains</h4>
              <p className="text-sm text-gray-600">
                Upgrading {metrics.refreshNeeded} systems could improve productivity by 25%, 
                translating to ${((metrics.refreshNeeded * 2000)).toLocaleString()} in annual value.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-purple-600 mb-2">Risk Mitigation</h4>
              <p className="text-sm text-gray-600">
                {metrics.atRiskAssets} systems currently pose business continuity risks. 
                Recommended immediate action to prevent service disruptions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
