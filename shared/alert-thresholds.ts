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

// Default export for compatibility
export default ALERT_THRESHOLDS;