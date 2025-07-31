
export const ALERT_THRESHOLDS = {
  cpu: {
    INFO: 80,
    WARNING: 85,
    HIGH: 88,
    CRITICAL: 92,
  },
  memory: {
    INFO: 80,
    WARNING: 85,
    HIGH: 88,
    CRITICAL: 92,
  },
  disk: {
    INFO: 80,
    WARNING: 85,
    HIGH: 88,
    CRITICAL: 92,
  },
  network: {
    INFO: 80,
    WARNING: 85,
    HIGH: 88,
    CRITICAL: 92,
  },
  temperature: {
    INFO: 80,
    WARNING: 85,
    HIGH: 88,
    CRITICAL: 92,
  },
} as const;

export type AlertLevel = 'info' | 'warning' | 'high' | 'critical';

export function getAlertLevel(value: number, type: keyof typeof ALERT_THRESHOLDS): AlertLevel {
  const thresholds = ALERT_THRESHOLDS[type];
  
  if (!thresholds) {
    console.warn(`Unknown alert threshold type: ${type}`);
    return 'info';
  }
  
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
