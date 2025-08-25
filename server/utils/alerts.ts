import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { systemAlerts } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { systemConfig } from '../../shared/system-config';

// Define alert severities
const AlertSeverity = {
  WARNING: 'warning',
  HIGH: 'high',
  CRITICAL: 'critical',
  INFO: 'info',
  OK: 'ok',
};

export interface Alert {
  id: string;
  device_id: string;
  type: string; // e.g., 'performance', 'security', 'connectivity'
  severity: string; // 'critical', 'high', 'warning', 'info', 'ok'
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  metadata?: any; // Additional context
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
   * Determine alert severity based on metric value and thresholds
   */
  static determineSeverity(
    value: number,
    thresholds: { critical: number; high: number; warning: number }
  ): string {
    if (value >= thresholds.critical) return AlertSeverity.CRITICAL;
    if (value >= thresholds.high) return AlertSeverity.HIGH;
    if (value >= thresholds.warning) return AlertSeverity.WARNING;
    return AlertSeverity.OK; // Or 'info' depending on context
  }

  /**
   * Build performance alert message
   */
  static buildPerformanceMessage(metric: string, value: number, severity: string): string {
    const metricDisplayNames: { [key: string]: string } = {
      cpu: "CPU",
      memory: "Memory",
      disk: "Disk",
      network: "Network Bandwidth"
    };

    const metricName = metricDisplayNames[metric] || metric;
    const valueStr = typeof value === 'number' ? value.toFixed(1) : String(value);

    const severityMessages: { [key: string]: string } = {
      [AlertSeverity.CRITICAL]: `Critical ${metricName} usage: ${valueStr}${metric === 'network' ? 'bps' : '%'}. Immediate attention required.`,
      [AlertSeverity.HIGH]: `High ${metricName} usage: ${valueStr}${metric === 'network' ? 'bps' : '%'}. Performance degraded.`,
      [AlertSeverity.WARNING]: `${metricName} usage elevated: ${valueStr}${metric === 'network' ? 'bps' : '%'}. Monitor closely.`
    };

    return severityMessages[severity] || `${metricName} usage: ${valueStr}${metric === 'network' ? 'bps' : '%'}`;
  }

  /**
   * Check if alert should be updated based on value change or time elapsed
   */
  static shouldUpdateAlert(
    existingAlert: any,
    newValue: number,
    newSeverity: string,
    metric: string, // Added metric to get appropriate thresholds
    updateThresholdMinutes: number = 30
  ): boolean {
    const allThresholds = systemConfig.getAlertThresholds();
    const thresholds = allThresholds[metric as keyof typeof allThresholds];
    if (!thresholds) return false; // No thresholds found for this metric

    const lastValue = existingAlert.metadata?.[metric + "_usage"] || 0;
    const valueChange = Math.abs(newValue - lastValue);

    const timeSinceLastUpdate = new Date().getTime() -
      new Date(existingAlert.metadata?.last_updated || existingAlert.triggered_at).getTime();
    const minutesSinceUpdate = timeSinceLastUpdate / (1000 * 60);

    // Update if severity changed, value changed significantly, or enough time has passed
    return (
      existingAlert.severity !== newSeverity ||
      valueChange > thresholds.warning * 0.1 || // Example: update if change is more than 10% of warning threshold
      minutesSinceUpdate > updateThresholdMinutes
    );
  }

  /**
   * Build alert update metadata
   */
  static buildUpdateMetadata(
    existingMetadata: any,
    metric: string,
    value: number,
    severity: string // Added severity to determine update reason
  ) {
    const allThresholds = systemConfig.getAlertThresholds();
    const thresholds = allThresholds[metric as keyof typeof allThresholds];
    const threshold = thresholds ? thresholds[severity as keyof typeof thresholds] : undefined;
    const previousValue = existingMetadata?.[metric + "_usage"] || 0;
    const valueChange = typeof value === 'number' && typeof previousValue === 'number' ? Math.abs(value - previousValue).toFixed(1) : 'N/A';

    let updateReason = 'periodic_update';
    if (existingAlert.severity !== severity) {
        updateReason = 'severity_change';
    } else if (parseFloat(valueChange) > (thresholds?.warning * 0.1 || 3)) { // Use a small threshold for significant change
        updateReason = 'significant_change';
    }

    return {
      ...existingMetadata,
      [metric + "_usage"]: value,
      metric: metric,
      last_updated: new Date().toISOString(),
      previous_value: previousValue,
      value_change: valueChange,
      update_reason: updateReason
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
      AlertSeverity.INFO,
      message,
      {
        usb_count: usbDevices.length,
        devices: usbDevices.slice(0, 3), // First 3 devices for reference
        metric: "usb"
      }
    );
  }
}

