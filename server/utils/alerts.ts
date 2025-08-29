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
    severity: string,
    existingAlert?: any
  ) {
    try {
      // Validate inputs
      if (!metric || typeof metric !== 'string') {
        throw new Error('Invalid metric provided');
      }
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error('Invalid value provided');
      }

      const allThresholds = systemConfig.getAlertThresholds();
      const thresholds = allThresholds[metric as keyof typeof allThresholds];

      if (!thresholds) {
        console.warn(`No thresholds found for metric: ${metric}`);
      }

      const threshold = thresholds ? thresholds[severity as keyof typeof thresholds] : undefined;
      const previousValue = existingMetadata?.[metric + "_usage"] || 0;
      const valueChange = typeof value === 'number' && typeof previousValue === 'number' ? 
        Math.abs(value - previousValue).toFixed(1) : 'N/A';

      let updateReason = 'periodic_update';
      if (existingAlert && existingAlert.severity !== severity) {
        updateReason = 'severity_change';
      } else if (parseFloat(valueChange) > (thresholds?.warning * 0.1 || 3)) {
        updateReason = 'significant_change';
      }

      return {
        ...existingMetadata,
        [metric + "_usage"]: value,
        metric: metric,
        last_updated: new Date().toISOString(),
        previous_value: previousValue,
        value_change: valueChange,
        update_reason: updateReason,
        error_count: 0 // Reset error count on successful update
      };
    } catch (error) {
      console.error('Error building update metadata:', error);
      return {
        ...existingMetadata,
        error_count: (existingMetadata?.error_count || 0) + 1,
        last_error: error.message,
        last_error_time: new Date().toISOString()
      };
    }
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
      const cpuUsage = deviceData.metrics?.cpu_usage || deviceData.cpu_usage || deviceData.raw_data?.cpu_usage || deviceData.raw_data?.hardware?.cpu?.usage_percentage || deviceData.raw_data?.system_health?.metrics?.cpu_percent;
      if (cpuUsage !== undefined && cpuUsage < thresholds.cpu.warning - 5) { // Hysteresis of 5%
        shouldResolve = true;
      }
    }

    // Resolve memory alerts if usage is now below threshold (with hysteresis)
    if (alertMessage.includes('Memory') && alert.severity !== AlertSeverity.OK) {
      const memoryUsage = deviceData.metrics?.memory_usage || deviceData.memory_usage || deviceData.raw_data?.memory_usage || deviceData.raw_data?.hardware?.memory?.usage_percentage || deviceData.raw_data?.system_health?.memory_pressure?.memory_usage_percent;
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
      console.log(`Auto-resolving alert ${alert.id} (${alert.severity}): ${alert.message}`);

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

// Import correlation and health monitoring
import { AlertCorrelationEngine } from './alert-correlation';
import { AlertHealthMonitor } from './alert-health-monitor';

// Main function to generate system alerts for a given device
export async function generateSystemAlerts(deviceData: any): Promise<Alert[]> {
  const processingStart = Date.now();
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
    const alertKey = `performance_cpu_${deviceId}`;
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
    
    // Fix memory alert deduplication logic
    const existingAlert = existingAlerts.find(a => 
      a.device_id === deviceId && 
      a.category === 'performance' && 
      a.message.includes('Memory Usage') &&
      a.is_active === true
    );

    console.log(`Memory Alert Check - Device: ${deviceHostname}, Usage: ${memoryUsage}%, Severity: ${currentSeverity}, Thresholds: W:${memoryThresholds.warning}%, H:${memoryThresholds.high}%, C:${memoryThresholds.critical}%`);

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
      } else if (AlertUtils.shouldUpdateAlert(existingAlert, memoryUsage, currentSeverity, 'memory')) {
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
  // USB Device Detection - Check multiple possible locations
  let usbDevices = [];

  // Check various possible locations for USB data
  if (deviceData.usb_devices && Array.isArray(deviceData.usb_devices)) {
    usbDevices = deviceData.usb_devices;
  } else if (deviceData.usb && Array.isArray(deviceData.usb.usb_devices)) {
    usbDevices = deviceData.usb.usb_devices;
  } else if (deviceData.raw_data?.usb_devices) {
    usbDevices = deviceData.raw_data.usb_devices;
  } else if (deviceData.raw_data?.usb?.usb_devices) {
    usbDevices = deviceData.raw_data.usb.usb_devices;
  }

  if (usbDevices.length > 0) {
    // Deduplicate USB devices first
    const deduplicatedDevices = [];
    const seenSerials = new Set();
    const seenDescriptions = new Set();

    for (const device of usbDevices) {
      const serial = device.serial_number;
      const desc = device.description || 'Unknown USB Device';

      // Skip if we've seen this serial or very similar description
      if (serial && seenSerials.has(serial)) {
        continue;
      }

      // Check for similar descriptions (same device appearing multiple times)
      const normalizedDesc = desc.toLowerCase().replace(/[^a-z0-9]/g, '');
      let isDuplicate = false;
      for (const seenDesc of seenDescriptions) {
        const normalizedSeen = seenDesc.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedDesc.includes(normalizedSeen) || normalizedSeen.includes(normalizedDesc)) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        deduplicatedDevices.push(device);
        if (serial) {
          seenSerials.add(serial);
        }
        seenDescriptions.add(desc);
      }
    }

    // Filter for mass storage devices (removable drives, flash drives, etc.)
    const massStorageDevices = deduplicatedDevices.filter(device => 
      device.device_type === 'mass_storage' || 
      device.device_type === 'USB Storage' ||
      device.device_type === 'Removable Storage' ||
      device.description?.toLowerCase().includes('storage') ||
      device.description?.toLowerCase().includes('drive') ||
      device.description?.toLowerCase().includes('flash') ||
      device.description?.toLowerCase().includes('removable')
    );

    // Create alert for mass storage devices (security concern)
    if (massStorageDevices.length > 0) {
      const usbAlertKey = 'security_USB Storage Device Detected';
      const existingUSBAlert = existingAlertMap.get(usbAlertKey);

      if (!existingUSBAlert) {
        const message = `USB storage device(s) detected - ${massStorageDevices.length} storage device(s) connected`;

        alertsToCreate.push({
          id: uuidv4(),
          device_id: deviceId,
          type: 'security',
          severity: 'high',
          title: 'USB Storage Device Detected',
          message: message,
          timestamp: now,
          acknowledged: false,
          resolved: false,
          metadata: {
            usb_count: massStorageDevices.length,
            total_usb_devices: usbDevices.length,
            devices: massStorageDevices.slice(0, 5), // First 5 devices for reference
            metric: "usb",
            alert_type: "usb_storage_detection"
          }
        });
        console.log(`Created USB Storage alert for ${deviceHostname} with ${massStorageDevices.length} storage devices.`);
      }
    }

    // Also create a general info alert for all USB devices if more than 3
    if (usbDevices.length > 3) {
      const generalUsbAlertKey = 'security_Multiple USB Devices';
      const existingGeneralAlert = existingAlertMap.get(generalUsbAlertKey);

      if (!existingGeneralAlert) {
        const message = `Multiple USB devices detected - ${usbDevices.length} total USB devices connected`;

        alertsToCreate.push({
          id: uuidv4(),
          device_id: deviceId,
          type: 'security',
          severity: 'warning',
          title: 'Multiple USB Devices Detected',
          message: message,
          timestamp: now,
          acknowledged: false,
          resolved: false,
          metadata: {
            usb_count: usbDevices.length,
            devices: usbDevices.slice(0, 10), // First 10 devices for reference
            metric: "usb",
            alert_type: "multiple_usb_detection"
          }
        });
        console.log(`Created general USB alert for ${deviceHostname} with ${usbDevices.length} total devices.`);
      }
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

  // Process alert correlation for new alerts
  for (const alert of alertsToCreate) {
    try {
      const correlation = await AlertCorrelationEngine.findCorrelatedAlerts(alert);
      if (correlation) {
        console.log(`Found correlation for alert ${alert.title}: ${correlation.correlatedAlerts.length} related alerts`);

        // Add correlation info to metadata
        alert.metadata = {
          ...alert.metadata,
          correlation_id: correlation.id,
          correlation_score: correlation.correlationScore,
          impact_level: correlation.impactLevel,
          affected_services: correlation.affectedServices
        };

        // Suppress duplicates if correlation score is high
        if (correlation.correlationScore > 0.8) {
          await AlertCorrelationEngine.suppressDuplicateAlerts(correlation.correlatedAlerts);
        }
      }
    } catch (correlationError) {
      console.error('Correlation processing error:', correlationError);
      AlertHealthMonitor.recordError(`Correlation error: ${correlationError.message}`);
    }
  }

  // Record processing time for monitoring
  const processingTime = Date.now() - processingStart;
  AlertHealthMonitor.recordProcessingTime(processingTime);

  // Perform maintenance if needed
  AlertHealthMonitor.performMaintenance();

  console.log(`=== FINAL ALERT GENERATION FOR DEVICE ${deviceHostname} (${deviceId}) ===`);
  console.log(`Processing completed in ${processingTime}ms`);

  return alertsToCreate;
}

// Real database storage implementation
const storage = {
  createAlert: async (alertData: any) => {
    try {
      console.log('Creating alert in DB:', alertData.message);
      const alertId = uuidv4();
      await db.insert(systemAlerts).values({
        id: alertId,
        device_id: alertData.device_id,
        category: alertData.category,
        severity: alertData.severity,
        message: alertData.message,
        metadata: alertData.metadata || {},
        is_active: alertData.is_active || true,
        created_at: new Date(),
        updated_at: new Date(),
        resolved: alertData.resolved || false,
        acknowledged: alertData.acknowledged || false
      });
      console.log(`Alert ${alertId} created successfully in database`);
      return { id: alertId, success: true };
    } catch (error) {
      console.error('Error creating alert in database:', error);
      throw new Error(`Failed to create alert: ${error.message}`);
    }
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

// Rate limiting map to prevent alert spam
const alertRateLimit = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_ALERTS_PER_MINUTE = 10;

/**
 * Check if device has exceeded rate limit for alert generation
 */
function checkRateLimit(deviceId: string): boolean {
  const now = Date.now();
  const rateData = alertRateLimit.get(deviceId);

  if (!rateData || now - rateData.lastReset > RATE_LIMIT_WINDOW) {
    alertRateLimit.set(deviceId, { count: 0, lastReset: now });
    return true;
  }

  return rateData.count < MAX_ALERTS_PER_MINUTE;
}

/**
 * Increment rate limit counter
 */
function incrementRateLimit(deviceId: string): void {
  const rateData = alertRateLimit.get(deviceId);
  if (rateData) {
    rateData.count++;
  }
}

/**
 * Batch process alerts for multiple devices
 */
export async function processBatchAlerts(devicesData: any[]): Promise<{ processed: number; created: number; errors: string[] }> {
  const results = { processed: 0, created: 0, errors: [] as string[] };
  const batchSize = 5; // Process 5 devices at a time

  for (let i = 0; i < devicesData.length; i += batchSize) {
    const batch = devicesData.slice(i, i + batchSize);
    const batchPromises = batch.map(deviceData => processAlertsForDevice(deviceData));

    try {
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        results.processed++;
        if (result.status === 'fulfilled') {
          results.created += result.value.length;
        } else {
          const deviceId = batch[index]?.id || 'unknown';
          results.errors.push(`Device ${deviceId}: ${result.reason}`);
          console.error(`Batch processing error for device ${deviceId}:`, result.reason);
        }
      });
    } catch (error) {
      results.errors.push(`Batch processing error: ${error.message}`);
      console.error('Critical batch processing error:', error);
    }
  }

  console.log(`Batch processing complete: ${results.processed} processed, ${results.created} alerts created, ${results.errors.length} errors`);
  return results;
}

export async function processAlertsForDevice(deviceData: any): Promise<any[]> {
  const correlationId = `${deviceData.id}_${Date.now()}`;

  try {
    // Rate limiting check
    if (!checkRateLimit(deviceData.id)) {
      console.warn(`Rate limit exceeded for device ${deviceData.id}`);
      return [];
    }

    console.log(`[${correlationId}] Alert processing start for device: ${deviceData.hostname || deviceData.id}`);

    // Validate device data
    if (!deviceData.id) {
      throw new Error('Device ID is required');
    }

    const alerts = await generateSystemAlerts(deviceData);

    if (alerts.length > 0) {
      incrementRateLimit(deviceData.id);

      // Batch insert alerts using transaction
      const alertsToInsert = alerts.map(alert => ({
        id: uuidv4(),
        device_id: alert.device_id,
        category: alert.type,
        severity: alert.severity,
        message: alert.message,
        metadata: {
          ...alert.metadata,
          correlation_id: correlationId,
          processing_time: Date.now()
        },
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        resolved: false,
        acknowledged: false
      }));

      try {
        await db.insert(systemAlerts).values(alertsToInsert);
        console.log(`[${correlationId}] Successfully created ${alerts.length} alerts in batch`);
      } catch (dbError) {
        console.error(`[${correlationId}] Database error:`, dbError);
        throw new Error(`Failed to insert alerts: ${dbError.message}`);
      }
    }

    console.log(`[${correlationId}] Processing complete: ${alerts.length} alerts created`);
    return alerts;

  } catch (error) {
    console.error(`[${correlationId}] Alert processing error:`, error);
    throw error; // Re-throw for batch processing error handling
  }
}