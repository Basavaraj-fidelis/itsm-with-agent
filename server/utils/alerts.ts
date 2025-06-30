
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
