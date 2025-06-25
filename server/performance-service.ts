import { storage } from "./storage";

export interface PerformanceBaseline {
  device_id: string;
  metric_type: "cpu" | "memory" | "disk" | "network";
  baseline_value: number;
  variance_threshold: number;
  measurement_period: string;
  created_at: Date;
  updated_at: Date;
}

export interface PerformanceAnomaly {
  device_id: string;
  metric_type: string;
  current_value: number;
  baseline_value: number;
  deviation_percentage: number;
  severity: "low" | "medium" | "high";
  detected_at: Date;
}

export interface ResourcePrediction {
  device_id: string;
  resource_type: "cpu" | "memory" | "disk";
  current_usage_trend: number;
  predicted_capacity_date: Date;
  confidence_level: number;
  recommendation: string;
}

class PerformanceService {
  private baselines: Map<string, PerformanceBaseline[]> = new Map();

  async updateBaselines(deviceId: string, metrics: any): Promise<void> {
    const deviceBaselines = this.baselines.get(deviceId) || [];

    // CPU baseline
    if (metrics.cpu_usage !== null) {
      await this.updateMetricBaseline(deviceId, "cpu", parseFloat(metrics.cpu_usage), deviceBaselines);
    }

    // Memory baseline
    if (metrics.memory_usage !== null) {
      await this.updateMetricBaseline(deviceId, "memory", parseFloat(metrics.memory_usage), deviceBaselines);
    }

    // Disk baseline
    if (metrics.disk_usage !== null) {
      await this.updateMetricBaseline(deviceId, "disk", parseFloat(metrics.disk_usage), deviceBaselines);
    }

    this.baselines.set(deviceId, deviceBaselines);
  }

  private async updateMetricBaseline(
    deviceId: string, 
    metricType: "cpu" | "memory" | "disk" | "network", 
    currentValue: number, 
    baselines: PerformanceBaseline[]
  ): Promise<void> {
    let baseline = baselines.find(b => b.metric_type === metricType);

    if (!baseline) {
      baseline = {
        device_id: deviceId,
        metric_type: metricType,
        baseline_value: currentValue,
        variance_threshold: this.getDefaultThreshold(metricType),
        measurement_period: "7d",
        created_at: new Date(),
        updated_at: new Date()
      };
      baselines.push(baseline);
    } else {
      // Moving average with 20% weight for new value
      baseline.baseline_value = (baseline.baseline_value * 0.8) + (currentValue * 0.2);
      baseline.updated_at = new Date();
    }

    // Check for anomalies
    await this.checkForAnomalies(deviceId, metricType, currentValue, baseline);
  }

  private getDefaultThreshold(metricType: string): number {
    switch (metricType) {
      case "cpu": return 25; // 25% deviation
      case "memory": return 20; // 20% deviation
      case "disk": return 15; // 15% deviation
      case "network": return 50; // 50% deviation
      default: return 30;
    }
  }

  private async checkForAnomalies(
    deviceId: string, 
    metricType: string, 
    currentValue: number, 
    baseline: PerformanceBaseline
  ): Promise<void> {
    const deviationPercentage = Math.abs((currentValue - baseline.baseline_value) / baseline.baseline_value) * 100;

    if (deviationPercentage > baseline.variance_threshold) {
      const severity = deviationPercentage > 50 ? "high" : deviationPercentage > 30 ? "medium" : "low";

      const anomaly: PerformanceAnomaly = {
        device_id: deviceId,
        metric_type: metricType,
        current_value: currentValue,
        baseline_value: baseline.baseline_value,
        deviation_percentage: deviationPercentage,
        severity: severity,
        detected_at: new Date()
      };

      await storage.createAlert({
        device_id: deviceId,
        category: "performance",
        severity: severity,
        message: `Performance anomaly detected: ${metricType} usage (${currentValue.toFixed(1)}%) deviates ${deviationPercentage.toFixed(1)}% from baseline`,
        metadata: {
          anomaly: anomaly,
          metric_type: metricType,
          baseline_value: baseline.baseline_value,
          current_value: currentValue,
          deviation_percentage: deviationPercentage
        },
        is_active: true
      });
    }
  }

