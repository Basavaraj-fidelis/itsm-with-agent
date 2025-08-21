// Centralized Alert Threshold Configuration
// Used across: Agent Details, AI Insights, System Alerts, Dashboard
export const ALERT_THRESHOLDS = {
  CRITICAL: {
    cpu_usage: 95,
    cpu: 95,
    memory_usage: 95,
    memory: 95,
    disk_usage: 98,
    disk: 98,
    response_time: 5000,
    error_rate: 0.1,
    temperature: 85, // CPU temperature in Celsius
    load_average: 10, // System load average
    uptime_hours: 1, // Minimum uptime in hours for stability
  },
  HIGH: {
    cpu_usage: 85,
    cpu: 85,
    memory_usage: 90,
    memory: 90,
    disk_usage: 95,
    disk: 95,
    response_time: 4000,
    error_rate: 0.08,
    temperature: 80,
    load_average: 8,
    uptime_hours: 12,
  },
  WARNING: {
    cpu_usage: 80,
    cpu: 80,
    memory_usage: 85,
    memory: 85,
    disk_usage: 90,
    disk: 90,
    response_time: 3000,
    error_rate: 0.05,
    temperature: 75,
    load_average: 6,
    uptime_hours: 24,
  },
  MEDIUM: {
    cpu_usage: 75,
    cpu: 75,
    memory_usage: 80,
    memory: 80,
    disk_usage: 85,
    disk: 85,
    response_time: 2500,
    error_rate: 0.03,
    temperature: 70,
    load_average: 4,
    uptime_hours: 48,
  },
  INFO: {
    cpu_usage: 70,
    cpu: 70,
    memory_usage: 75,
    memory: 75,
    disk_usage: 80,
    disk: 80,
    response_time: 2000,
    error_rate: 0.02,
    temperature: 65,
    load_average: 2,
    uptime_hours: 72,
  },
  LOW: {
    cpu_usage: 60,
    cpu: 60,
    memory_usage: 65,
    memory: 65,
    disk_usage: 75,
    disk: 75,
    response_time: 1500,
    error_rate: 0.01,
    temperature: 60,
    load_average: 1,
    uptime_hours: 168, // 1 week
  },
};

// AI Insights Specific Thresholds
export const AI_THRESHOLDS = {
  TREND_ANALYSIS: {
    cpu_trend_daily: 2, // % increase per day
    memory_trend_daily: 1.5,
    disk_trend_daily: 0.5,
    volatility_threshold: 15, // Standard deviation %
  },
  PREDICTION: {
    confidence_minimum: 0.7,
    forecast_days: 30,
    seasonality_strength: 0.3,
  },
  PERFORMANCE: {
    high_cpu_process_threshold: 20, // % CPU per process
    high_memory_process_threshold: 10, // % Memory per process
    process_count_threshold: 100,
  },
  SECURITY: {
    failed_login_threshold: 5,
    suspicious_process_cpu: 50,
    firewall_required: true,
    antivirus_required: true,
  },
};

export type AlertThreshold = typeof ALERT_THRESHOLDS;
export type AlertLevel = 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
export type AlertCategory = keyof typeof ALERT_THRESHOLDS;

// Helper functions for alert level determination
export function getAlertLevel(category: string, value: number): AlertLevel {
  const thresholds = ALERT_THRESHOLDS;

  // Normalize category names to match ALERT_THRESHOLDS keys
  const normalizedCategory = category.toLowerCase().replace('_usage', '');
  let categoryKey: string;
  
  // Map categories to the correct threshold keys
  switch (normalizedCategory) {
    case 'cpu':
      categoryKey = 'cpu_usage';
      break;
    case 'memory':
      categoryKey = 'memory_usage';
      break;
    case 'disk':
      categoryKey = 'disk_usage';
      break;
    case 'response_time':
      categoryKey = 'response_time';
      break;
    case 'error_rate':
      categoryKey = 'error_rate';
      break;
    default:
      categoryKey = category;
  }

  // Check if we have thresholds for this category
  if (!thresholds.CRITICAL[categoryKey]) {
    console.warn(`Invalid alert category: ${category}. Using default INFO level.`);
    return "INFO";
  }

  // Get thresholds for the category
  const criticalThreshold = thresholds.CRITICAL[categoryKey];
  const warningThreshold = thresholds.WARNING[categoryKey];
  const infoThreshold = thresholds.INFO[categoryKey];

  if (criticalThreshold && value >= criticalThreshold) {
    return "CRITICAL";
  }

  if (warningThreshold && value >= warningThreshold) {
    return "WARNING";
  }

  if (infoThreshold && value >= infoThreshold) {
    return "INFO";
  }

  return "INFO";
}

export function getAlertColor(level: AlertLevel): string {
  switch (level) {
    case 'CRITICAL':
      return 'red';
    case 'HIGH':
      return 'orange';
    case 'WARNING':
      return 'yellow';
    case 'INFO':
    default:
      return 'green';
  }
}

// Safe wrapper for getAlertLevel that handles case sensitivity and errors
export const getAlertLevelSafe = (value: number, category: string): AlertLevel => {
  try {
    return getAlertLevel(category, value);
  } catch (error) {
    console.error(`Error calculating alert level for ${category}:`, error);
    return 'INFO';
  }
};

// Default export for compatibility
export default {
  ALERT_THRESHOLDS,
  getAlertLevel,
  getAlertColor,
  getAlertLevelSafe
};