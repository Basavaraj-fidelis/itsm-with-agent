
export interface SystemConfig {
  alerts: {
    thresholds: {
      cpu: {
        warning: number;
        high: number;
        critical: number;
      };
      memory: {
        warning: number;
        high: number;
        critical: number;
      };
      disk: {
        warning: number;
        high: number;
        critical: number;
      };
      network: {
        errorRate: number;
        responseTime: number;
      };
    };
    retryAttempts: number;
    timeoutMs: number;
  };
  network: {
    scan: {
      timeoutMs: number;
      retryAttempts: number;
      pingTimeout: number;
      portScanTimeout: number;
    };
    agents: {
      heartbeatInterval: number;
      offlineThreshold: number;
    };
  };
  tickets: {
    sla: {
      defaultResponseTime: number;
      defaultResolutionTime: number;
      escalationTime: number;
    };
    priority: {
      low: { responseTime: number; resolutionTime: number };
      medium: { responseTime: number; resolutionTime: number };
      high: { responseTime: number; resolutionTime: number };
      critical: { responseTime: number; resolutionTime: number };
    };
  };
  performance: {
    monitoring: {
      intervalMs: number;
      retentionDays: number;
      batchSize: number;
    };
  };
  security: {
    session: {
      timeoutMinutes: number;
      refreshThreshold: number;
    };
    passwordPolicy: {
      minLength: number;
      requireSpecialChars: boolean;
      requireNumbers: boolean;
    };
  };
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  alerts: {
    thresholds: {
      cpu: {
        warning: 80,
        high: 90,
        critical: 95
      },
      memory: {
        warning: 85,
        high: 92,
        critical: 98
      },
      disk: {
        warning: 80,
        high: 90,
        critical: 95
      },
      network: {
        errorRate: 5,
        responseTime: 1000
      }
    },
    retryAttempts: 3,
    timeoutMs: 30000
  },
  network: {
    scan: {
      timeoutMs: 120000,
      retryAttempts: 2,
      pingTimeout: 2000,
      portScanTimeout: 5000
    },
    agents: {
      heartbeatInterval: 30000,
      offlineThreshold: 90000
    }
  },
  tickets: {
    sla: {
      defaultResponseTime: 4 * 60 * 60 * 1000, // 4 hours
      defaultResolutionTime: 24 * 60 * 60 * 1000, // 24 hours
      escalationTime: 2 * 60 * 60 * 1000 // 2 hours
    },
    priority: {
      low: { 
        responseTime: 8 * 60 * 60 * 1000, // 8 hours
        resolutionTime: 72 * 60 * 60 * 1000 // 72 hours
      },
      medium: { 
        responseTime: 4 * 60 * 60 * 1000, // 4 hours
        resolutionTime: 24 * 60 * 60 * 1000 // 24 hours
      },
      high: { 
        responseTime: 2 * 60 * 60 * 1000, // 2 hours
        resolutionTime: 8 * 60 * 60 * 1000 // 8 hours
      },
      critical: { 
        responseTime: 30 * 60 * 1000, // 30 minutes
        resolutionTime: 4 * 60 * 60 * 1000 // 4 hours
      }
    }
  },
  performance: {
    monitoring: {
      intervalMs: 30000,
      retentionDays: 30,
      batchSize: 100
    }
  },
  security: {
    session: {
      timeoutMinutes: 60,
      refreshThreshold: 10
    },
    passwordPolicy: {
      minLength: 8,
      requireSpecialChars: true,
      requireNumbers: true
    }
  }
};

// Configuration service to manage runtime config
class SystemConfigService {
  private config: SystemConfig = DEFAULT_SYSTEM_CONFIG;

  getConfig(): SystemConfig {
    return this.config;
  }

  updateConfig(updates: Partial<SystemConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getAlertThresholds() {
    return this.config.alerts.thresholds;
  }

  getNetworkConfig() {
    return this.config.network;
  }

  getTicketConfig() {
    return this.config.tickets;
  }

  getPerformanceConfig() {
    return this.config.performance;
  }

  getSecurityConfig() {
    return this.config.security;
  }
}

export const systemConfig = new SystemConfigService();
