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
  existing_ticket?: {
    id: string;
    number: string;
  };
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
      // Get recent device reports (last 7 days) with timeout
      const reportsPromise = storage.getRecentDeviceReports(deviceId, 7);
      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 3000)
      );
      
      const reports = await Promise.race([reportsPromise, timeout]);

      if (!reports || reports.length === 0) {
        console.log(`No reports found for device ${deviceId}`);
        return insights;
      }

      const latestReport = reports[0];

      // Run analysis with timeout protection
      const analysisPromises = [
        this.analyzePerformancePatterns(deviceId, reports, insights).catch(err => 
          console.warn('Performance analysis failed:', err.message)
        ),
        this.analyzeSecurityPosture(deviceId, latestReport, insights).catch(err => 
          console.warn('Security analysis failed:', err.message)
        ),
        this.generateResourcePredictions(deviceId, reports, insights).catch(err => 
          console.warn('Resource prediction failed:', err.message)
        ),
        this.analyzeProcessBehavior(deviceId, latestReport, insights).catch(err => 
          console.warn('Process analysis failed:', err.message)
        ),
        this.analyzeSystemHealth(deviceId, latestReport, insights).catch(err => 
          console.warn('System health analysis failed:', err.message)
        )
      ];

      // Wait for all analysis to complete with timeout
      const analysisTimeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Analysis timeout')), 2000)
      );

      await Promise.race([
        Promise.allSettled(analysisPromises),
        analysisTimeout
      ]);

      console.log(`Generated ${insights.length} AI insights for device ${deviceId}`);
      return insights;

    } catch (error) {
      console.warn(`Error generating AI insights for device ${deviceId}:`, error.message);
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
    const securityData = rawData.security || {};
    const processes = rawData.processes || [];

    // Security services check
    if (securityData.firewall_status !== 'enabled' || securityData.antivirus_status !== 'enabled') {
      insights.push({
        id: `security-services-${deviceId}`,
        device_id: deviceId,
        type: 'security',
        severity: 'critical',
        title: 'Critical Security Services Disabled',
        description: `${securityData.firewall_status !== 'enabled' ? 'Firewall disabled. ' : ''}${securityData.antivirus_status !== 'enabled' ? 'Antivirus disabled.' : ''}`,
        recommendation: 'Immediately enable all security services and run full system scan',
        confidence: 0.95,
        metadata: { firewall: securityData.firewall_status, antivirus: securityData.antivirus_status },
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

    const timestamps = reports.map(r => new Date(r.timestamp || r.created_at));

    // Enhanced disk space prediction with seasonality
    const diskValues = reports.map(r => parseFloat(r.disk_usage || "0")).filter(v => !isNaN(v));
    const diskAnalysis = this.analyzeTimeSeriesPatterns(diskValues, timestamps);
    
    if (diskAnalysis.trend > 0.5) {
      const currentDisk = diskValues[0] || 0;
      const forecast = diskAnalysis.forecast;
      
      // Find when disk will reach 95% based on forecast
      let daysToFull = -1;
      for (let i = 0; i < forecast.length; i++) {
        if (forecast[i] >= 95) {
          daysToFull = i + 1;
          break;
        }
      }
      
      if (daysToFull > 0) {
        insights.push({
          id: `disk-prediction-${deviceId}`,
          device_id: deviceId,
          type: 'prediction',
          severity: daysToFull < 30 ? 'high' : 'medium',
          title: 'Advanced Disk Space Forecast',
          description: `Predictive model shows disk reaching 95% capacity in ${daysToFull} days. Pattern: ${diskAnalysis.seasonality}`,
          recommendation: this.generateMaintenanceRecommendation(daysToFull, diskAnalysis.volatility),
          confidence: Math.min(0.95, reports.length / 15),
          metadata: { 
            days_to_full: daysToFull, 
            current_usage: currentDisk, 
            trend: diskAnalysis.trend,
            seasonality: diskAnalysis.seasonality,
            volatility: diskAnalysis.volatility,
            forecast: forecast.slice(0, 7)
          },
          created_at: new Date()
        });
      }
    }

    // Memory degradation prediction
    const memoryValues = reports.map(r => parseFloat(r.memory_usage || "0")).filter(v => !isNaN(v));
    const memoryAnalysis = this.analyzeTimeSeriesPatterns(memoryValues, timestamps);
    
    if (memoryAnalysis.volatility > 20 && memoryAnalysis.trend > 1) {
      insights.push({
        id: `memory-degradation-${deviceId}`,
        device_id: deviceId,
        type: 'prediction',
        severity: 'medium',
        title: 'Memory Performance Degradation Predicted',
        description: `Memory usage patterns suggest potential degradation. Volatility: ${memoryAnalysis.volatility.toFixed(1)}%`,
        recommendation: 'Consider memory diagnostics and potential hardware refresh planning',
        confidence: 0.7,
        metadata: {
          current_trend: memoryAnalysis.trend,
          volatility: memoryAnalysis.volatility,
          anomaly_count: memoryAnalysis.anomalies.length
        },
        created_at: new Date()
      });
    }

    // Hardware failure prediction based on multiple metrics
    await this.predictHardwareFailures(deviceId, reports, insights);
  }

  private async predictHardwareFailures(deviceId: string, reports: any[], insights: AIInsight[]): Promise<void> {
    const timestamps = reports.map(r => new Date(r.timestamp || r.created_at));
    
    // Analyze multiple metrics for failure prediction
    const metrics = ['cpu_usage', 'memory_usage', 'disk_usage', 'cpu_temperature'];
    let riskScore = 0;
    const riskFactors = [];

    for (const metric of metrics) {
      const values = reports.map(r => parseFloat(r[metric] || "0")).filter(v => !isNaN(v) && v > 0);
      if (values.length < 3) continue;

      const analysis = this.analyzeTimeSeriesPatterns(values, timestamps);
      
      // High volatility in critical metrics indicates potential hardware issues
      if (analysis.volatility > 25) {
        riskScore += analysis.volatility / 25;
        riskFactors.push(`${metric} volatility: ${analysis.volatility.toFixed(1)}%`);
      }
      
      // Abnormal trending patterns
      if (metric === 'cpu_temperature' && analysis.trend > 1) {
        riskScore += 2;
        riskFactors.push(`Rising temperature trend: +${analysis.trend.toFixed(1)}°C/day`);
      }
      
      // Anomaly frequency
      if (analysis.anomalies.length > values.length * 0.1) {
        riskScore += 1;
        riskFactors.push(`${metric} anomalies: ${analysis.anomalies.length}/${values.length} readings`);
      }
    }

    if (riskScore > 3) {
      insights.push({
        id: `hardware-failure-risk-${deviceId}`,
        device_id: deviceId,
        type: 'prediction',
        severity: riskScore > 6 ? 'high' : 'medium',
        title: 'Hardware Failure Risk Detected',
        description: `Predictive analysis indicates elevated hardware failure risk. Risk score: ${riskScore.toFixed(1)}`,
        recommendation: 'Schedule comprehensive hardware diagnostics and consider preventive replacement',
        confidence: Math.min(0.9, riskScore / 10),
        metadata: {
          risk_score: riskScore,
          risk_factors: riskFactors,
          analysis_period_days: Math.ceil((new Date().getTime() - timestamps[timestamps.length - 1].getTime()) / (1000 * 60 * 60 * 24))
        },
        created_at: new Date()
      });
    }
  }

  private generateMaintenanceRecommendation(daysToFull: number, volatility: number): string {
    if (daysToFull < 7) return 'CRITICAL: Immediate action required within 24 hours';
    if (daysToFull < 30) return 'HIGH: Schedule maintenance within 1 week';
    if (volatility > 15) return 'MEDIUM: Volatile pattern detected, monitor closely and plan maintenance';
    return 'LOW: Plan routine maintenance within the month';
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

  private analyzeTimeSeriesPatterns(values: number[], timestamps: Date[]): {
    trend: number;
    seasonality: string;
    volatility: number;
    anomalies: number[];
    forecast: number[];
  } {
    const trend = this.calculateTrend(values);
    const volatility = this.calculateVolatility(values);
    const anomalies = this.detectAnomalies(values);
    
    // Simple moving average forecast for next 7 periods
    const forecast = this.generateForecast(values, 7);
    
    // Enhanced seasonality detection
    const seasonality = this.detectSeasonalityPatterns(values, timestamps);
    
    return { trend, seasonality, volatility, anomalies, forecast };
  }

  private generateForecast(values: number[], periods: number): number[] {
    if (values.length < 3) return [];
    
    const trend = this.calculateTrend(values);
    const lastValue = values[values.length - 1];
    const forecast = [];
    
    for (let i = 1; i <= periods; i++) {
      forecast.push(Math.max(0, lastValue + (trend * i)));
    }
    
    return forecast;
  }

  private detectSeasonalityPatterns(values: number[], timestamps: Date[]): string {
    if (values.length < 14) return 'insufficient_data';
    
    // Detect daily patterns (hourly data)
    const hourlyPatterns = this.analyzeHourlyPatterns(values, timestamps);
    
    // Detect weekly patterns
    const weeklyPatterns = this.analyzeWeeklyPatterns(values, timestamps);
    
    if (hourlyPatterns.strength > 0.3) return 'daily';
    if (weeklyPatterns.strength > 0.3) return 'weekly';
    
    return 'random';
  }

  private analyzeHourlyPatterns(values: number[], timestamps: Date[]): { strength: number } {
    // Group by hour of day
    const hourlyBuckets = new Array(24).fill(0).map(() => []);
    
    timestamps.forEach((timestamp, index) => {
      const hour = timestamp.getHours();
      hourlyBuckets[hour].push(values[index]);
    });
    
    // Calculate variance between hours vs within hours
    const hourlyAverages = hourlyBuckets.map(bucket => 
      bucket.length > 0 ? bucket.reduce((a, b) => a + b, 0) / bucket.length : 0
    );
    
    const overallMean = values.reduce((a, b) => a + b, 0) / values.length;
    const betweenHourVariance = hourlyAverages.reduce((sum, avg) => 
      sum + Math.pow(avg - overallMean, 2), 0) / 24;
    
    const totalVariance = values.reduce((sum, val) => 
      sum + Math.pow(val - overallMean, 2), 0) / values.length;
    
    return { strength: betweenHourVariance / (totalVariance || 1) };
  }

  private analyzeWeeklyPatterns(values: number[], timestamps: Date[]): { strength: number } {
    // Group by day of week
    const weeklyBuckets = new Array(7).fill(0).map(() => []);
    
    timestamps.forEach((timestamp, index) => {
      const dayOfWeek = timestamp.getDay();
      weeklyBuckets[dayOfWeek].push(values[index]);
    });
    
    const weeklyAverages = weeklyBuckets.map(bucket => 
      bucket.length > 0 ? bucket.reduce((a, b) => a + b, 0) / bucket.length : 0
    );
    
    const overallMean = values.reduce((a, b) => a + b, 0) / values.length;
    const betweenDayVariance = weeklyAverages.reduce((sum, avg) => 
      sum + Math.pow(avg - overallMean, 2), 0) / 7;
    
    const totalVariance = values.reduce((sum, val) => 
      sum + Math.pow(val - overallMean, 2), 0) / values.length;
    
    return { strength: betweenDayVariance / (totalVariance || 1) };
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