
import { storage } from "../storage";

export interface DetailedPerformanceMetrics {
  timestamp: Date;
  device_id: string;
  
  // System Performance
  cpu_metrics: {
    usage_percent: number;
    load_average_1m: number;
    load_average_5m: number;
    load_average_15m: number;
    core_count: number;
    frequency_ghz: number;
    temperature_celsius?: number;
  };
  
  memory_metrics: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    usage_percent: number;
    swap_total_gb: number;
    swap_used_gb: number;
    buffer_cache_gb: number;
  };
  
  disk_metrics: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    usage_percent: number;
    read_iops: number;
    write_iops: number;
    read_throughput_mbps: number;
    write_throughput_mbps: number;
    response_time_ms: number;
  };
  
  network_metrics: {
    interfaces: Array<{
      name: string;
      rx_bytes_per_sec: number;
      tx_bytes_per_sec: number;
      rx_packets_per_sec: number;
      tx_packets_per_sec: number;
      errors_per_sec: number;
      dropped_per_sec: number;
    }>;
    total_rx_mbps: number;
    total_tx_mbps: number;
    latency_ms?: number;
    packet_loss_percent?: number;
  };
  
  // Application Performance
  process_metrics: {
    total_processes: number;
    running_processes: number;
    sleeping_processes: number;
    zombie_processes: number;
    top_cpu_processes: Array<{
      name: string;
      pid: number;
      cpu_percent: number;
      memory_mb: number;
    }>;
    top_memory_processes: Array<{
      name: string;
      pid: number;
      cpu_percent: number;
      memory_mb: number;
    }>;
  };
  
  // System Health
  health_metrics: {
    uptime_hours: number;
    boot_time: Date;
    last_reboot_reason?: string;
    critical_services_status: Array<{
      name: string;
      status: 'running' | 'stopped' | 'failed';
      memory_mb: number;
      cpu_percent: number;
    }>;
    system_errors: Array<{
      timestamp: Date;
      level: 'warning' | 'error' | 'critical';
      message: string;
      source: string;
    }>;
  };
  
  // Security Metrics
  security_metrics: {
    firewall_status: 'enabled' | 'disabled' | 'unknown';
    antivirus_status: 'active' | 'inactive' | 'unknown';
    last_security_scan?: Date;
    failed_login_attempts: number;
    open_ports: Array<{
      port: number;
      protocol: 'tcp' | 'udp';
      service: string;
      state: 'listening' | 'established' | 'time_wait';
    }>;
    pending_updates: number;
    critical_updates: number;
  };
}

export interface PerformanceAlert {
  id: string;
  device_id: string;
  metric_type: string;
  alert_type: 'threshold' | 'anomaly' | 'trend' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  current_value: number;
  threshold_value?: number;
  trend_direction?: 'increasing' | 'decreasing' | 'stable';
  trend_rate?: number;
  message: string;
  recommendation: string;
  triggered_at: Date;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: Date;
  resolved: boolean;
  resolved_at?: Date;
  metadata: Record<string, any>;
}

export interface PerformanceTrend {
  device_id: string;
  metric_name: string;
  time_period: '1h' | '24h' | '7d' | '30d';
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  trend_rate: number; // percentage change per hour
  confidence_score: number; // 0-1
  prediction_next_24h: number;
  recommendation: string;
  last_calculated: Date;
}

class AdvancedMonitoringService {
  private performanceHistory: Map<string, DetailedPerformanceMetrics[]> = new Map();
  private alertThresholds: Map<string, any> = new Map();
  private trendAnalysis: Map<string, PerformanceTrend[]> = new Map();

  constructor() {
    this.initializeDefaultThresholds();
    this.startPerformanceAnalysis();
  }

  private initializeDefaultThresholds() {
    this.alertThresholds.set('default', {
      cpu_critical: 90,
      cpu_high: 80,
      cpu_medium: 70,
      memory_critical: 95,
      memory_high: 85,
      memory_medium: 75,
      disk_critical: 95,
      disk_high: 85,
      disk_medium: 75,
      disk_iops_high: 1000,
      network_high_mbps: 100,
      response_time_high_ms: 1000,
      process_count_high: 300,
      uptime_low_hours: 1,
    });
  }

