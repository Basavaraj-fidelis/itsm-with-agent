
import { ALERT_THRESHOLDS, AI_THRESHOLDS } from "../../shared/alert-thresholds";

export class ThresholdManager {
  static getSeverityLevel(metric: string, value: number): string {
    const metricKey = metric.toLowerCase().replace('_usage', '');
    
    // Check each severity level from highest to lowest
    if (value >= (ALERT_THRESHOLDS.CRITICAL[metricKey] || Infinity)) {
      return 'critical';
    }
    if (value >= (ALERT_THRESHOLDS.HIGH[metricKey] || Infinity)) {
      return 'high';
    }
    if (value >= (ALERT_THRESHOLDS.WARNING[metricKey] || Infinity)) {
      return 'medium';
    }
    if (value >= (ALERT_THRESHOLDS.MEDIUM[metricKey] || Infinity)) {
      return 'low';
    }
    
    return 'info';
  }

  static getThresholdForSeverity(metric: string, severity: string): number {
    const metricKey = metric.toLowerCase().replace('_usage', '');
    const severityKey = severity.toUpperCase();
    
    return ALERT_THRESHOLDS[severityKey]?.[metricKey] || 0;
  }

  static getAIThreshold(category: string, threshold: string): number {
    return AI_THRESHOLDS[category.toUpperCase()]?.[threshold] || 0;
  }

  static isThresholdBreached(metric: string, value: number, minSeverity: string = 'INFO'): boolean {
    const currentSeverity = this.getSeverityLevel(metric, value);
    const severityLevels = ['info', 'low', 'medium', 'high', 'critical'];
    
    const currentIndex = severityLevels.indexOf(currentSeverity.toLowerCase());
    const minIndex = severityLevels.indexOf(minSeverity.toLowerCase());
    
    return currentIndex >= minIndex;
  }

  static getAllThresholds() {
    return {
      alert_thresholds: ALERT_THRESHOLDS,
      ai_thresholds: AI_THRESHOLDS
    };
  }

  static validateThresholds(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate that thresholds are in ascending order
    const metrics = ['cpu_usage', 'memory_usage', 'disk_usage'];
    const severities = ['INFO', 'LOW', 'MEDIUM', 'WARNING', 'HIGH', 'CRITICAL'];
    
    for (const metric of metrics) {
      let previousValue = 0;
      for (const severity of severities) {
        const value = ALERT_THRESHOLDS[severity]?.[metric];
        if (value && value <= previousValue) {
          errors.push(`${metric} threshold for ${severity} (${value}) should be greater than ${severity} (${previousValue})`);
        }
        previousValue = value || previousValue;
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default ThresholdManager;
