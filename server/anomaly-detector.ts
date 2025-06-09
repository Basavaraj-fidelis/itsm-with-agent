
import { storage } from "./storage";

interface BaselineMetrics {
  deviceId: string;
  avgCpuUsage: number;
  avgMemoryUsage: number;
  avgDiskUsage: number;
  stdDevCpu: number;
  stdDevMemory: number;
  stdDevDisk: number;
  lastCalculated: Date;
}

export class AnomalyDetector {
  private baselines: Map<string, BaselineMetrics> = new Map();

  async calculateBaselines() {
    const devices = await storage.getDevices();
    
    for (const device of devices) {
      const reports = await storage.getDeviceReports(device.id);
      
      if (reports.length < 10) continue; // Need at least 10 data points
      
      const recentReports = reports.slice(0, 100); // Last 100 reports
      
      const cpuValues = recentReports
        .map(r => parseFloat(r.cpu_usage || '0'))
        .filter(v => !isNaN(v));
      
      const memoryValues = recentReports
        .map(r => parseFloat(r.memory_usage || '0'))
        .filter(v => !isNaN(v));
      
      const diskValues = recentReports
        .map(r => parseFloat(r.disk_usage || '0'))
        .filter(v => !isNaN(v));

      if (cpuValues.length > 0) {
        const baseline: BaselineMetrics = {
          deviceId: device.id,
          avgCpuUsage: this.calculateMean(cpuValues),
          avgMemoryUsage: this.calculateMean(memoryValues),
          avgDiskUsage: this.calculateMean(diskValues),
          stdDevCpu: this.calculateStdDev(cpuValues),
          stdDevMemory: this.calculateStdDev(memoryValues),
          stdDevDisk: this.calculateStdDev(diskValues),
          lastCalculated: new Date()
        };
        
        this.baselines.set(device.id, baseline);
      }
    }
  }

  async detectAnomalies(deviceId: string, currentMetrics: {
    cpu: number;
    memory: number;
    disk: number;
  }) {
    const baseline = this.baselines.get(deviceId);
    if (!baseline) return [];

    const anomalies = [];
    const threshold = 2; // 2 standard deviations

    // CPU anomaly
    if (Math.abs(currentMetrics.cpu - baseline.avgCpuUsage) > threshold * baseline.stdDevCpu) {
      anomalies.push({
        type: 'cpu_anomaly',
        severity: 'warning',
        message: `CPU usage anomaly detected: ${currentMetrics.cpu.toFixed(1)}% (normal: ${baseline.avgCpuUsage.toFixed(1)}%)`,
        metadata: {
          current: currentMetrics.cpu,
          baseline: baseline.avgCpuUsage,
          deviation: Math.abs(currentMetrics.cpu - baseline.avgCpuUsage)
        }
      });
    }

    // Memory anomaly
    if (Math.abs(currentMetrics.memory - baseline.avgMemoryUsage) > threshold * baseline.stdDevMemory) {
      anomalies.push({
        type: 'memory_anomaly',
        severity: 'warning',
        message: `Memory usage anomaly detected: ${currentMetrics.memory.toFixed(1)}% (normal: ${baseline.avgMemoryUsage.toFixed(1)}%)`,
        metadata: {
          current: currentMetrics.memory,
          baseline: baseline.avgMemoryUsage,
          deviation: Math.abs(currentMetrics.memory - baseline.avgMemoryUsage)
        }
      });
    }

    return anomalies;
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStdDev(values: number[]): number {
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = this.calculateMean(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }
}

export const anomalyDetector = new AnomalyDetector();
