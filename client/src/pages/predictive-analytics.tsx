
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Calendar, HardDrive, Cpu, MemoryStick } from "lucide-react";
import { useAgents } from "@/hooks/use-agents";
import { formatDistanceToNow } from "date-fns";

export default function PredictiveAnalytics() {
  const { data: agents = [], isLoading } = useAgents();

  const analyzeTrends = (agent) => {
    const report = agent.latest_report;
    if (!report) return null;

    const rawData = typeof report.raw_data === 'string' 
      ? JSON.parse(report.raw_data) 
      : report.raw_data || {};

    const predictions = [];

    // Disk usage prediction
    const diskUsage = parseFloat(report.disk_usage) || 0;
    if (diskUsage > 85) {
      const daysUntilFull = Math.round((100 - diskUsage) / 2); // Assume 2% growth per day
      predictions.push({
        type: "disk_full",
        severity: diskUsage > 95 ? "critical" : "warning",
        message: `Disk will be full in ~${daysUntilFull} days`,
        daysOut: daysUntilFull,
        icon: HardDrive
      });
    }

    // Memory pressure prediction
    const memUsage = parseFloat(report.memory_usage) || 0;
    if (memUsage > 80) {
      predictions.push({
        type: "memory_pressure",
        severity: memUsage > 90 ? "critical" : "warning", 
        message: "Memory pressure affecting performance",
        recommendation: "Consider memory upgrade",
        icon: MemoryStick
      });
    }

    // Hardware age assessment
    const osInfo = rawData.os_info || {};
    const bootTime = osInfo.boot_time;
    if (bootTime) {
      const uptime = osInfo.uptime_seconds || 0;
      const uptimeDays = Math.floor(uptime / (24 * 3600));
      if (uptimeDays > 30) {
        predictions.push({
          type: "reboot_needed",
          severity: "info",
          message: `System uptime: ${uptimeDays} days - reboot recommended`,
          icon: Calendar
        });
      }
    }

    return predictions;
  };

  const getHealthScore = (agent) => {
    const report = agent.latest_report;
    if (!report) return 0;

    let score = 100;
    const cpu = parseFloat(report.cpu_usage) || 0;
    const memory = parseFloat(report.memory_usage) || 0;
    const disk = parseFloat(report.disk_usage) || 0;

    if (cpu > 80) score -= 20;
    else if (cpu > 60) score -= 10;

    if (memory > 85) score -= 25;
    else if (memory > 70) score -= 15;

    if (disk > 90) score -= 30;
    else if (disk > 80) score -= 20;

    return Math.max(0, score);
  };

  if (isLoading) return <div>Loading predictive analytics...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Predictive Maintenance Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          AI-powered insights and predictions based on system telemetry
        </p>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              Healthy Systems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {agents.filter(a => getHealthScore(a) >= 80).length}
            </div>
            <p className="text-sm text-gray-600">Systems running optimally</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {agents.filter(a => {
                const score = getHealthScore(a);
                return score < 80 && score >= 60;
              }).length}
            </div>
            <p className="text-sm text-gray-600">May need attention soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingDown className="w-5 h-5 text-red-500 mr-2" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {agents.filter(a => getHealthScore(a) < 60).length}
            </div>
            <p className="text-sm text-gray-600">Require immediate action</p>
          </CardContent>
        </Card>
      </div>

      {/* Predictions by System */}
      <Card>
        <CardHeader>
          <CardTitle>System Predictions & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents.map(agent => {
              const predictions = analyzeTrends(agent);
              const healthScore = getHealthScore(agent);
              
              if (!predictions || predictions.length === 0) return null;

              return (
                <div key={agent.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold">{agent.hostname}</h3>
                      <Badge variant={healthScore >= 80 ? "default" : healthScore >= 60 ? "secondary" : "destructive"}>
                        Health: {healthScore}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {predictions.map((prediction, idx) => {
                      const IconComponent = prediction.icon;
                      return (
                        <div key={idx} className={`p-3 rounded border-l-4 ${
                          prediction.severity === 'critical' ? 'border-red-500 bg-red-50' :
                          prediction.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                          'border-blue-500 bg-blue-50'
                        }`}>
                          <div className="flex items-start space-x-2">
                            <IconComponent className={`w-4 h-4 mt-0.5 ${
                              prediction.severity === 'critical' ? 'text-red-500' :
                              prediction.severity === 'warning' ? 'text-yellow-500' :
                              'text-blue-500'
                            }`} />
                            <div>
                              <p className="text-sm font-medium">{prediction.message}</p>
                              {prediction.recommendation && (
                                <p className="text-xs text-gray-600 mt-1">
                                  💡 {prediction.recommendation}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
