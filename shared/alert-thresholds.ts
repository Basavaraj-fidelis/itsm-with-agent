
export const ALERT_THRESHOLDS = {
  CPU: {
    INFO: 80,
    WARNING: 85,
    HIGH: 88,
    CRITICAL: 92,
  },
  MEMORY: {
    INFO: 80,
    WARNING: 85,
    HIGH: 88,
    CRITICAL: 92,
  },
  DISK: {
    INFO: 80,
    WARNING: 85,
    HIGH: 88,
    CRITICAL: 92,
  },
  NETWORK: {
    INFO: 80,
    WARNING: 85,
    HIGH: 88,
    CRITICAL: 92,
  },
  TEMPERATURE: {
    INFO: 80,
    WARNING: 85,
    HIGH: 88,
    CRITICAL: 92,
  },
} as const;

export type AlertLevel = 'info' | 'warning' | 'high' | 'critical';

export function getAlertLevel(value: number, type: keyof typeof ALERT_THRESHOLDS): AlertLevel {
  const thresholds = ALERT_THRESHOLDS[type];
  
  if (value >= thresholds.CRITICAL) {
    return 'critical';    // 92%+
  } else if (value >= thresholds.HIGH) {
    return 'high';        // 88-91%
  } else if (value >= thresholds.WARNING) {
    return 'warning';     // 85-87%
  } else if (value >= thresholds.INFO) {
    return 'info';        // 80-84%
  } else {
    return 'info';        // <80% (default to info)
  }
}

export function getAlertColor(level: AlertLevel): string {
  switch (level) {
    case 'critical':
      return 'red';
    case 'high':
      return 'orange';
    case 'warning':
      return 'yellow';
    case 'info':
    default:
      return 'green';
  }
}
