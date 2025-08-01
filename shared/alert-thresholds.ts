// Alert threshold configuration
export const ALERT_THRESHOLDS = {
  CRITICAL: {
    cpu_usage: 90,
    cpu: 90,
    memory_usage: 95,
    memory: 95,
    disk_usage: 98,
    disk: 98,
    response_time: 5000,
    error_rate: 0.1,
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