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

  // Get existing ACTIVE alerts for this device (not just unread ones)
  const existingAlerts = await db
    .select()
    .from(systemAlerts)
    .where(
      and(
        eq(systemAlerts.device_id, deviceData.id),
        eq(systemAlerts.is_active, true)
      )
    );

  // Create a map of existing alert types with their IDs for efficient lookup
  const existingAlertMap = new Map();
  existingAlerts.forEach(alert => {
    const alertKey = `${alert.category}_${getAlertTitle(alert.category, alert.message)}`;
    existingAlertMap.set(alertKey, alert);
  });

  // Extract CPU usage from multiple possible sources
  const cpuUsage = deviceData.metrics?.cpu_usage || 
                  deviceData.cpu_usage || 
                  deviceData.raw_data?.hardware?.cpu?.usage_percentage ||
                  deviceData.raw_data?.system_health?.metrics?.cpu_percent;

  console.log(`Checking CPU usage for device ${deviceData.id}: ${cpuUsage}%`);

  // CPU Usage Alert - only generate if no existing active CPU alert
  if (cpuUsage && cpuUsage > 80) {
    const alertKey = 'performance_High CPU Usage';
    const existingAlert = existingAlertMap.get(alertKey);
    
    if (!existingAlert) {
      const severity = cpuUsage > 95 ? 'critical' : cpuUsage > 88 ? 'high' : 'warning';
      const newAlert = AlertUtils.createAlertData(
        deviceData.id,
        'performance',
        severity,
        `CPU usage is at ${cpuUsage.toFixed(1)}%`,
        {
          cpu_usage: cpuUsage,
          threshold: 80,
          metric: 'cpu',
          alert_type: 'performance_threshold'
        }
      );
      
      alerts.push({
        id: uuidv4(),
        device_id: deviceData.id,
        type: 'performance',
        severity: newAlert.severity,
        title: 'High CPU Usage',
        message: newAlert.message,
        timestamp: now,
        acknowledged: false,
        resolved: false
      });

      console.log(`Created CPU alert for device ${deviceData.id}: ${cpuUsage.toFixed(1)}%`);
    } else if (shouldUpdateAlert(existingAlert, cpuUsage)) {
      const severity = cpuUsage > 95 ? 'critical' : cpuUsage > 88 ? 'high' : 'warning';
      await updateExistingAlert(existingAlert.id, {
        severity: severity,
        message: `CPU usage is at ${cpuUsage.toFixed(1)}%`,
        metadata: {
          ...existingAlert.metadata,
          cpu_usage: cpuUsage,
          last_updated: now.toISOString(),
          update_count: (existingAlert.metadata?.update_count || 0) + 1
        }
      });
      console.log(`Updated CPU alert for device ${deviceData.id}: ${cpuUsage.toFixed(1)}%`);
    }
  }

  // Extract memory usage from multiple possible sources
  const memoryUsage = deviceData.metrics?.memory_usage || 
                     deviceData.memory_usage || 
                     deviceData.raw_data?.hardware?.memory?.usage_percentage ||
                     deviceData.raw_data?.system_health?.memory_pressure?.memory_usage_percent;

  console.log(`Checking memory usage for device ${deviceData.id}: ${memoryUsage}%`);

  // Memory Usage Alert - only generate if no existing active memory alert
  if (memoryUsage && memoryUsage > 85) {
    const alertKey = 'performance_High Memory Usage';
    const existingAlert = existingAlertMap.get(alertKey);
    
    if (!existingAlert) {
      const severity = memoryUsage > 95 ? 'critical' : memoryUsage > 90 ? 'high' : 'warning';
      const newAlert = AlertUtils.createAlertData(
        deviceData.id,
        'performance',
        severity,
        `Memory usage is at ${memoryUsage.toFixed(1)}%`,
        {
          memory_usage: memoryUsage,
          threshold: 85,
          metric: 'memory',
          alert_type: 'performance_threshold'
        }
      );
      
      alerts.push({
        id: uuidv4(),
        device_id: deviceData.id,
        type: 'performance',
        severity: newAlert.severity,
        title: 'High Memory Usage',
        message: newAlert.message,
        timestamp: now,
        acknowledged: false,
        resolved: false
      });

      console.log(`Created memory alert for device ${deviceData.id}: ${memoryUsage.toFixed(1)}%`);
    } else if (shouldUpdateAlert(existingAlert, memoryUsage)) {
      const severity = memoryUsage > 95 ? 'critical' : memoryUsage > 90 ? 'high' : 'warning';
      await updateExistingAlert(existingAlert.id, {
        severity: severity,
        message: `Memory usage is at ${memoryUsage.toFixed(1)}%`,
        metadata: {
          ...existingAlert.metadata,
          memory_usage: memoryUsage,
          last_updated: now.toISOString(),
          update_count: (existingAlert.metadata?.update_count || 0) + 1
        }
      });
      console.log(`Updated memory alert for device ${deviceData.id}: ${memoryUsage.toFixed(1)}%`);
    }
  }

  // Extract disk usage from multiple possible sources
  const diskUsage = deviceData.metrics?.disk_usage || 
                   deviceData.disk_usage || 
                   deviceData.raw_data?.storage?.primary_drive?.usage_percentage ||
                   (deviceData.raw_data?.storage?.drives && deviceData.raw_data.storage.drives[0]?.usage_percentage);

  console.log(`Checking disk usage for device ${deviceData.id}: ${diskUsage}%`);

  // Disk Usage Alert - only generate if no existing active disk alert
  if (diskUsage && diskUsage > 80) {
    const alertKey = 'performance_High Disk Usage';
    const existingAlert = existingAlertMap.get(alertKey);
    
    if (!existingAlert) {
      const severity = diskUsage > 95 ? 'critical' : diskUsage > 88 ? 'high' : 'warning';
      const newAlert = AlertUtils.createAlertData(
        deviceData.id,
        'performance',
        severity,
        `Disk usage is at ${diskUsage.toFixed(1)}%`,
        {
          disk_usage: diskUsage,
          threshold: 80,
          metric: 'disk',
          alert_type: 'performance_threshold'
        }
      );
      
      alerts.push({
        id: uuidv4(),
        device_id: deviceData.id,
        type: 'performance',
        severity: newAlert.severity,
        title: 'High Disk Usage',
        message: newAlert.message,
        timestamp: now,
        acknowledged: false,
        resolved: false
      });

      console.log(`Created disk alert for device ${deviceData.id}: ${diskUsage.toFixed(1)}%`);
    } else if (shouldUpdateAlert(existingAlert, diskUsage)) {
      const severity = diskUsage > 95 ? 'critical' : diskUsage > 88 ? 'high' : 'warning';
      await updateExistingAlert(existingAlert.id, {
        severity: severity,
        message: `Disk usage is at ${diskUsage.toFixed(1)}%`,
        metadata: {
          ...existingAlert.metadata,
          disk_usage: diskUsage,
          last_updated: now.toISOString(),
          update_count: (existingAlert.metadata?.update_count || 0) + 1
        }
      });
      console.log(`Updated disk alert for device ${deviceData.id}: ${diskUsage.toFixed(1)}%`);
    }
  }

  // Device Offline Alert - only generate if no existing active offline alert
  if (deviceData.status === 'offline') {
    const alertKey = 'connectivity_Device Offline';
    const existingAlert = existingAlertMap.get(alertKey);
    
    if (!existingAlert) {
      const newAlert = AlertUtils.createAlertData(
        deviceData.id,
        'connectivity',
        'high',
        `Device ${deviceData.hostname} is offline`,
        {
          device_status: 'offline',
          hostname: deviceData.hostname,
          alert_type: 'connectivity_status'
        }
      );
      
      alerts.push({
        id: uuidv4(),
        device_id: deviceData.id,
        type: 'connectivity',
        severity: 'high',
        title: 'Device Offline',
        message: newAlert.message,
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

// Helper function to get alert title from category and message
function getAlertTitle(category: string, message: string): string {
  if (message.includes('CPU')) return 'High CPU Usage';
  if (message.includes('Memory')) return 'High Memory Usage';
  if (message.includes('Disk')) return 'High Disk Usage';
  if (message.includes('offline')) return 'Device Offline';
  return 'System Alert';
}

// Helper function to determine if an alert should be updated
function shouldUpdateAlert(existingAlert: any, currentValue: number): boolean {
  const lastValue = existingAlert.metadata?.cpu_usage || 
                   existingAlert.metadata?.memory_usage || 
                   existingAlert.metadata?.disk_usage || 0;
  
  const valueChange = Math.abs(currentValue - lastValue);
  const timeSinceLastUpdate = new Date().getTime() - 
    new Date(existingAlert.metadata?.last_updated || existingAlert.triggered_at).getTime();
  const minutesSinceUpdate = timeSinceLastUpdate / (1000 * 60);

  // Update if value changed significantly or enough time has passed
  return valueChange > 5 || minutesSinceUpdate > 60;
}

// Helper function to update existing alert
async function updateExistingAlert(alertId: string, updates: any): Promise<void> {
  try {
    await db
      .update(systemAlerts)
      .set({
        severity: updates.severity,
        message: updates.message,
        metadata: updates.metadata,
        updated_at: new Date()
      })
      .where(eq(systemAlerts.id, alertId));
  } catch (error) {
    console.error('Error updating existing alert:', error);
  }
}

// Helper function to resolve alerts when conditions improve
async function resolveImprovedAlerts(deviceData: any, existingAlerts: any[]) {
  const now = new Date();

  for (const alert of existingAlerts) {
    let shouldResolve = false;
    const alertMessage = alert.message || '';

    // Resolve CPU alerts if usage is now below threshold (with hysteresis)
    if (alertMessage.includes('CPU') && deviceData.metrics?.cpu_usage <= 75) {
      shouldResolve = true;
    }

    // Resolve memory alerts if usage is now below threshold (with hysteresis)
    if (alertMessage.includes('Memory') && deviceData.metrics?.memory_usage <= 80) {
      shouldResolve = true;
    }

    // Resolve disk alerts if usage is now below threshold (with hysteresis)
    if (alertMessage.includes('Disk') && deviceData.metrics?.disk_usage <= 75) {
      shouldResolve = true;
    }

    // Resolve offline alerts if device is now online
    if (alertMessage.includes('offline') && deviceData.status === 'online') {
      shouldResolve = true;
    }

    if (shouldResolve && alert.is_active) {
      console.log(`Auto-resolving alert ${alert.id}: ${alertMessage}`);
      
      await db
        .update(systemAlerts)
        .set({ 
          is_active: false,
          resolved_at: now,
          updated_at: now,
          metadata: {
            ...alert.metadata,
            resolution_reason: 'auto_resolved',
            resolved_value: deviceData.metrics?.cpu_usage || 
                           deviceData.metrics?.memory_usage || 
                           deviceData.metrics?.disk_usage || 0,
            resolved_at_timestamp: now.toISOString()
          }
        })
        .where(eq(systemAlerts.id, alert.id));
    }
  }
}