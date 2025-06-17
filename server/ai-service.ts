
import { storage } from "./storage";

export interface AIInsight {
  id: string;
  device_id: string;
  type: 'performance' | 'security' | 'maintenance' | 'prediction' | 'optimization';
  severity: 'low' | 'medium' | 'high' | 'critical' | 'info';
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  metadata: any;
  created_at: Date;
}

export interface PerformancePrediction {
  resource: string;
  current_trend: number;
  predicted_value: number;
  prediction_date: Date;
  confidence: number;
  recommendation: string;
}

class AIService {
  async generateDeviceInsights(deviceId: string): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    try {
      // Get recent device reports (last 7 days)
      const reports = await storage.getRecentDeviceReports(deviceId, 7);
      
      if (reports.length === 0) {
        return insights;
      }

      const latestReport = reports[0];
      
      // Performance Analysis
      await this.analyzePerformancePatterns(deviceId, reports, insights);
      
      // Security Assessment
      await this.analyzeSecurityPosture(deviceId, latestReport, insights);
      
      // Resource Predictions
      await this.generateResourcePredictions(deviceId, reports, insights);
      
      // Process Behavior Analysis
      await this.analyzeProcessBehavior(deviceId, latestReport, insights);
      
      // System Health Assessment
      await this.analyzeSystemHealth(deviceId, latestReport, insights);

      console.log(`Generated ${insights.length} AI insights for device ${deviceId}`);
      return insights;
      
    } catch (error) {
      console.error("Error generating AI insights:", error);
      return insights;
    }
  }

  private async analyzePerformancePatterns(
    deviceId: string, 
    reports: any[], 
    insights: AIInsight[]
  ): Promise<void> {
    if (reports.length < 3) return;

    // Analyze CPU trends
    const cpuValues = reports.map(r => parseFloat(r.cpu_usage || "0")).filter(v => !isNaN(v));
    const cpuTrend = this.calculateTrend(cpuValues);
    
    if (cpuTrend > 2) { // Increasing by >2% per day
      insights.push({
        id: `cpu-trend-${deviceId}`,
        device_id: deviceId,
        type: 'performance',
        severity: cpuTrend > 5 ? 'high' : 'medium',
        title: 'Rising CPU Usage Trend',
        description: `CPU usage trending upward by ${cpuTrend.toFixed(1)}% per day over the last week`,
        recommendation: 'Monitor for runaway processes or consider CPU upgrade if trend continues',
        confidence: 0.8,
        metadata: { trend: cpuTrend, metric: 'cpu' },
        created_at: new Date()
      });
    }

    // Analyze Memory trends
    const memoryValues = reports.map(r => parseFloat(r.memory_usage || "0")).filter(v => !isNaN(v));
    const memoryTrend = this.calculateTrend(memoryValues);
    
    if (memoryTrend > 1.5) {
      insights.push({
        id: `memory-trend-${deviceId}`,
        device_id: deviceId,
        type: 'performance',
        severity: memoryTrend > 3 ? 'high' : 'medium',
        title: 'Memory Usage Climbing',
        description: `Memory usage increasing by ${memoryTrend.toFixed(1)}% per day`,
        recommendation: 'Check for memory leaks or plan for memory upgrade',
        confidence: 0.75,
        metadata: { trend: memoryTrend, metric: 'memory' },
        created_at: new Date()
      });
    }

    // Performance volatility analysis
    const cpuVolatility = this.calculateVolatility(cpuValues);
    if (cpuVolatility > 15) {
      insights.push({
        id: `cpu-volatility-${deviceId}`,
        device_id: deviceId,
        type: 'performance',
        severity: 'medium',
        title: 'Unstable CPU Performance',
        description: `High CPU usage volatility detected (${cpuVolatility.toFixed(1)}% std deviation)`,
        recommendation: 'Investigate intermittent high-CPU processes or system instability',
        confidence: 0.7,
        metadata: { volatility: cpuVolatility, metric: 'cpu' },
        created_at: new Date()
      });
    }
  }

  private async analyzeSecurityPosture(
    deviceId: string, 
    latestReport: any, 
    insights: AIInsight[]
  ): Promise<void> {
    if (!latestReport.raw_data) return;

    const rawData = JSON.parse(latestReport.raw_data);
    const security = rawData.security || {};
    const processes = rawData.processes || [];

    // Security services check
    if (security.firewall_status !== 'enabled' || security.antivirus_status !== 'enabled') {
      insights.push({
        id: `security-services-${deviceId}`,
        device_id: deviceId,
        type: 'security',
        severity: 'critical',
        title: 'Critical Security Services Disabled',
        description: `${security.firewall_status !== 'enabled' ? 'Firewall disabled. ' : ''}${security.antivirus_status !== 'enabled' ? 'Antivirus disabled.' : ''}`,
        recommendation: 'Immediately enable all security services and run full system scan',
        confidence: 0.95,
        metadata: { firewall: security.firewall_status, antivirus: security.antivirus_status },
        created_at: new Date()
      });
    }

    // Suspicious process analysis
    const suspiciousProcesses = processes.filter(p => 
      p.cpu_percent > 50 || 
      (p.name && (p.name.includes('crypto') || p.name.includes('miner')))
    );

    if (suspiciousProcesses.length > 0) {
      insights.push({
        id: `suspicious-processes-${deviceId}`,
        device_id: deviceId,
        type: 'security',
        severity: 'high',
        title: 'Suspicious Process Activity',
        description: `${suspiciousProcesses.length} potentially suspicious processes detected`,
        recommendation: 'Review process activity and run malware scan',
        confidence: 0.6,
        metadata: { processes: suspiciousProcesses.map(p => p.name) },
        created_at: new Date()
      });
    }
  }

  private async generateResourcePredictions(
    deviceId: string, 
    reports: any[], 
    insights: AIInsight[]
  ): Promise<void> {
    if (reports.length < 5) return;

    // Disk space prediction
    const diskValues = reports.map(r => parseFloat(r.disk_usage || "0")).filter(v => !isNaN(v));
    const diskTrend = this.calculateTrend(diskValues);
    
    if (diskTrend > 0.5) { // Growing by >0.5% per day
      const currentDisk = diskValues[0] || 0;
      const daysToFull = (95 - currentDisk) / diskTrend;
      
      if (daysToFull > 0 && daysToFull < 90) {
        insights.push({
          id: `disk-prediction-${deviceId}`,
          device_id: deviceId,
          type: 'prediction',
          severity: daysToFull < 30 ? 'high' : 'medium',
          title: 'Disk Space Forecast',
          description: `Disk will reach 95% capacity in approximately ${Math.round(daysToFull)} days`,
          recommendation: daysToFull < 30 
            ? 'Urgent: Schedule disk cleanup or expansion immediately'
            : 'Plan disk maintenance within the next month',
          confidence: Math.min(0.9, reports.length / 10),
          metadata: { days_to_full: daysToFull, current_usage: currentDisk, trend: diskTrend },
          created_at: new Date()
        });
      }
    }
  }

  private async analyzeProcessBehavior(
    deviceId: string, 
    latestReport: any, 
    insights: AIInsight[]
  ): Promise<void> {
    if (!latestReport.raw_data) return;

    const rawData = JSON.parse(latestReport.raw_data);
    const processes = rawData.processes || [];

    // Resource-intensive processes
    const highCPUProcesses = processes.filter(p => p.cpu_percent > 20);
    const highMemoryProcesses = processes.filter(p => p.memory_percent > 10);

    if (highCPUProcesses.length >= 3) {
      insights.push({
        id: `high-cpu-processes-${deviceId}`,
        device_id: deviceId,
        type: 'performance',
        severity: 'medium',
        title: 'Multiple High-CPU Processes',
        description: `${highCPUProcesses.length} processes consuming >20% CPU each`,
        recommendation: 'Review process efficiency and consider workload optimization',
        confidence: 0.8,
        metadata: { processes: highCPUProcesses.slice(0, 5).map(p => ({ name: p.name, cpu: p.cpu_percent })) },
        created_at: new Date()
      });
    }

    // Process optimization opportunities
    if (processes.length > 100) {
      insights.push({
        id: `process-optimization-${deviceId}`,
        device_id: deviceId,
        type: 'optimization',
        severity: 'info',
        title: 'Process Optimization Opportunity',
        description: `${processes.length} running processes detected - system may benefit from cleanup`,
        recommendation: 'Review and disable unnecessary startup programs and services',
        confidence: 0.6,
        metadata: { process_count: processes.length },
        created_at: new Date()
      });
    }
  }

  private async analyzeSystemHealth(
    deviceId: string, 
    latestReport: any, 
    insights: AIInsight[]
  ): Promise<void> {
    if (!latestReport.raw_data) return;

    const rawData = JSON.parse(latestReport.raw_data);
    const systemHealth = rawData.system_health || {};

    // Memory pressure analysis
    if (systemHealth.memory_pressure?.pressure_level === 'high') {
      insights.push({
        id: `memory-pressure-${deviceId}`,
        device_id: deviceId,
        type: 'maintenance',
        severity: 'high',
        title: 'High Memory Pressure',
        description: 'System experiencing significant memory pressure',
        recommendation: 'Close unnecessary applications or restart system to free memory',
        confidence: 0.9,
        metadata: { pressure_level: systemHealth.memory_pressure.pressure_level },
        created_at: new Date()
      });
    }

    // Disk health monitoring
    if (systemHealth.disk_health?.status !== 'healthy') {
      insights.push({
        id: `disk-health-${deviceId}`,
        device_id: deviceId,
        type: 'maintenance',
        severity: 'medium',
        title: 'Disk Health Warning',
        description: `Disk health status: ${systemHealth.disk_health?.status || 'unknown'}`,
        recommendation: 'Run disk diagnostics and ensure data backups are current',
        confidence: 0.8,
        metadata: { disk_status: systemHealth.disk_health?.status },
        created_at: new Date()
      });
    }
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope || 0;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private detectAnomalies(values: number[], threshold = 2.5): number[] {
    if (values.length < 3) return [];

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
    
    return values.filter(value => Math.abs(value - mean) > threshold * std);
  }

  private calculateSeasonality(values: number[]): { pattern: string; confidence: number } {
    if (values.length < 7) return { pattern: 'insufficient_data', confidence: 0 };

    // Simple weekly pattern detection
    const weeklyAvg = [];
    for (let day = 0; day < 7; day++) {
      const dayValues = values.filter((_, index) => index % 7 === day);
      weeklyAvg[day] = dayValues.reduce((a, b) => a + b, 0) / dayValues.length;
    }

    const totalVariance = values.reduce((sum, val) => {
      const overallMean = values.reduce((a, b) => a + b, 0) / values.length;
      return sum + Math.pow(val - overallMean, 2);
    }, 0) / values.length;

    const weeklyVariance = weeklyAvg.reduce((sum, dayMean) => {
      const overallMean = weeklyAvg.reduce((a, b) => a + b, 0) / 7;
      return sum + Math.pow(dayMean - overallMean, 2);
    }, 0) / 7;

    const seasonalityStrength = weeklyVariance / totalVariance;
    
    return {
      pattern: seasonalityStrength > 0.3 ? 'weekly' : 'random',
      confidence: Math.min(seasonalityStrength, 1.0)
    };
  }

  async getDeviceRecommendations(deviceId: string): Promise<string[]> {
    const insights = await this.generateDeviceInsights(deviceId);
    return insights
      .filter(insight => insight.severity === 'high' || insight.severity === 'critical')
      .map(insight => insight.recommendation)
      .slice(0, 5); // Top 5 recommendations
  }
}

export const aiService = new AIService();