  async processDetailedMetrics(deviceId: string, metrics: any): Promise<void> {
    try {
      const detailedMetrics = this.parseDetailedMetrics(deviceId, metrics);
      
      // Store metrics
      await this.storeDetailedMetrics(detailedMetrics);
      
      // Update performance history
      this.updatePerformanceHistory(deviceId, detailedMetrics);
      
      // Analyze for alerts
      await this.analyzeForAlerts(detailedMetrics);
      
      // Update trend analysis
      await this.updateTrendAnalysis(deviceId, detailedMetrics);
      
      // Check for availability issues
      await this.checkAvailability(deviceId, detailedMetrics);
      
    } catch (error) {
      console.error(`Error processing detailed metrics for device ${deviceId}:`, error);
    }
  }

  private parseDetailedMetrics(deviceId: string, rawMetrics: any): DetailedPerformanceMetrics {
    const now = new Date();
    
    return {
      timestamp: now,
      device_id: deviceId,
      
      cpu_metrics: {
        usage_percent: parseFloat(rawMetrics.cpu_usage || '0'),
        load_average_1m: parseFloat(rawMetrics.system_load?.load_1min || '0'),
        load_average_5m: parseFloat(rawMetrics.system_load?.load_5min || '0'),
        load_average_15m: parseFloat(rawMetrics.system_load?.load_15min || '0'),
        core_count: parseInt(rawMetrics.cpu_cores || '1'),
        frequency_ghz: parseFloat(rawMetrics.cpu_frequency || '0'),
        temperature_celsius: rawMetrics.cpu_temperature || undefined,
      },
      
      memory_metrics: {
        total_gb: parseFloat(rawMetrics.total_memory || '0') / (1024 ** 3),
        used_gb: parseFloat(rawMetrics.used_memory || '0') / (1024 ** 3),
        available_gb: parseFloat(rawMetrics.available_memory || '0') / (1024 ** 3),
        usage_percent: parseFloat(rawMetrics.memory_usage || '0'),
        swap_total_gb: parseFloat(rawMetrics.swap_total || '0') / (1024 ** 3),
        swap_used_gb: parseFloat(rawMetrics.swap_used || '0') / (1024 ** 3),
        buffer_cache_gb: parseFloat(rawMetrics.buffer_cache || '0') / (1024 ** 3),
      },
      
      disk_metrics: {
        total_gb: parseFloat(rawMetrics.total_disk || '0') / (1024 ** 3),
        used_gb: parseFloat(rawMetrics.used_disk || '0') / (1024 ** 3),
        free_gb: parseFloat(rawMetrics.free_disk || '0') / (1024 ** 3),
        usage_percent: parseFloat(rawMetrics.disk_usage || '0'),
        read_iops: parseInt(rawMetrics.disk_read_iops || '0'),
        write_iops: parseInt(rawMetrics.disk_write_iops || '0'),
        read_throughput_mbps: parseFloat(rawMetrics.disk_read_mbps || '0'),
        write_throughput_mbps: parseFloat(rawMetrics.disk_write_mbps || '0'),
        response_time_ms: parseFloat(rawMetrics.disk_response_ms || '0'),
      },
      
      network_metrics: {
        interfaces: this.parseNetworkInterfaces(rawMetrics.network_interfaces || []),
        total_rx_mbps: parseFloat(rawMetrics.network_rx_mbps || '0'),
        total_tx_mbps: parseFloat(rawMetrics.network_tx_mbps || '0'),
        latency_ms: rawMetrics.network_latency_ms || undefined,
        packet_loss_percent: rawMetrics.packet_loss_percent || undefined,
      },
      
      process_metrics: {
        total_processes: parseInt(rawMetrics.process_count || '0'),
        running_processes: parseInt(rawMetrics.running_processes || '0'),
        sleeping_processes: parseInt(rawMetrics.sleeping_processes || '0'),
        zombie_processes: parseInt(rawMetrics.zombie_processes || '0'),
        top_cpu_processes: this.parseTopProcesses(rawMetrics.top_cpu_processes || []),
        top_memory_processes: this.parseTopProcesses(rawMetrics.top_memory_processes || []),
      },
      
      health_metrics: {
        uptime_hours: parseFloat(rawMetrics.uptime_hours || '0'),
        boot_time: rawMetrics.boot_time ? new Date(rawMetrics.boot_time) : new Date(),
        last_reboot_reason: rawMetrics.last_reboot_reason || undefined,
        critical_services_status: this.parseServicesStatus(rawMetrics.services || []),
        system_errors: this.parseSystemErrors(rawMetrics.system_errors || []),
      },
      
      security_metrics: {
        firewall_status: rawMetrics.firewall_status || 'unknown',
        antivirus_status: rawMetrics.antivirus_status || 'unknown',
        last_security_scan: rawMetrics.last_security_scan ? new Date(rawMetrics.last_security_scan) : undefined,
        failed_login_attempts: parseInt(rawMetrics.failed_logins || '0'),
        open_ports: this.parseOpenPorts(rawMetrics.open_ports || []),
        pending_updates: parseInt(rawMetrics.pending_updates || '0'),
        critical_updates: parseInt(rawMetrics.critical_updates || '0'),
      },
    };
  }