// Helper function to get alert title from category and message
function getAlertTitle(category: string, message: string): string {
  if (message.includes('CPU')) return 'High CPU Usage';
  if (message.includes('Memory')) return 'High Memory Usage';
  if (message.includes('Disk')) return 'High Disk Usage';
  if (message.includes('offline')) return 'Device Offline';
  if (category === 'security' && message.includes('USB')) return 'USB Device Detected';
  return 'System Alert';
}

// Helper function to determine if an alert should be updated
function shouldUpdateAlert(existingAlert: any, currentValue: number, metric: string): boolean {
  const metricKey = `${metric}_usage`;
  const lastValue = existingAlert.metadata?.[metricKey] || 0;

  const valueChange = Math.abs(currentValue - lastValue);
  const timeSinceLastUpdate = new Date().getTime() -
    new Date(existingAlert.metadata?.last_updated || existingAlert.triggered_at).getTime();
  const minutesSinceUpdate = timeSinceLastUpdate / (1000 * 60);

  // Use a more dynamic threshold based on the metric's warning level
  const allThresholds = systemConfig.getAlertThresholds();
  const thresholds = allThresholds[metric as keyof typeof allThresholds];
  const updateThreshold = thresholds ? thresholds.warning * 0.1 : 5; // 10% of warning threshold, default 5

  // Update if value changed significantly or enough time has passed
  return valueChange > updateThreshold || minutesSinceUpdate > 60;
}

// Helper function to update existing alert
async function updateExistingAlert(alertId: string, updates: Partial<Alert>): Promise<void> {
  try {
    await db
      .update(systemAlerts)
      .set({
        severity: updates.severity,
        message: updates.message,
        metadata: updates.metadata,
        updated_at: new Date(),
        resolved: false, // Ensure it's marked as active if updated
      })
      .where(eq(systemAlerts.id, alertId));
  } catch (error) {
    console.error(`Error updating existing alert ${alertId}:`, error);
  }
}

// Helper function to resolve alerts when conditions improve
async function resolveImprovedAlerts(deviceData: any, existingAlerts: any[]) {
  const now = new Date();
  const thresholds = systemConfig.getAlertThresholds();

  for (const alert of existingAlerts) {
    let shouldResolve = false;
    const alertMessage = alert.message || '';

    // Resolve CPU alerts if usage is now below threshold (with hysteresis)
    if (alertMessage.includes('CPU') && alert.severity !== AlertSeverity.OK) {
      const cpuUsage = deviceData.metrics?.cpu_usage || deviceData.cpu_usage || deviceData.raw_data?.cpu_usage;
      if (cpuUsage !== undefined && cpuUsage < thresholds.cpu.warning - 5) { // Hysteresis of 5%
        shouldResolve = true;
      }
    }

    // Resolve memory alerts if usage is now below threshold (with hysteresis)
    if (alertMessage.includes('Memory') && alert.severity !== AlertSeverity.OK) {
      const memoryUsage = deviceData.metrics?.memory_usage || deviceData.memory_usage || deviceData.raw_data?.memory_usage;
      if (memoryUsage !== undefined && memoryUsage < thresholds.memory.warning - 5) { // Hysteresis of 5%
        shouldResolve = true;
      }
    }

    // Resolve disk alerts if usage is now below threshold (with hysteresis)
    if (alertMessage.includes('Disk') && alert.severity !== AlertSeverity.OK) {
      // Assuming we check the primary disk or an aggregate if specific disk isn't mentioned
      const diskUsage = deviceData.metrics?.disk_usage || deviceData.disk_usage || deviceData.raw_data?.disk_usage;
      if (diskUsage !== undefined && diskUsage < thresholds.disk.warning - 5) { // Hysteresis of 5%
        shouldResolve = true;
      }
    }

    // Resolve offline alerts if device is now online
    if (alertMessage.includes('offline') && deviceData.status === 'online') {
      shouldResolve = true;
    }

    if (shouldResolve && alert.is_active) {
      console.log(`Auto-resolving alert ${alert.id} (${alert.severity}): ${alertMessage}`);

      await db
        .update(systemAlerts)
        .set({
          is_active: false,
          resolved: true,
          resolved_at: now,
          updated_at: now,
          severity: AlertSeverity.OK,
          metadata: {
            ...alert.metadata,
            resolution_reason: 'auto_resolved',
            resolved_at_timestamp: now.toISOString()
          }
        })
        .where(eq(systemAlerts.id, alert.id));
    }
  }
}

