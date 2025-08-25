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

// System configuration manager with validation and update capabilities
export class SystemConfigManager {
  private static instance: SystemConfigManager;
  private config: SystemConfig = DEFAULT_SYSTEM_CONFIG;
  private configValidationRules = {
    'alerts.thresholds.cpu.warning': { min: 50, max: 95 },
    'alerts.thresholds.cpu.high': { min: 60, max: 98 },
    'alerts.thresholds.cpu.critical': { min: 70, max: 100 },
    'alerts.thresholds.memory.warning': { min: 60, max: 95 },
    'alerts.thresholds.memory.high': { min: 70, max: 98 },
    'alerts.thresholds.memory.critical': { min: 80, max: 100 },
    'alerts.thresholds.disk.warning': { min: 70, max: 95 },
    'alerts.thresholds.disk.high': { min: 80, max: 98 },
    'alerts.thresholds.disk.critical': { min: 85, max: 100 }
  };

  // Private constructor to enforce singleton pattern
  private constructor() {}

  // Method to get the singleton instance
  public static getInstance(): SystemConfigManager {
    if (!SystemConfigManager.instance) {
      SystemConfigManager.instance = new SystemConfigManager();
    }
    return SystemConfigManager.instance;
  }

  // Method to get the current system configuration
  getConfig(): SystemConfig {
    return this.config;
  }

  // Method to update the system configuration with validation
  updateConfig(newConfig: Partial<SystemConfig>): { success: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Validate configuration changes
      const validationErrors = this.validateConfiguration(newConfig);
      if (validationErrors.length > 0) {
        return { success: false, errors: validationErrors };
      }

      this.config = { ...this.config, ...newConfig };
      console.log('System configuration updated successfully:', newConfig);
      return { success: true, errors: [] };

    } catch (error) {
      console.error('Configuration update error:', error);
      return { success: false, errors: [`Configuration update failed: ${error.message}`] };
    }
  }

  // Private method to validate configuration against predefined rules
  private validateConfiguration(config: Partial<SystemConfig>): string[] {
    const errors: string[] = [];

    // Validate threshold hierarchies
    if (config.alerts?.thresholds) {
      const { cpu, memory, disk } = config.alerts.thresholds;

      if (cpu) {
        if (cpu.warning >= cpu.high) errors.push('CPU warning threshold must be less than high threshold');
        if (cpu.high >= cpu.critical) errors.push('CPU high threshold must be less than critical threshold');
        if (cpu.critical > 100) errors.push('CPU critical threshold cannot exceed 100%');
      }

      if (memory) {
        if (memory.warning >= memory.high) errors.push('Memory warning threshold must be less than high threshold');
        if (memory.high >= memory.critical) errors.push('Memory high threshold must be less than critical threshold');
        if (memory.critical > 100) errors.push('Memory critical threshold cannot exceed 100%');
      }

      if (disk) {
        if (disk.warning >= disk.high) errors.push('Disk warning threshold must be less than high threshold');
        if (disk.high >= disk.critical) errors.push('Disk high threshold must be less than critical threshold');
        if (disk.critical > 100) errors.push('Disk critical threshold cannot exceed 100%');
      }
    }

    return errors;
  }

  // Method to get alert thresholds
  getAlertThresholds(): SystemConfig['alerts']['thresholds'] {
    return this.config.alerts.thresholds;
  }

  // Method to get network configuration
  getNetworkConfig(): SystemConfig['network'] {
    return this.config.network;
  }

  // Method to get ticket configuration
  getTicketConfig(): SystemConfig['tickets'] {
    return this.config.tickets;
  }

  // Method to get performance configuration
  getPerformanceConfig(): SystemConfig['performance'] {
    return this.config.performance;
  }

  // Method to get security configuration
  getSecurityConfig(): SystemConfig['security'] {
    return this.config.security;
  }
}

// Singleton instance of the SystemConfigManager
export const systemConfigManager = SystemConfigManager.getInstance();