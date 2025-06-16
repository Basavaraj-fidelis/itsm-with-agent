
export const ALERT_THRESHOLDS = {
  CPU: {
    WARNING: 70,
    CRITICAL: 85,
  },
  MEMORY: {
    WARNING: 80,
    CRITICAL: 90,
  },
  DISK: {
    WARNING: 80,
    CRITICAL: 95,
  },
  NETWORK: {
    WARNING: 75,
    CRITICAL: 90,
  },
  TEMPERATURE: {
    WARNING: 70,
    CRITICAL: 85,
  },
} as const;

export type AlertLevel = 'normal' | 'warning' | 'critical';

export function getAlertLevel(value: number, type: keyof typeof ALERT_THRESHOLDS): AlertLevel {
  const thresholds = ALERT_THRESHOLDS[type];
  
  if (value >= thresholds.CRITICAL) {
    return 'critical';
  } else if (value >= thresholds.WARNING) {
    return 'warning';
  } else {
    return 'normal';
  }
}

export function getAlertColor(level: AlertLevel): string {
  switch (level) {
    case 'critical':
      return 'red';
    case 'warning':
      return 'orange';
    case 'normal':
    default:
      return 'green';
  }
}