  private parseNetworkInterfaces(interfaces: any[]): Array<any> {
    return interfaces.map(iface => ({
      name: iface.name || 'unknown',
      rx_bytes_per_sec: parseFloat(iface.rx_bytes_per_sec || '0'),
      tx_bytes_per_sec: parseFloat(iface.tx_bytes_per_sec || '0'),
      rx_packets_per_sec: parseFloat(iface.rx_packets_per_sec || '0'),
      tx_packets_per_sec: parseFloat(iface.tx_packets_per_sec || '0'),
      errors_per_sec: parseFloat(iface.errors_per_sec || '0'),
      dropped_per_sec: parseFloat(iface.dropped_per_sec || '0'),
    }));
  }

  private parseTopProcesses(processes: any[]): Array<any> {
    return processes.slice(0, 10).map(proc => ({
      name: proc.name || 'unknown',
      pid: parseInt(proc.pid || '0'),
      cpu_percent: parseFloat(proc.cpu_percent || '0'),
      memory_mb: parseFloat(proc.memory_mb || '0'),
    }));
  }

  private parseServicesStatus(services: any[]): Array<any> {
    return services.map(service => ({
      name: service.name || 'unknown',
      status: service.status || 'unknown',
      memory_mb: parseFloat(service.memory_mb || '0'),
      cpu_percent: parseFloat(service.cpu_percent || '0'),
    }));
  }

  private parseSystemErrors(errors: any[]): Array<any> {
    return errors.slice(0, 50).map(error => ({
      timestamp: error.timestamp ? new Date(error.timestamp) : new Date(),
      level: error.level || 'warning',
      message: error.message || 'Unknown error',
      source: error.source || 'system',
    }));
  }

  private parseOpenPorts(ports: any[]): Array<any> {
    return ports.map(port => ({
      port: parseInt(port.port || '0'),
      protocol: port.protocol || 'tcp',
      service: port.service || 'unknown',
      state: port.state || 'listening',
    }));
  }

