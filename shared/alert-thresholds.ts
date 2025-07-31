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

// Safe wrapper for getAlertLevel that handles case sensitivity and errors
export const getAlertLevelSafe = (value: number, category: string): AlertLevel => {
  try {
    // Convert category to uppercase to match ALERT_THRESHOLDS keys
    const upperCategory = category.toUpperCase() as keyof typeof ALERT_THRESHOLDS;

    // Check if category exists in thresholds
    if (!ALERT_THRESHOLDS[upperCategory]) {
      console.warn(`Invalid alert category: ${category}. Using default INFO level.`);
      return 'INFO';
    }

    return getAlertLevel(value, upperCategory);
  } catch (error) {
    console.error(`Error calculating alert level for ${category}:`, error);
    return 'INFO';
  }
};

export { ALERT_THRESHOLDS, getAlertLevel, getAlertColor, getAlertLevelSafe };