// Main function to generate system alerts for a given device
export async function generateSystemAlerts(deviceData: any): Promise<Alert[]> {
  const alertsToCreate: Alert[] = [];
  const now = new Date();
  const deviceId = deviceData.id;
  const deviceHostname = deviceData.hostname || 'Unknown';
  const thresholds = systemConfig.getAlertThresholds();

  // Get existing ACTIVE alerts for this device
  const existingAlerts = await db
    .select()
    .from(systemAlerts)
    .where(
      and(
        eq(systemAlerts.device_id, deviceId),
        eq(systemAlerts.is_active, true) // Only consider active alerts
      )
    );

  // Create a map of existing alert keys (category_title) to their alert objects for efficient lookup
  const existingAlertMap = new Map<string, any>();
  existingAlerts.forEach(alert => {
    const alertKey = `${alert.category}_${getAlertTitle(alert.category, alert.message)}`;
    existingAlertMap.set(alertKey, alert);
  });

  console.log(`=== GENERATING ALERTS FOR DEVICE ${deviceHostname} (${deviceId}) ===`);

  // --- Performance Alerts ---

  // CPU Usage Alert
  const cpuUsage = deviceData.metrics?.cpu_usage ?? deviceData.cpu_usage ?? deviceData.raw_data?.cpu_usage ?? deviceData.raw_data?.hardware?.cpu?.usage_percentage ?? deviceData.raw_data?.system_health?.metrics?.cpu_percent;
  if (cpuUsage !== undefined && typeof cpuUsage === 'number') {
    const cpuThresholds = thresholds.cpu;
    const currentSeverity = AlertUtils.determineSeverity(cpuUsage, cpuThresholds);
    const alertKey = `performance_${currentSeverity}_cpu_${deviceId}`;
    const existingAlert = existingAlertMap.get(`performance_cpu_${deviceId}`); // Look for any CPU alert regardless of severity

    if (currentSeverity !== AlertSeverity.OK) {
      const message = AlertUtils.buildPerformanceMessage('cpu', cpuUsage, currentSeverity);
      const metadata = AlertUtils.buildUpdateMetadata(existingAlert?.metadata || {}, 'cpu', cpuUsage, currentSeverity);

      if (!existingAlert) {
        alertsToCreate.push({
          id: uuidv4(),
          device_id: deviceId,
          type: 'performance',
          severity: currentSeverity,
          title: `High CPU Usage`,
          message: message,
          timestamp: now,
          acknowledged: false,
          resolved: false,
          metadata: metadata
        });
        console.log(`Created CPU alert (${currentSeverity}) for ${deviceHostname}: ${cpuUsage.toFixed(1)}%`);
      } else if (AlertUtils.shouldUpdateAlert(existingAlert, cpuUsage, 'cpu')) {
        await updateExistingAlert(existingAlert.id, {
          severity: currentSeverity,
          message: message,
          metadata: metadata
        });
        console.log(`Updated CPU alert for ${deviceHostname}: ${cpuUsage.toFixed(1)}%`);
      }
    } else if (existingAlert && existingAlert.severity !== AlertSeverity.OK) {
      // If condition improved and existing alert was active, resolve it
      await db.update(systemAlerts).set({
        is_active: false,
        resolved: true,
        resolved_at: now,
        severity: AlertSeverity.OK,
        metadata: { ...existingAlert.metadata, resolution_reason: 'auto_resolved', resolved_at_timestamp: now.toISOString() }
      }).where(eq(systemAlerts.id, existingAlert.id));
      console.log(`Resolved CPU alert for ${deviceHostname} due to improved performance.`);
    }
  }

  // Memory Usage Alert
  const memoryUsage = deviceData.metrics?.memory_usage ?? deviceData.memory_usage ?? deviceData.raw_data?.memory_usage ?? deviceData.raw_data?.hardware?.memory?.usage_percentage ?? deviceData.raw_data?.system_health?.memory_pressure?.memory_usage_percent;
  if (memoryUsage !== undefined && typeof memoryUsage === 'number') {
    const memoryThresholds = thresholds.memory;
    const currentSeverity = AlertUtils.determineSeverity(memoryUsage, memoryThresholds);
    const alertKey = `performance_${currentSeverity}_memory_${deviceId}`;
    const existingAlert = existingAlertMap.get(`performance_memory_${deviceId}`);

    if (currentSeverity !== AlertSeverity.OK) {
      const message = AlertUtils.buildPerformanceMessage('memory', memoryUsage, currentSeverity);
      const metadata = AlertUtils.buildUpdateMetadata(existingAlert?.metadata || {}, 'memory', memoryUsage, currentSeverity);

      if (!existingAlert) {
        alertsToCreate.push({
          id: uuidv4(),
          device_id: deviceId,
          type: 'performance',
          severity: currentSeverity,
          title: `High Memory Usage`,
          message: message,
          timestamp: now,
          acknowledged: false,
          resolved: false,
          metadata: metadata
        });
        console.log(`Created Memory alert (${currentSeverity}) for ${deviceHostname}: ${memoryUsage.toFixed(1)}%`);
      } else if (AlertUtils.shouldUpdateAlert(existingAlert, memoryUsage, 'memory')) {
        await updateExistingAlert(existingAlert.id, {
          severity: currentSeverity,
          message: message,
          metadata: metadata
        });
        console.log(`Updated Memory alert for ${deviceHostname}: ${memoryUsage.toFixed(1)}%`);
      }
    } else if (existingAlert && existingAlert.severity !== AlertSeverity.OK) {
      // If condition improved and existing alert was active, resolve it
      await db.update(systemAlerts).set({
        is_active: false,
        resolved: true,
        resolved_at: now,
        severity: AlertSeverity.OK,
        metadata: { ...existingAlert.metadata, resolution_reason: 'auto_resolved', resolved_at_timestamp: now.toISOString() }
      }).where(eq(systemAlerts.id, existingAlert.id));
      console.log(`Resolved Memory alert for ${deviceHostname} due to improved performance.`);
    }
  }

  // Disk Usage Alert
  const disks = deviceData.storage?.disks || deviceData.raw_data?.storage?.disks;
  if (disks && Array.isArray(disks)) {
    for (const disk of disks) {
      const diskUsage = disk.usage?.percentage ?? disk.usage_percentage;
      if (diskUsage !== undefined && typeof diskUsage === 'number') {
        const diskThresholds = thresholds.disk;
        const currentSeverity = AlertUtils.determineSeverity(diskUsage, diskThresholds);
        const diskDeviceName = disk.device || disk.name || 'Unknown';
        const alertKey = `performance_${currentSeverity}_disk_${deviceId}_${diskDeviceName}`;
        const existingAlert = existingAlerts.find(a =>
          a.metadata?.disk_device === diskDeviceName && a.category === 'performance' && a.message.includes('Disk Usage')
        );

        if (currentSeverity !== AlertSeverity.OK) {
          const message = AlertUtils.buildPerformanceMessage('disk', diskUsage, currentSeverity);
          const metadata = AlertUtils.buildUpdateMetadata(existingAlert?.metadata || {}, 'disk', diskUsage, currentSeverity);
          metadata.disk_device = diskDeviceName; // Ensure disk device is in metadata

          if (!existingAlert) {
            alertsToCreate.push({
              id: uuidv4(),
              device_id: deviceId,
              type: 'performance',
              severity: currentSeverity,
              title: `High Disk Usage`,
              message: `Disk ${diskDeviceName} usage is at ${diskUsage.toFixed(1)}%`,
              timestamp: now,
              acknowledged: false,
              resolved: false,
              metadata: metadata
            });
            console.log(`Created Disk alert (${currentSeverity}) for ${deviceHostname} (Disk: ${diskDeviceName}): ${diskUsage.toFixed(1)}%`);
          } else if (AlertUtils.shouldUpdateAlert(existingAlert, diskUsage, 'disk')) {
            await updateExistingAlert(existingAlert.id, {
              severity: currentSeverity,
              message: `Disk ${diskDeviceName} usage is at ${diskUsage.toFixed(1)}%`,
              metadata: metadata
            });
            console.log(`Updated Disk alert for ${deviceHostname} (Disk: ${diskDeviceName}): ${diskUsage.toFixed(1)}%`);
          }
        } else if (existingAlert && existingAlert.severity !== AlertSeverity.OK) {
          // If condition improved and existing alert was active, resolve it
          await db.update(systemAlerts).set({
            is_active: false,
            resolved: true,
            resolved_at: now,
            severity: AlertSeverity.OK,
            metadata: { ...existingAlert.metadata, resolution_reason: 'auto_resolved', resolved_at_timestamp: now.toISOString() }
          }).where(eq(systemAlerts.id, existingAlert.id));
          console.log(`Resolved Disk alert for ${deviceHostname} (Disk: ${diskDeviceName}) due to improved performance.`);
        }
      }
    }
  }

  // --- Connectivity Alerts ---
  if (deviceData.status === 'offline') {
    const alertKey = 'connectivity_Device Offline';
    const existingAlert = existingAlertMap.get(alertKey);

    if (!existingAlert) {
      const message = `Device ${deviceHostname} is offline`;
      alertsToCreate.push({
        id: uuidv4(),
        device_id: deviceId,
        type: 'connectivity',
        severity: AlertSeverity.CRITICAL, // Offline is critical
        title: 'Device Offline',
        message: message,
        timestamp: now,
        acknowledged: false,
        resolved: false,
        metadata: {
          device_status: 'offline',
          hostname: deviceHostname,
          alert_type: 'connectivity_status'
        }
      });
      console.log(`Created Offline alert for ${deviceHostname}`);
    }
  } else if (deviceData.status === 'online' && existingAlertMap.has('connectivity_Device Offline')) {
    // If device is online and there was an offline alert, resolve it
    const offlineAlert = existingAlertMap.get('connectivity_Device Offline');
    if (offlineAlert && offlineAlert.is_active) {
      await db.update(systemAlerts).set({
        is_active: false,
        resolved: true,
        resolved_at: now,
        severity: AlertSeverity.OK,
        metadata: { ...offlineAlert.metadata, resolution_reason: 'auto_resolved', resolved_at_timestamp: now.toISOString() }
      }).where(eq(systemAlerts.id, offlineAlert.id));
      console.log(`Resolved Offline alert for ${deviceHostname} as it is now online.`);
    }
  }

  // --- Security Alerts ---
  // Example: USB Device Detection
  if (deviceData.usb_devices && Array.isArray(deviceData.usb_devices) && deviceData.usb_devices.length > 0) {
    const usbAlertKey = 'security_USB Device Detected';
    const existingUSBAlert = existingAlertMap.get(usbAlertKey);

    if (!existingUSBAlert) {
      const usbAlertData = AlertUtils.createUSBAlert(deviceId, deviceData.usb_devices);
      alertsToCreate.push({
        id: uuidv4(),
        device_id: deviceId,
        type: usbAlertData.category,
        severity: usbAlertData.severity,
        title: 'USB Device Detected',
        message: usbAlertData.message,
        timestamp: now,
        acknowledged: false,
        resolved: false,
        metadata: usbAlertData.metadata
      });
      console.log(`Created USB Device alert for ${deviceHostname} with ${deviceData.usb_devices.length} devices.`);
    }
  }

  // Summary log
  console.log(`=== RESOURCE SUMMARY FOR DEVICE ${deviceHostname} (${deviceId}) ===`);
  const cpuVal = cpuUsage !== undefined ? `${cpuUsage.toFixed(1)}%` : 'N/A';
  const memVal = memoryUsage !== undefined ? `${memoryUsage.toFixed(1)}%` : 'N/A';
  const diskVals = disks?.map(d => `${d.device || 'Unknown'}: ${d.usage?.percentage ?? d.usage_percentage ?? 'N/A'}%`).join(', ') || 'N/A';
  console.log(`CPU: ${cpuVal} (Thresholds: W:${thresholds.cpu.warning}%, H:${thresholds.cpu.high}%, C:${thresholds.cpu.critical}%)`);
  console.log(`Memory: ${memVal} (Thresholds: W:${thresholds.memory.warning}%, H:${thresholds.memory.high}%, C:${thresholds.memory.critical}%)`);
  console.log(`Disk: ${diskVals} (Thresholds: W:${thresholds.disk.warning}%, H:${thresholds.disk.high}%, C:${thresholds.disk.critical}%)`);
  console.log(`Existing active alerts: ${existingAlerts.length}`);
  console.log(`New alerts to create: ${alertsToCreate.length}`);

  // Auto-resolve alerts based on current device state
  await resolveImprovedAlerts(deviceData, existingAlerts);

  console.log(`=== FINAL ALERT GENERATION FOR DEVICE ${deviceHostname} (${deviceId}) ===`);

  return alertsToCreate;
}