  private async storeDetailedMetrics(metrics: DetailedPerformanceMetrics): Promise<void> {
    try {
      // Store in database with proper indexing for time-series queries
      const { pool } = await import("../db");
      
      await pool.query(`
        INSERT INTO detailed_performance_metrics (
          device_id, timestamp, cpu_metrics, memory_metrics, disk_metrics,
          network_metrics, process_metrics, health_metrics, security_metrics
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        metrics.device_id,
        metrics.timestamp,
        JSON.stringify(metrics.cpu_metrics),
        JSON.stringify(metrics.memory_metrics),
        JSON.stringify(metrics.disk_metrics),
        JSON.stringify(metrics.network_metrics),
        JSON.stringify(metrics.process_metrics),
        JSON.stringify(metrics.health_metrics),
        JSON.stringify(metrics.security_metrics),
      ]);
      
    } catch (error) {
      console.error('Error storing detailed metrics:', error);
    }
  }

  private updatePerformanceHistory(deviceId: string, metrics: DetailedPerformanceMetrics): void {
    const history = this.performanceHistory.get(deviceId) || [];
    history.push(metrics);
    
    // Keep only last 24 hours of data in memory
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filteredHistory = history.filter(m => m.timestamp > cutoff);
    
    this.performanceHistory.set(deviceId, filteredHistory);
  }

  private async analyzeForAlerts(metrics: DetailedPerformanceMetrics): Promise<void> {
    const thresholds = this.alertThresholds.get(metrics.device_id) || this.alertThresholds.get('default');
    const alerts: PerformanceAlert[] = [];

    // CPU Analysis
    if (metrics.cpu_metrics.usage_percent > thresholds.cpu_critical) {
      alerts.push(this.createAlert(metrics, 'cpu_usage', 'critical', 
        `CPU usage critically high at ${metrics.cpu_metrics.usage_percent.toFixed(1)}%`,
        'Consider terminating non-essential processes or adding CPU resources'));
    } else if (metrics.cpu_metrics.usage_percent > thresholds.cpu_high) {
      alerts.push(this.createAlert(metrics, 'cpu_usage', 'high',
        `CPU usage high at ${metrics.cpu_metrics.usage_percent.toFixed(1)}%`,
        'Monitor closely and consider process optimization'));
    }

    // Memory Analysis
    if (metrics.memory_metrics.usage_percent > thresholds.memory_critical) {
      alerts.push(this.createAlert(metrics, 'memory_usage', 'critical',
        `Memory usage critically high at ${metrics.memory_metrics.usage_percent.toFixed(1)}%`,
        'Free up memory immediately or add more RAM'));
    }

    // Disk Analysis
    if (metrics.disk_metrics.usage_percent > thresholds.disk_critical) {
      alerts.push(this.createAlert(metrics, 'disk_usage', 'critical',
        `Disk usage critically high at ${metrics.disk_metrics.usage_percent.toFixed(1)}%`,
        'Clean up disk space immediately or add storage'));
    }

    // Process Analysis
    if (metrics.process_metrics.zombie_processes > 10) {
      alerts.push(this.createAlert(metrics, 'zombie_processes', 'medium',
        `High number of zombie processes: ${metrics.process_metrics.zombie_processes}`,
        'Investigate parent processes and consider system restart'));
    }

    // Security Analysis
    if (metrics.security_metrics.failed_login_attempts > 50) {
      alerts.push(this.createAlert(metrics, 'security_threat', 'high',
        `High number of failed login attempts: ${metrics.security_metrics.failed_login_attempts}`,
        'Investigate potential security breach and consider IP blocking'));
    }

    // Store alerts
    for (const alert of alerts) {
      await this.storeAlert(alert);
    }
  }

  private createAlert(
    metrics: DetailedPerformanceMetrics, 
    type: string, 
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    recommendation: string
  ): PerformanceAlert {
    return {
      id: `${metrics.device_id}_${type}_${Date.now()}`,
      device_id: metrics.device_id,
      metric_type: type,
      alert_type: 'threshold',
      severity,
      current_value: this.extractMetricValue(metrics, type),
      message,
      recommendation,
      triggered_at: metrics.timestamp,
      acknowledged: false,
      resolved: false,
      metadata: {
        full_metrics: metrics,
      },
    };
  }

  private extractMetricValue(metrics: DetailedPerformanceMetrics, type: string): number {
    switch (type) {
      case 'cpu_usage': return metrics.cpu_metrics.usage_percent;
      case 'memory_usage': return metrics.memory_metrics.usage_percent;
      case 'disk_usage': return metrics.disk_metrics.usage_percent;
      case 'zombie_processes': return metrics.process_metrics.zombie_processes;
      case 'security_threat': return metrics.security_metrics.failed_login_attempts;
      default: return 0;
    }
  }

  private async storeAlert(alert: PerformanceAlert): Promise<void> {
    try {
      await storage.createAlert({
        device_id: alert.device_id,
        category: 'performance_advanced',
        severity: alert.severity,
        message: alert.message,
        metadata: {
          ...alert.metadata,
          metric_type: alert.metric_type,
          alert_type: alert.alert_type,
          current_value: alert.current_value,
          recommendation: alert.recommendation,
          alert_id: alert.id,
        },
        is_active: true,
      });
    } catch (error) {
      console.error('Error storing advanced performance alert:', error);
    }
  }

  private async updateTrendAnalysis(deviceId: string, metrics: DetailedPerformanceMetrics): Promise<void> {
    const history = this.performanceHistory.get(deviceId) || [];
    if (history.length < 10) return; // Need enough data for trend analysis

    const trends: PerformanceTrend[] = [];

    // Analyze CPU trend
    const cpuTrend = this.calculateTrend(
      history.map(h => h.cpu_metrics.usage_percent),
      'cpu_usage'
    );
    if (cpuTrend) {
      trends.push({
        device_id: deviceId,
        metric_name: 'cpu_usage',
        time_period: '24h',
        ...cpuTrend,
        last_calculated: new Date(),
      });
    }

    // Analyze Memory trend
    const memoryTrend = this.calculateTrend(
      history.map(h => h.memory_metrics.usage_percent),
      'memory_usage'
    );
    if (memoryTrend) {
      trends.push({
        device_id: deviceId,
        metric_name: 'memory_usage',
        time_period: '24h',
        ...memoryTrend,
        last_calculated: new Date(),
      });
    }

    // Store trends
    this.trendAnalysis.set(deviceId, trends);
  }

  private calculateTrend(values: number[], metricName: string) {
    if (values.length < 5) return null;

    // Simple linear regression for trend
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const trend_direction = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
    const trend_rate = Math.abs(slope);
    const confidence_score = Math.min(1, values.length / 20); // More data = higher confidence

    // Predict next 24h value
    const prediction_next_24h = intercept + slope * n;

    let recommendation = '';
    if (trend_direction === 'increasing' && trend_rate > 1) {
      recommendation = `${metricName} is increasing rapidly. Consider capacity planning.`;
    } else if (trend_direction === 'decreasing' && trend_rate > 1) {
      recommendation = `${metricName} is decreasing, which may indicate underutilization or issues.`;
    } else {
      recommendation = `${metricName} trend is stable.`;
    }

    return {
      trend_direction,
      trend_rate,
      confidence_score,
      prediction_next_24h,
      recommendation,
    };
  }

  private async checkAvailability(deviceId: string, metrics: DetailedPerformanceMetrics): Promise<void> {
    // Check if device is becoming unresponsive
    const criticalChecks = [
      metrics.cpu_metrics.usage_percent > 95,
      metrics.memory_metrics.usage_percent > 98,
      metrics.disk_metrics.usage_percent > 99,
      metrics.health_metrics.uptime_hours < 1, // Recent restart
    ];

    const criticalIssues = criticalChecks.filter(check => check).length;

    if (criticalIssues >= 2) {
      await this.storeAlert({
        id: `${deviceId}_availability_${Date.now()}`,
        device_id: deviceId,
        metric_type: 'availability',
        alert_type: 'availability',
        severity: 'critical',
        current_value: criticalIssues,
        message: `Device may become unresponsive - ${criticalIssues} critical issues detected`,
        recommendation: 'Immediate intervention required to prevent system failure',
        triggered_at: metrics.timestamp,
        acknowledged: false,
        resolved: false,
        metadata: {
          critical_issues: criticalIssues,
          metrics_snapshot: metrics,
        },
      });
    }
  }

  private startPerformanceAnalysis(): void {
    // Run advanced analysis every 5 minutes
    setInterval(async () => {
      await this.runAdvancedAnalysis();
    }, 5 * 60 * 1000);
  }

  private async runAdvancedAnalysis(): Promise<void> {
    console.log('🔍 Running advanced performance analysis...');
    
    try {
      const devices = this.performanceHistory.keys();
      
      for (const deviceId of devices) {
        await this.analyzeDeviceHealth(deviceId);
        await this.predictPerformanceIssues(deviceId);
        await this.optimizeResourceAllocation(deviceId);
      }
      
      console.log('✅ Advanced performance analysis completed');
    } catch (error) {
      console.error('Error in advanced performance analysis:', error);
    }
  }

  private async analyzeDeviceHealth(deviceId: string): Promise<void> {
    const history = this.performanceHistory.get(deviceId);
    if (!history || history.length < 5) return;

    const latest = history[history.length - 1];
    const healthScore = this.calculateHealthScore(latest);

    if (healthScore < 60) {
      await this.storeAlert({
        id: `${deviceId}_health_${Date.now()}`,
        device_id: deviceId,
        metric_type: 'system_health',
        alert_type: 'trend',
        severity: healthScore < 30 ? 'critical' : 'high',
        current_value: healthScore,
        message: `System health score is low: ${healthScore}/100`,
        recommendation: this.getHealthRecommendation(latest),
        triggered_at: latest.timestamp,
        acknowledged: false,
        resolved: false,
        metadata: { health_score: healthScore, metrics: latest },
      });
    }
  }

  private calculateHealthScore(metrics: DetailedPerformanceMetrics): number {
    let score = 100;

    // CPU health (30% weight)
    if (metrics.cpu_metrics.usage_percent > 80) score -= 20;
    else if (metrics.cpu_metrics.usage_percent > 60) score -= 10;

    // Memory health (25% weight)
    if (metrics.memory_metrics.usage_percent > 85) score -= 20;
    else if (metrics.memory_metrics.usage_percent > 70) score -= 10;

    // Disk health (20% weight)
    if (metrics.disk_metrics.usage_percent > 90) score -= 15;
    else if (metrics.disk_metrics.usage_percent > 80) score -= 8;

    // Process health (15% weight)
    if (metrics.process_metrics.zombie_processes > 10) score -= 10;
    if (metrics.process_metrics.total_processes > 300) score -= 5;

    // Security health (10% weight)
    if (metrics.security_metrics.firewall_status !== 'enabled') score -= 5;
    if (metrics.security_metrics.critical_updates > 0) score -= 5;

    return Math.max(0, score);
  }

  private getHealthRecommendation(metrics: DetailedPerformanceMetrics): string {
    const issues = [];
    
    if (metrics.cpu_metrics.usage_percent > 80) {
      issues.push('High CPU usage - consider process optimization');
    }
    if (metrics.memory_metrics.usage_percent > 85) {
      issues.push('High memory usage - consider adding RAM');
    }
    if (metrics.disk_metrics.usage_percent > 90) {
      issues.push('Low disk space - clean up files');
    }
    if (metrics.security_metrics.critical_updates > 0) {
      issues.push('Critical updates pending - schedule maintenance');
    }

    return issues.join('; ') || 'Monitor system closely';
  }

  private async predictPerformanceIssues(deviceId: string): Promise<void> {
    const trends = this.trendAnalysis.get(deviceId) || [];
    
    for (const trend of trends) {
      if (trend.trend_direction === 'increasing' && trend.confidence_score > 0.7) {
        const hoursToThreshold = this.calculateTimeToThreshold(trend);
        
        if (hoursToThreshold > 0 && hoursToThreshold < 48) {
          await this.storeAlert({
            id: `${deviceId}_prediction_${trend.metric_name}_${Date.now()}`,
            device_id: deviceId,
            metric_type: `predicted_${trend.metric_name}`,
            alert_type: 'trend',
            severity: hoursToThreshold < 12 ? 'high' : 'medium',
            current_value: trend.prediction_next_24h,
            message: `${trend.metric_name} predicted to reach critical levels in ${hoursToThreshold.toFixed(1)} hours`,
            recommendation: `Take proactive action to prevent ${trend.metric_name} issues`,
            triggered_at: new Date(),
            acknowledged: false,
            resolved: false,
            metadata: { 
              trend,
              hours_to_threshold: hoursToThreshold,
              prediction_confidence: trend.confidence_score,
            },
          });
        }
      }
    }
  }

  private calculateTimeToThreshold(trend: PerformanceTrend): number {
    const thresholdValues = {
      cpu_usage: 90,
      memory_usage: 90,
      disk_usage: 95,
    };

    const threshold = thresholdValues[trend.metric_name as keyof typeof thresholdValues] || 90;
    const currentValue = trend.prediction_next_24h - (trend.trend_rate * 24);
    
    if (trend.trend_rate <= 0) return -1; // Not increasing
    
    return (threshold - currentValue) / trend.trend_rate;
  }

  private async optimizeResourceAllocation(deviceId: string): Promise<void> {
    const history = this.performanceHistory.get(deviceId);
    if (!history || history.length < 10) return;

    const latest = history[history.length - 1];
    const recommendations = [];

    // CPU optimization
    if (latest.cpu_metrics.usage_percent < 20) {
      recommendations.push('CPU is underutilized - consider workload redistribution');
    }

    // Memory optimization
    if (latest.memory_metrics.usage_percent > 80 && latest.memory_metrics.buffer_cache_gb > 2) {
      recommendations.push('Consider memory optimization - large buffer cache detected');
    }

    // Disk optimization
    if (latest.disk_metrics.read_iops > 500 && latest.disk_metrics.response_time_ms > 100) {
      recommendations.push('Disk performance bottleneck - consider SSD upgrade or optimization');
    }

    if (recommendations.length > 0) {
      await this.storeAlert({
        id: `${deviceId}_optimization_${Date.now()}`,
        device_id: deviceId,
        metric_type: 'optimization',
        alert_type: 'trend',
        severity: 'low',
        current_value: recommendations.length,
        message: 'Performance optimization opportunities detected',
        recommendation: recommendations.join('; '),
        triggered_at: latest.timestamp,
        acknowledged: false,
        resolved: false,
        metadata: { 
          optimization_recommendations: recommendations,
          metrics: latest,
        },
      });
    }
  }

  // Public API methods
  async getDetailedMetrics(deviceId: string, timeRange: string = '24h'): Promise<DetailedPerformanceMetrics[]> {
    try {
      const { pool } = await import("../db");
      
      const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      
      const result = await pool.query(`
        SELECT * FROM detailed_performance_metrics 
        WHERE device_id = $1 AND timestamp > NOW() - INTERVAL '${hours} hours'
        ORDER BY timestamp DESC
      `, [deviceId]);

      return result.rows.map(row => ({
        ...row,
        cpu_metrics: JSON.parse(row.cpu_metrics),
        memory_metrics: JSON.parse(row.memory_metrics),
        disk_metrics: JSON.parse(row.disk_metrics),
        network_metrics: JSON.parse(row.network_metrics),
        process_metrics: JSON.parse(row.process_metrics),
        health_metrics: JSON.parse(row.health_metrics),
        security_metrics: JSON.parse(row.security_metrics),
      }));
    } catch (error) {
      console.error('Error getting detailed metrics:', error);
      return [];
    }
  }

  async getPerformanceTrends(deviceId: string): Promise<PerformanceTrend[]> {
    return this.trendAnalysis.get(deviceId) || [];
  }

  async getHealthScore(deviceId: string): Promise<number> {
    const history = this.performanceHistory.get(deviceId);
    if (!history || history.length === 0) return 0;
    
    const latest = history[history.length - 1];
    return this.calculateHealthScore(latest);
  }
}

export const advancedMonitoringService = new AdvancedMonitoringService();
