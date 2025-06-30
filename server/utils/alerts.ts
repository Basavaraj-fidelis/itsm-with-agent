import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { systemAlerts } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface Alert {
  id: string;
  device_id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
}

export class AlertUtils {
  /**
   * Create alert with standardized metadata
   */
  static createAlertData(
    deviceId: string,
    category: string,
    severity: string,
    message: string,
    metadata: any = {}
  ) {
    return {
      device_id: deviceId,
      category,
      severity,
      message,
      metadata: {
        ...metadata,
        created_at: new Date().toISOString(),
        source: "system"
      },
      is_active: true,
      triggered_at: new Date()
    };
  }

  /**
   * Determine alert severity based on metric value
   */
  static determineSeverity(
    value: number,
    thresholds: { critical: number; high: number; warning: number }
  ): string | null {
    if (value >= thresholds.critical) return "critical";
    if (value >= thresholds.high) return "high";
    if (value >= thresholds.warning) return "warning";
    return null;
  }

  /**
   * Build performance alert message
   */
  static buildPerformanceMessage(metric: string, value: number, severity: string): string {
    const metricDisplayNames = {
      cpu: "CPU",
      memory: "Memory",
      disk: "Disk",
      network: "Network"
    };

    const metricName = metricDisplayNames[metric as keyof typeof metricDisplayNames] || metric;
    const valueStr = value.toFixed(1);

    const severityMessages = {
      critical: `Critical ${metricName} usage: ${valueStr}% - Immediate attention required`,
      high: `High ${metricName} usage: ${valueStr}% - Performance degraded`,
      warning: `${metricName} usage elevated: ${valueStr}% - Monitor closely`
    };

    return severityMessages[severity as keyof typeof severityMessages] || 
           `${metricName} usage: ${valueStr}%`;
  }

  /**
   * Check if alert should be updated
   */
  static shouldUpdateAlert(
    existingAlert: any,
    newValue: number,
    newSeverity: string,
    updateThresholdMinutes: number = 30
  ): boolean {
    const lastValue = existingAlert.metadata?.[existingAlert.metadata?.metric + "_usage"] || 0;
    const valueChange = Math.abs(newValue - lastValue);

    const timeSinceLastUpdate = new Date().getTime() - 
      new Date(existingAlert.metadata?.last_updated || existingAlert.triggered_at).getTime();
    const minutesSinceUpdate = timeSinceLastUpdate / (1000 * 60);

    return (
      existingAlert.severity !== newSeverity || 
      valueChange > 3 || 
      minutesSinceUpdate > updateThresholdMinutes
    );
  }

  /**
   * Get standard performance thresholds
   */
  static getPerformanceThresholds(metric: string) {
    const thresholds = {
      cpu: { critical: 92, high: 88, warning: 85 },
      memory: { critical: 92, high: 88, warning: 85 },
      disk: { critical: 92, high: 88, warning: 85 },
      network: { critical: 1000000000, high: 500000000, warning: 100000000 } // bytes
    };

    return thresholds[metric as keyof typeof thresholds] || 
           { critical: 90, high: 80, warning: 70 };
  }

  /**
   * Build alert update metadata
   */
  static buildUpdateMetadata(
    existingMetadata: any,
    metric: string,
    value: number,
    threshold: number,
    previousValue?: number
  ) {
    return {
      ...existingMetadata,
      [metric + "_usage"]: value,
      threshold,
      metric,
      last_updated: new Date().toISOString(),
      previous_value: previousValue || existingMetadata?.[metric + "_usage"] || 0,
      value_change: previousValue ? Math.abs(value - previousValue).toFixed(1) : '0',
      update_reason: existingMetadata?.severity !== this.determineSeverity(value, this.getPerformanceThresholds(metric))
        ? 'severity_change' 
        : Math.abs(value - (previousValue || 0)) > 3 
        ? 'significant_change' 
        : 'periodic_update'
    };
  }

  /**
   * Create USB device alert data
   */
  static createUSBAlert(deviceId: string, usbDevices: any[]) {
    const message = `USB device(s) detected - ${usbDevices.length} device(s) connected`;

    return this.createAlertData(
      deviceId,
      "security",
      "info",
      message,
      {
        usb_count: usbDevices.length,
        devices: usbDevices.slice(0, 3), // First 3 devices for reference
        metric: "usb"
      }
    );
  }
}

