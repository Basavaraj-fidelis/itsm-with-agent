// Alert threshold configuration
export const ALERT_THRESHOLDS = {
  CPU: {
    CRITICAL: 95,
    HIGH: 85,
    WARNING: 70,
    INFO: 50
  },
  MEMORY: {
    CRITICAL: 95,
    HIGH: 85,
    WARNING: 70,
    INFO: 50
  },
  DISK: {
    CRITICAL: 95,
    HIGH: 85,
    WARNING: 70,
    INFO: 50
  },
  NETWORK: {
    CRITICAL: 95,
    HIGH: 85,
    WARNING: 70,
    INFO: 50
  }
} as const;

export type AlertThreshold = typeof ALERT_THRESHOLDS;
export type AlertLevel = 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
export type AlertCategory = keyof typeof ALERT_THRESHOLDS;

// Helper functions for alert level determination
export function getAlertLevel(value: number, category: AlertCategory): AlertLevel {
  const thresholds = ALERT_THRESHOLDS[category];
  
  // Handle invalid category gracefully
  if (!thresholds) {
    console.warn(`Invalid alert category: ${category}. Using default INFO level.`);
    return 'INFO';
  }
  
  if (value >= thresholds.CRITICAL) {
    return 'CRITICAL';
  } else if (value >= thresholds.HIGH) {
    return 'HIGH';
  } else if (value >= thresholds.WARNING) {
    return 'WARNING';
  } else {
    return 'INFO';
  }
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

// Safe wrapper function that validates category before calling getAlertLevel
export function getAlertLevelSafe(value: number, category: string): AlertLevel {
  // Validate category and convert to uppercase
  const validCategories = ['CPU', 'MEMORY', 'DISK', 'NETWORK'];
  const upperCategory = category?.toString().toUpperCase();
  
  if (!validCategories.includes(upperCategory)) {
    console.warn(`Invalid alert category: "${category}". Valid categories are: ${validCategories.join(', ')}`);
    return 'INFO';
  }
  
  return getAlertLevel(value, upperCategory as AlertCategory);
}

// Default export for compatibility
export default ALERT_THRESHOLDS;