  async generateResourcePredictions(deviceId: string): Promise<ResourcePrediction[]> {
    try {
      console.log(`Generating resource predictions for device: ${deviceId}`);

    const predictions: ResourcePrediction[] = [];

    // Get historical data for the last 30 days
    const reports = await storage.getRecentDeviceReports(deviceId, 30);
    const recentReports = reports; // Already limited to recent reports

    if (recentReports.length < 7) {
      return predictions; // Need at least a week of data
    }

    // Analyze trends for each resource
    const resources = ["cpu", "memory", "disk"];

    for (const resource of resources) {
      const values = recentReports
        .map(r => parseFloat(r[`${resource}_usage`] || "0"))
        .filter(v => !isNaN(v));

      if (values.length < 5) continue;

      const trend = this.calculateTrend(values);

      if (trend > 0.1) { // Increasing trend > 0.1% per day
        const currentAvg = values.slice(-7).reduce((a, b) => a + b, 0) / 7;
        const daysToCapacity = (95 - currentAvg) / trend;

        if (daysToCapacity > 0 && daysToCapacity < 365) {
          predictions.push({
            device_id: deviceId,
            resource_type: resource as "cpu" | "memory" | "disk",
            current_usage_trend: trend,
            predicted_capacity_date: new Date(Date.now() + daysToCapacity * 24 * 60 * 60 * 1000),
            confidence_level: Math.min(0.9, values.length / 30),
            recommendation: this.getResourceRecommendation(resource, daysToCapacity)
          });
        }
      }
    }

    return predictions;
    } catch (error) {
      console.error("Error in generateResourcePredictions:", error);
      return [];
    }
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    // Simple linear regression to find trend
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private getResourceRecommendation(resource: string, daysToCapacity: number): string {
    if (daysToCapacity < 30) {
      return `Urgent: ${resource} capacity will be reached in ${Math.round(daysToCapacity)} days. Immediate action required.`;
    } else if (daysToCapacity < 90) {
      return `Warning: ${resource} capacity will be reached in ${Math.round(daysToCapacity)} days. Plan for upgrade.`;
    } else {
      return `Monitor: ${resource} trending upward. Consider planning for future expansion.`;
    }
  }

  async getApplicationPerformanceInsights(deviceId: string): Promise<any> {
    try {
      const reports = await storage.getRecentDeviceReports(deviceId, 1);
      const recentReport = reports[0];

      if (!recentReport?.raw_data) {
        return null;
      }

      const rawData = JSON.parse(recentReport.raw_data);
      const processes = rawData.processes || [];

      // Analyze top resource consumers
      const topCPUProcesses = processes
        .filter(p => p.cpu_percent > 0)
        .sort((a, b) => b.cpu_percent - a.cpu_percent)
        .slice(0, 10);

      const topMemoryProcesses = processes
        .filter(p => p.memory_percent > 0)
        .sort((a, b) => b.memory_percent - a.memory_percent)
        .slice(0, 10);

      const insights = {
        device_id: deviceId,
        timestamp: new Date(),
        top_cpu_consumers: topCPUProcesses,
        top_memory_consumers: topMemoryProcesses,
        total_processes: processes.length,
        system_load_analysis: {
          high_cpu_processes: topCPUProcesses.filter(p => p.cpu_percent > 10).length,
          high_memory_processes: topMemoryProcesses.filter(p => p.memory_percent > 5).length
        }
      };
      console.log(`Returning performance insights for device ${deviceId}`);
    return insights;
    } catch (error) {
      console.error("Error in getApplicationPerformanceInsights:", error);
      return {
        top_cpu_consumers: [],
        top_memory_consumers: [],
        total_processes: 0,
        system_load_analysis: {
          high_cpu_processes: 0,
          high_memory_processes: 0
        }
      };
    }
  }
}

export const performanceService = new PerformanceService();