export async function generateSystemAlerts(deviceData: any): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();

  // Get existing unread alerts for this device to avoid duplicates
  const existingAlerts = await db
    .select()
    .from(systemAlerts)
    .where(
      and(
        eq(systemAlerts.device_id, deviceData.id),
        eq(systemAlerts.is_read, false),
        eq(systemAlerts.resolved, false)
      )
    );

  const existingAlertTypes = new Set(
    existingAlerts.map(alert => `${alert.type}_${alert.title}`)
  );

  // CPU Usage Alert - only generate if no existing unread CPU alert
  if (deviceData.metrics?.cpu_usage > 80) {
    const alertKey = 'performance_High CPU Usage';
    if (!existingAlertTypes.has(alertKey)) {
      alerts.push({
        id: uuidv4(), // Ensure uuidv4 is used for generating IDs
        device_id: deviceData.id,
        type: 'performance',
        severity: deviceData.metrics.cpu_usage > 90 ? 'critical' : 'high',
        title: 'High CPU Usage',
        message: `CPU usage is at ${deviceData.metrics.cpu_usage}%`,
        timestamp: now,
        acknowledged: false,
        resolved: false
      });
    }
  }

  // Memory Usage Alert - only generate if no existing unread memory alert
  if (deviceData.metrics?.memory_usage > 85) {
    const alertKey = 'performance_High Memory Usage';
    if (!existingAlertTypes.has(alertKey)) {
      alerts.push({
        id: uuidv4(), // Ensure uuidv4 is used for generating IDs
        device_id: deviceData.id,
        type: 'performance',
        severity: deviceData.metrics.memory_usage > 95 ? 'critical' : 'high',
        title: 'High Memory Usage',
        message: `Memory usage is at ${deviceData.metrics.memory_usage}%`,
        timestamp: now,
        acknowledged: false,
        resolved: false
      });
    }
  }

  // Disk Usage Alert - only generate if no existing unread disk alert
  if (deviceData.metrics?.disk_usage > 80) {
    const alertKey = 'performance_High Disk Usage';
    if (!existingAlertTypes.has(alertKey)) {
      alerts.push({
        id: uuidv4(), // Ensure uuidv4 is used for generating IDs
        device_id: deviceData.id,
        type: 'performance',
        severity: deviceData.metrics.disk_usage > 90 ? 'critical' : 'high',
        title: 'High Disk Usage',
        message: `Disk usage is at ${deviceData.metrics.disk_usage}%`,
        timestamp: now,
        acknowledged: false,
        resolved: false
      });
    }
  }

  // Device Offline Alert - only generate if no existing unread offline alert
  if (deviceData.status === 'offline') {
    const alertKey = 'connectivity_Device Offline';
    if (!existingAlertTypes.has(alertKey)) {
      alerts.push({
        id: uuidv4(), // Ensure uuidv4 is used for generating IDs
        device_id: deviceData.id,
        type: 'connectivity',
        severity: 'high',
        title: 'Device Offline',
        message: `Device ${deviceData.hostname} is offline`,
        timestamp: now,
        acknowledged: false,
        resolved: false
      });
    }
  }

  // Auto-resolve alerts when conditions improve
  await resolveImprovedAlerts(deviceData, existingAlerts);

  return alerts;
}

// Helper function to resolve alerts when conditions improve
async function resolveImprovedAlerts(deviceData: any, existingAlerts: any[]) {
  const now = new Date();

  for (const alert of existingAlerts) {
    let shouldResolve = false;

    // Resolve CPU alerts if usage is now below threshold
    if (alert.title === 'High CPU Usage' && deviceData.metrics?.cpu_usage <= 75) {
      shouldResolve = true;
    }

    // Resolve memory alerts if usage is now below threshold
    if (alert.title === 'High Memory Usage' && deviceData.metrics?.memory_usage <= 80) {
      shouldResolve = true;
    }

    // Resolve disk alerts if usage is now below threshold
    if (alert.title === 'High Disk Usage' && deviceData.metrics?.disk_usage <= 75) {
      shouldResolve = true;
    }

    // Resolve offline alerts if device is now online
    if (alert.title === 'Device Offline' && deviceData.status === 'online') {
      shouldResolve = true;
    }

    if (shouldResolve) {
      await db
        .update(systemAlerts)
        .set({ 
          resolved: true, 
          resolved_at: now,
          updated_at: now 
        })
        .where(eq(systemAlerts.id, alert.id));
    }
  }
}