// Mock storage and generateAlertsForDevice for demonstration purposes
// In a real scenario, these would be imported from their respective modules.
const storage = {
  createAlert: async (alertData: any) => {
    console.log('Simulating alert creation in DB:', alertData);
    // In a real application, you would insert into the systemAlerts table
    // await db.insert(systemAlerts).values({...alertData, id: uuidv4()});
  }
};

// Mock generateAlertsForDevice function if it's not provided in the current scope
// If generateAlertsForDevice is defined elsewhere and imported, this mock can be removed.
async function generateAlertsForDevice(deviceData: any): Promise<Alert[]> {
  console.log(`Mock generateAlertsForDevice called for ${deviceData.id}`);
  // This is a placeholder. In a real scenario, this would contain the logic
  // that calls generateSystemAlerts or similar functions.
  const generatedAlerts = await generateSystemAlerts(deviceData);
  return generatedAlerts;
}

export async function processAlertsForDevice(deviceData: any): Promise<any[]> {
  try {
    console.log(`\n=== ALERT PROCESSING START FOR DEVICE: ${deviceData.hostname || deviceData.id} ===`);
    // Log key metrics for context
    const cpuUsage = deviceData.metrics?.cpu_usage ?? deviceData.cpu_usage ?? deviceData.raw_data?.cpu_usage ?? deviceData.raw_data?.hardware?.cpu?.usage_percentage;
    const memoryUsage = deviceData.metrics?.memory_usage ?? deviceData.memory_usage ?? deviceData.raw_data?.memory_usage ?? deviceData.raw_data?.hardware?.memory?.usage_percentage;
    const diskUsage = deviceData.storage?.disks?.[0]?.usage?.percentage ?? deviceData.storage?.disks?.[0]?.usage_percentage ?? deviceData.raw_data?.storage?.disks?.[0]?.usage_percentage;
    const thresholds = systemConfig.getAlertThresholds();

    console.log(`Device Metrics: CPU=${cpuUsage !== undefined ? cpuUsage.toFixed(1) + '%' : 'N/A'}, Memory=${memoryUsage !== undefined ? memoryUsage.toFixed(1) + '%' : 'N/A'}, Disk=${diskUsage !== undefined ? diskUsage.toFixed(1) + '%' : 'N/A'}`);
    console.log(`Thresholds: CPU(W:${thresholds.cpu.warning}%, H:${thresholds.cpu.high}%, C:${thresholds.cpu.critical}%), Memory(W:${thresholds.memory.warning}%, H:${thresholds.memory.high}%, C:${thresholds.memory.critical}%), Disk(W:${thresholds.disk.warning}%, H:${thresholds.disk.high}%, C:${thresholds.disk.critical}%)`);
    console.log(`Device Status: ${deviceData.status}`);

    const alerts = await generateAlertsForDevice(deviceData);

    console.log(`Generated ${alerts.length} alerts for device ${deviceData.hostname || deviceData.id}`);

    if (alerts.length > 0) {
      // Store alerts in database
      for (const alert of alerts) {
        console.log(`Creating alert: ${alert.title} [${alert.severity}] - ${alert.message}`);
        // Ensure alert object conforms to the expected schema for storage.createAlert
        await storage.createAlert({
          device_id: alert.device_id,
          category: alert.type,
          severity: alert.severity,
          message: alert.message,
          metadata: alert.metadata || {},
          is_active: true, // New alerts are active
          created_at: new Date(),
          updated_at: new Date(),
          resolved: false,
          acknowledged: false,
          title: alert.title
        });
        console.log(`Alert added to storage queue.`);
      }
    } else {
      console.log(`No new alerts generated for device ${deviceData.hostname || deviceData.id}. Checking for resolution.`);
    }

    console.log(`=== ALERT PROCESSING END FOR DEVICE: ${deviceData.hostname || deviceData.id} ===`);
    return alerts;
  } catch (error) {
    console.error('Error processing alerts for device:', error);
    return [];
  }
}