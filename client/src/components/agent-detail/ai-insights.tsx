import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Zap,
  Target,
  Activity,
  RefreshCw
} from "lucide-react";
import { useState, useEffect } from "react";

interface AIInsightsProps {
  agent: any;
}

interface AIInsight {
  type: 'performance' | 'security' | 'maintenance' | 'prediction';
  severity: 'low' | 'medium' | 'high' | 'info';
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  trend?: 'up' | 'down' | 'stable';
  metric?: string;
}

export function AIInsights({ agent }: AIInsightsProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);

  const generateInsights = () => {
    if (!agent?.latest_report) return [];

    const aiInsights: AIInsight[] = [];
    const latestReport = agent.latest_report;

    try {
      // Parse metrics with error handling
      const cpuUsage = parseFloat(latestReport.cpu_usage || "0");
      const memoryUsage = parseFloat(latestReport.memory_usage || "0");
      const diskUsage = parseFloat(latestReport.disk_usage || "0");

      // Parse raw data for advanced analysis with proper error handling
      let rawData = {};
      try {
        if (latestReport.raw_data) {
          if (typeof latestReport.raw_data === "string") {
            // Check for "[object Object]" which indicates improper serialization
            if (latestReport.raw_data === "[object Object]") {
              console.warn('Detected improper object serialization in raw_data');
              rawData = {};
            } else if (latestReport.raw_data.startsWith('{') || latestReport.raw_data.startsWith('[')) {
              rawData = JSON.parse(latestReport.raw_data);
            } else {
              console.warn('Invalid JSON format in raw_data:', latestReport.raw_data);
              rawData = {};
            }
          } else if (typeof latestReport.raw_data === "object" && latestReport.raw_data !== null) {
            rawData = latestReport.raw_data;
          }
        }
      } catch (parseError) {
        console.error('Error parsing raw_data:', parseError);
        rawData = {};
      }

      const processes = Array.isArray(rawData.processes) ? rawData.processes : [];
      const systemHealth = rawData.system_health || {};
      const securityData = rawData.security || {};

    // 1. Performance Anomaly Detection
    if (cpuUsage > 85) {
      const topCPUProcess = processes
        .filter(p => p.cpu_percent > 0)
        .sort((a, b) => b.cpu_percent - a.cpu_percent)[0];

      aiInsights.push({
        type: 'performance',
        severity: cpuUsage > 95 ? 'high' : 'medium',
        title: 'High CPU Usage Detected',
        description: `CPU usage at ${cpuUsage.toFixed(1)}%. ${topCPUProcess ? `Top consumer: ${topCPUProcess.name} (${topCPUProcess.cpu_percent.toFixed(1)}%)` : ''}`,
        recommendation: 'Consider investigating high CPU processes or scheduling maintenance during off-hours.',
        confidence: 0.9,
        trend: 'up',
        metric: 'CPU'
      });
    }

    // 2. Memory Pressure Analysis
    if (memoryUsage > 80) {
      const memoryPressure = systemHealth.memory_pressure?.pressure_level || 'unknown';

      aiInsights.push({
        type: 'performance',
        severity: memoryUsage > 90 ? 'high' : 'medium',
        title: 'Memory Pressure Detected',
        description: `Memory usage at ${memoryUsage.toFixed(1)}%. System pressure level: ${memoryPressure}`,
        recommendation: memoryUsage > 90 
          ? 'Immediate action required: Close unnecessary applications or restart system'
          : 'Monitor memory usage and consider memory upgrade if pattern persists',
        confidence: 0.85,
        trend: 'up',
        metric: 'Memory'
      });
    }

    // 3. Disk Space Prediction
    if (diskUsage > 75) {
      const daysToFull = diskUsage > 90 ? 7 : diskUsage > 85 ? 30 : 90;

      aiInsights.push({
        type: 'prediction',
        severity: diskUsage > 90 ? 'high' : diskUsage > 85 ? 'medium' : 'low',
        title: 'Disk Space Forecast',
        description: `Current disk usage: ${diskUsage.toFixed(1)}%. Projected to reach capacity in ~${daysToFull} days`,
        recommendation: 'Schedule disk cleanup or expansion to prevent service interruption',
        confidence: 0.75,
        trend: 'up',
        metric: 'Disk'
      });
    }

    // 4. Process Behavior Analysis
    const highCPUProcesses = processes.filter(p => p.cpu_percent > 15);
    if (highCPUProcesses.length > 3) {
      aiInsights.push({
        type: 'performance',
        severity: 'medium',
        title: 'Multiple High-CPU Processes',
        description: `${highCPUProcesses.length} processes consuming >15% CPU each`,
        recommendation: 'Review running applications and consider process optimization',
        confidence: 0.8,
        trend: 'stable',
        metric: 'Processes'
      });
    }

    // 5. Security Assessment
    if (securityData.firewall_status === 'disabled' || securityData.antivirus_status === 'disabled') {
      aiInsights.push({
        type: 'security',
        severity: 'high',
        title: 'Security Service Alert',
        description: `${securityData.firewall_status === 'disabled' ? 'Firewall disabled' : ''} ${securityData.antivirus_status === 'disabled' ? 'Antivirus disabled' : ''}`,
        recommendation: 'Immediately enable disabled security services to protect the system',
        confidence: 0.95,
        metric: 'Security'
      });
    }

    // 6. System Health Insights
    if (systemHealth.disk_health?.status !== 'healthy') {
      aiInsights.push({
        type: 'maintenance',
        severity: 'medium',
        title: 'Disk Health Warning',
        description: `Disk health status: ${systemHealth.disk_health?.status || 'unknown'}`,
        recommendation: 'Run disk diagnostics and consider backup of critical data',
        confidence: 0.7,
        metric: 'Hardware'
      });
    }

    // 7. Optimization Opportunities
    if (cpuUsage < 20 && memoryUsage < 50 && diskUsage < 60) {
      aiInsights.push({
        type: 'performance',
        severity: 'info',
        title: 'Resource Optimization Opportunity',
        description: 'System is running efficiently with low resource utilization',
        recommendation: 'Consider consolidating workloads or reducing system specifications if pattern persists',
        confidence: 0.6,
        trend: 'stable',
        metric: 'Overall'
      });
    }

    // 8. Network Connectivity Issues
    if (agent.status === 'offline' || agent.status === 'disconnected') {
      aiInsights.push({
        type: 'maintenance',
        severity: 'high',
        title: 'Connectivity Issue Detected',
        description: `Agent is currently ${agent.status}. Last seen: ${agent.last_seen || 'Unknown'}`,
        recommendation: 'Check network connectivity, firewall rules, and agent service status',
        confidence: 0.95,
        metric: 'Connectivity'
      });
    }

    // 9. Uptime Monitoring
    if (agent.uptime && parseInt(agent.uptime) < 24) {
      aiInsights.push({
        type: 'maintenance',
        severity: 'medium',
        title: 'Recent System Restart',
        description: `System uptime is only ${agent.uptime} hours, indicating recent restart`,
        recommendation: 'Monitor for instability patterns or verify if restart was planned maintenance',
        confidence: 0.8,
        metric: 'Uptime'
      });
    }

    // 10. Agent Version Check
    if (agent.agent_version) {
      const versionParts = agent.agent_version.split('.');
      const majorVersion = parseInt(versionParts[0]) || 0;
      const minorVersion = parseInt(versionParts[1]) || 0;
      
      if (majorVersion < 2 || (majorVersion === 2 && minorVersion < 5)) {
        aiInsights.push({
          type: 'security',
          severity: 'medium',
          title: 'Agent Version Outdated',
          description: `Agent version ${agent.agent_version} may have security vulnerabilities`,
          recommendation: 'Update to the latest agent version for security patches and new features',
          confidence: 0.9,
          metric: 'Security'
        });
      }
    }

    return aiInsights;
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return [];
    }
  };

  const fetchInsights = async () => {
    if (!agent?.id) return;

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`/api/ai/insights/${agent.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json().catch(() => ({ success: false, insights: [] }));
        if (data.success && Array.isArray(data.insights)) {
          setInsights(data.insights);
        } else {
          // Fallback to client-side generation
          const clientInsights = generateInsights();
          setInsights(clientInsights);
        }
      } else {
        console.warn(`AI insights API returned ${response.status}, using fallback`);
        // Fallback to client-side generation on server error
        const clientInsights = generateInsights();
        setInsights(clientInsights);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('AI insights request timed out, using fallback');
      } else {
        console.warn('AI insights API unavailable, using fallback:', error?.message || 'Unknown error');
      }
      // Fallback to client-side generation
      try {
        const clientInsights = generateInsights();
        setInsights(clientInsights);
      } catch (fallbackError) {
        console.error('Client-side insight generation failed:', fallbackError);
        setInsights([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agent?.id) {
      fetchInsights().catch(error => {
        console.error('Failed to fetch insights in useEffect:', error);
      });
    }
  }, [agent?.id]);

  useEffect(() => {
    // Set up periodic refresh every 30 seconds for high severity issues
    if (!agent?.id) return;

    const interval = setInterval(() => {
      if (insights.some(insight => insight.severity === 'high' || insight.severity === 'critical')) {
        fetchInsights().catch(error => {
          console.error('Failed to refresh insights:', error);
        });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [insights, agent?.id]);

  const refreshInsights = () => {
    fetchInsights().catch(error => {
      console.error('Failed to refresh insights manually:', error);
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'info': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return Activity;
      case 'security': return AlertTriangle;
      case 'maintenance': return Target;
      case 'prediction': return TrendingUp;
      default: return Brain;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Insights & Recommendations
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshInsights}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="font-medium text-green-700">System Operating Normally</p>
            <p className="text-sm mt-1">No anomalies or issues detected by AI analysis</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, index) => {
              const IconComponent = getTypeIcon(insight.type);

              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getSeverityColor(insight.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <IconComponent className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {insight.confidence && `${(insight.confidence * 100).toFixed(0)}% confidence`}
                        </Badge>
                        {insight.existing_ticket && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            Ticket: {insight.existing_ticket.number}
                          </Badge>
                        )}
                        {insight.trend && (
                          <div className="flex items-center gap-1">
                            {insight.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                            {insight.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                            {insight.trend === 'stable' && <Activity className="w-3 h-3" />}
                          </div>
                        )}
                      </div>
                      <p className="text-sm mb-2">{insight.description}</p>
                      <div className="flex items-start gap-2">
                        <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <p className="text-xs font-medium">
                          Recommendation: {insight.recommendation}
                        </p>
                      </div>

                      {/* Action Buttons for High Severity Issues */}
                      {insight.severity === 'high' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => {
                              // Create ticket for this issue
                              const ticketData = {
                                title: insight.title,
                                description: `${insight.description}\n\nRecommendation: ${insight.recommendation}`,
                                priority: 'high',
                                type: insight.type,
                                agent_id: agent.id
                              };
                              // Navigate to create ticket with pre-filled data
                              window.open(`/tickets/new?data=${encodeURIComponent(JSON.stringify(ticketData))}`, '_blank');
                            }}
                          >
                            Create Ticket
                          </Button>
                          {insight.type === 'performance' && (
                            <Button
                              size="sm"
                              variant="outline" 
                              className="text-xs h-7"
                              onClick={() => {
                                // Navigate to performance analytics for this agent
                                window.open(`/performance-analytics?agent=${agent.id}&metric=${insight.metric}`, '_blank');
                              }}
                            >
                              View Metrics
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}